import { onRequest } from 'firebase-functions/v2/https';
import express from 'express';
import dotenv from 'dotenv';
import { getWhatsAppService } from './src/services/whatsappService';
import path from 'path';

// Resolve environment configuration
dotenv.config();

const app = express();
app.use(express.json());

// ==========================================
// CLOUD FUNCTIONS & WHATSAPP ENDPOINTS
// ==========================================

app.post('/api/functions/send-welcome', async (req, res) => {
  const { recipientPhone, name, campaignName, campaignId } = req.body;

  if (!recipientPhone || !name || !campaignName) {
    return res.status(400).json({ 
      error: 'Missing required parameters: recipientPhone, name, campaignName' 
    });
  }

  try {
    const waService = getWhatsAppService();
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const campaignUrl = `${appUrl}/c/${campaignId || ''}`;
    const templateName = process.env.WHATSAPP_WELCOME_TEMPLATE_ID || 'welcome_confirmation_v1';
    
    let deliveryResult;
    try {
      deliveryResult = await waService.sendTemplateMessage(recipientPhone, templateName, [
        name,
        campaignName,
        campaignUrl
      ]);
      console.log(`[Cloud Function: SendWelcome] Template triggered for ${recipientPhone}`);
    } catch (templateError: any) {
      console.warn('[Cloud Function: SendWelcome] Template send failed, falling back to text compilation:', templateError.message);
      const textFallback = `Hi ${name}! 🎉 Welcome to the "${campaignName}" Prediction Arena. Cast and save your guesses now to log points: ${campaignUrl}`;
      deliveryResult = await waService.sendTextMessage(recipientPhone, textFallback);
    }

    return res.json({ success: true, message: 'Welcome receipt transmitted', data: deliveryResult });
  } catch (error: any) {
    console.error('[Cloud Function: SendWelcome] Internal System Error:', error);
    return res.status(500).json({ error: error.message || 'Failed transmitting registration confirmation' });
  }
});

app.post('/api/functions/send-reminder', async (req, res) => {
  const { recipientPhone, name, eventLabel, closesInHours, campaignId } = req.body;

  if (!recipientPhone || !name || !eventLabel) {
    return res.status(400).json({ error: 'Missing required parameters: recipientPhone, name, eventLabel' });
  }

  try {
    const waService = getWhatsAppService();
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const campaignUrl = `${appUrl}/c/${campaignId || ''}`;
    const templateName = process.env.WHATSAPP_REMINDER_TEMPLATE_ID || 'event_cutoff_reminder_v1';
    const hoursStr = closesInHours !== undefined ? String(closesInHours) : '24';

    let deliveryResult;
    try {
      deliveryResult = await waService.sendTemplateMessage(recipientPhone, templateName, [
        name, eventLabel, hoursStr, campaignUrl
      ]);
    } catch (templateError: any) {
      const textFallback = `Hey ${name}! ⏰ Time is running out! The prediction event "${eventLabel}" closes in ${hoursStr} hours. Submit your forecast before lock time: ${campaignUrl}`;
      deliveryResult = await waService.sendTextMessage(recipientPhone, textFallback);
    }

    return res.json({ success: true, message: 'Urgent event cutoff reminder sent', data: deliveryResult });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Notification reminder dispatch failed' });
  }
});

app.post('/api/functions/score-event', async (req, res) => {
  const { clientId, campaignId, eventId, correctAnswer } = req.body;

  if (!clientId || !campaignId || !eventId) {
    return res.status(400).json({ error: 'Missing parameter: clientId, campaignId, eventId' });
  }

  try {
    const fs = await import('fs');
    const { initializeApp } = await import('firebase/app');
    const { getFirestore, doc, getDoc, getDocs, updateDoc, collection, query, where } = await import('firebase/firestore');

    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      throw new Error('firebase-applet-config.json configuration not found on server.');
    }
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    const appName = `server-scoring-app-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const fbApp = initializeApp(firebaseConfig, appName);
    const serverDb = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId);

    const campaignRef = doc(serverDb, `clients/${clientId}/campaigns/${campaignId}`);
    const campaignSnap = await getDoc(campaignRef);
    if (!campaignSnap.exists()) return res.status(404).json({ error: 'Campaign details not found' });
    
    const scoringRules = campaignSnap.data()?.config?.scoringRules || { correctPredictionPoints: 10, participationPoints: 2, bonusPoints: 0 };
    const eventRef = doc(serverDb, `clients/${clientId}/campaigns/${campaignId}/events/${eventId}`);
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) return res.status(404).json({ error: 'Target event not found' });

    const currentCorrectAnswer = correctAnswer !== undefined ? correctAnswer : eventSnap.data()?.correctAnswer;
    if (correctAnswer !== undefined) {
      await updateDoc(eventRef, { correctAnswer, updatedAt: new Date().toISOString() });
    }

    if (!currentCorrectAnswer) return res.json({ success: true, message: 'Event correct answer is blank; scoring skipped.' });

    const participantsPath = `clients/${clientId}/campaigns/${campaignId}/participants`;
    const participantsSnap = await getDocs(collection(serverDb, participantsPath));
    const participants = participantsSnap.docs.map(d => ({ ...d.data(), id: d.id }));

    let responseCount = 0;
    let updatedParticipantCount = 0;

    for (const participant of participants) {
      const pResponsesPath = `clients/${clientId}/campaigns/${campaignId}/participants/${participant.id}/responses`;
      const rSnap = await getDocs(query(collection(serverDb, pResponsesPath), where('eventId', '==', eventId)));
      
      for (const docSnap of rSnap.docs) {
        const isCorrect = docSnap.data().answer === currentCorrectAnswer;
        const pointsAllocated = isCorrect ? Number(scoringRules.correctPredictionPoints || 10) : Number(scoringRules.participationPoints || 0);
        await updateDoc(docSnap.ref, { pointsAwarded: pointsAllocated, updatedAt: new Date().toISOString() });
        responseCount++;
      }

      const allRSnap = await getDocs(collection(serverDb, pResponsesPath));
      let sumTotalPoints = 0;
      for (const rDoc of allRSnap.docs) sumTotalPoints += (rDoc.data()?.pointsAwarded || 0);

      await updateDoc(doc(serverDb, `${participantsPath}/${participant.id}`), { totalPoints: sumTotalPoints, updatedAt: new Date().toISOString() });
      updatedParticipantCount++;
    }

    return res.json({ success: true, message: `Successfully computed scores`, summary: { responseCount, updatedParticipantCount } });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Scoring engine failure' });
  }
});

app.post('/api/functions/send-coupon', async (req, res) => {
  const { recipientPhone, name, couponCode, giftDescription, campaignId } = req.body;

  if (!recipientPhone || !name || !couponCode || !giftDescription) {
    return res.status(400).json({ 
      error: 'Missing required parameters: recipientPhone, name, couponCode, giftDescription' 
    });
  }

  try {
    const waService = getWhatsAppService();
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const campaignUrl = `${appUrl}/c/${campaignId || ''}`;

    const templateName = process.env.WHATSAPP_COUPON_TEMPLATE_ID || 'reward_coupon_v1';
    
    let deliveryResult;
    try {
      deliveryResult = await waService.sendTemplateMessage(recipientPhone, templateName, [
        name, giftDescription, couponCode, campaignUrl
      ]);
    } catch (e: any) {
      const fallbackText = `Congratulations ${name}! 🎁 You won: ${giftDescription}! Claim it using your exclusive code: ${couponCode}. Check status or play more here: ${campaignUrl}`;
      deliveryResult = await waService.sendTextMessage(recipientPhone, fallbackText);
    }

    return res.json({ success: true, message: 'Coupon reward dispatched successfully', data: deliveryResult });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed sending coupon message' });
  }
});

app.get('/api/whatsapp/webhook', (req, res) => {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'studio-webhook-token-supersecure-123';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/api/whatsapp/webhook', (req, res) => {
  const payload = req.body;
  const statuses = payload?.entry?.[0]?.changes?.[0]?.value?.statuses;
  
  if (statuses && Array.isArray(statuses)) {
    for (const status of statuses) {
      console.log(`[Meta Status] Message: ${status.id} | To: ${status.recipient_id} | Status: ${status.status}`);
    }
  }

  if (payload?.type === 'delivered' || payload?.type === 'sent' || payload?.type === 'read') {
    console.log(`[Gupshup Status] Message: ${payload.externalId || payload.messageId} | Status: ${payload.type}`);
  }

  res.status(200).json({ received: true });
});

// ==========================================
// EXPORT FOR FIREBASE CLOUD FUNCTIONS
// ==========================================
// We wrap our entire Express 'app' into a Firebase v2 HTTP function.
export const api = onRequest(app);