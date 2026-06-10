import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { getWhatsAppService } from './src/services/whatsappService';

// Resolve environment configuration
dotenv.config();

async function startServer() {
  const app = express();
  app.use(express.json());
  
  const PORT = 3000;

  // ==========================================
  // CLOUD FUNCTIONS & WHATSAPP ENDPOINTS
  // ==========================================

  /**
   * 1. Simulated Cloud Function: Send welcome confirmation upon participant registration.
   * Keeps credentials secure on the backend, away from user-facing client code.
   */
  app.post('/api/functions/send-welcome', async (req, res) => {
    const { recipientPhone, name, campaignName, campaignId } = req.body;

    if (!recipientPhone || !name || !campaignName) {
      return res.status(400).json({ 
        error: 'Missing required parameters: recipientPhone, name, campaignName' 
      });
    }

    try {
      const waService = getWhatsAppService();
      
      // Generate clean links to direct fans to their dashboard
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const campaignUrl = `${appUrl}/c/${campaignId || ''}`;

      // Configurable default templates
      const templateName = process.env.WHATSAPP_WELCOME_TEMPLATE_ID || 'welcome_confirmation_v1';
      
      let deliveryResult;
      try {
        // Core structure: sends registered name, campaign label, and dashboard hyperlink
        deliveryResult = await waService.sendTemplateMessage(recipientPhone, templateName, [
          name,
          campaignName,
          campaignUrl
        ]);
        console.log(`[Cloud Function: SendWelcome] Template triggered for ${recipientPhone}`);
      } catch (templateError: any) {
        console.warn('[Cloud Function: SendWelcome] Template send failed, falling back to text compilation:', templateError.message);
        
        // Dynamic text fallback when working with sandbox environment / unapproved business templates
        const textFallback = `Hi ${name}! 🎉 Welcome to the "${campaignName}" Prediction Arena. Cast and save your guesses now to log points: ${campaignUrl}`;
        deliveryResult = await waService.sendTextMessage(recipientPhone, textFallback);
      }

      return res.json({
        success: true,
        message: 'Welcome receipt transmitted',
        data: deliveryResult
      });
    } catch (error: any) {
      console.error('[Cloud Function: SendWelcome] Internal System Error:', error);
      return res.status(500).json({ 
        error: error.message || 'Failed transmitting registration confirmation' 
      });
    }
  });

  /**
   * 2. Simulated Cloud Function: Send prediction event reminders prior to dynamic lock windows.
   */
  app.post('/api/functions/send-reminder', async (req, res) => {
    const { recipientPhone, name, eventLabel, closesInHours, campaignId } = req.body;

    if (!recipientPhone || !name || !eventLabel) {
      return res.status(400).json({ 
        error: 'Missing required parameters: recipientPhone, name, eventLabel' 
      });
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
          name,
          eventLabel,
          hoursStr,
          campaignUrl
        ]);
        console.log(`[Cloud Function: SendReminder] Template trigger requested for ${recipientPhone}`);
      } catch (templateError: any) {
        console.warn('[Cloud Function: SendReminder] Template failed, compiling standard fallback:', templateError.message);
        
        const textFallback = `Hey ${name}! ⏰ Time is running out! The prediction event "${eventLabel}" closes in ${hoursStr} hours. Submit your forecast before lock time: ${campaignUrl}`;
        deliveryResult = await waService.sendTextMessage(recipientPhone, textFallback);
      }

      return res.json({
        success: true,
        message: 'Urgent event cutoff reminder sent',
        data: deliveryResult
      });
    } catch (error: any) {
      console.error('[Cloud Function: SendReminder] Internal Error:', error);
      return res.status(500).json({ 
        error: error.message || 'Notification reminder dispatch failed' 
      });
    }
  });

  /**
   * Simulated Cloud Function (HTTPS Route): Score event and update leaderboard points.
   * Compares all responses to correct answer, distributes points based on scoringRules,
   * and updates total points for all campaign participants.
   */
  app.post('/api/functions/score-event', async (req, res) => {
    const { clientId, campaignId, eventId, correctAnswer } = req.body;

    if (!clientId || !campaignId || !eventId) {
      return res.status(400).json({ error: 'Missing parameter: clientId, campaignId, eventId' });
    }

    try {
      const fs = await import('fs');
      const { initializeApp } = await import('firebase/app');
      const { getFirestore, doc, getDoc, getDocs, updateDoc, collection, query, where } = await import('firebase/firestore');

      // 1. Initialize Firebase Client SDK in server-side context using local app config
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (!fs.existsSync(configPath)) {
        throw new Error('firebase-applet-config.json configuration not found on server.');
      }
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // Initialize a unique server app
      const appName = `server-scoring-app-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const fbApp = initializeApp(firebaseConfig, appName);
      const serverDb = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId);

      // 2. Fetch campaign and scoring rule config
      const campaignRef = doc(serverDb, `clients/${clientId}/campaigns/${campaignId}`);
      const campaignSnap = await getDoc(campaignRef);
      if (!campaignSnap.exists()) {
        return res.status(404).json({ error: 'Campaign details not found' });
      }
      const campaignData = campaignSnap.data();
      const scoringRules = campaignData?.config?.scoringRules || {
        correctPredictionPoints: 10,
        participationPoints: 2,
        bonusPoints: 0
      };

      // 3. Fetch Event
      const eventRef = doc(serverDb, `clients/${clientId}/campaigns/${campaignId}/events/${eventId}`);
      const eventSnap = await getDoc(eventRef);
      if (!eventSnap.exists()) {
        return res.status(404).json({ error: 'Target event not found' });
      }

      // If correct answer was passed, update it in event record directly
      const currentCorrectAnswer = correctAnswer !== undefined ? correctAnswer : eventSnap.data()?.correctAnswer;
      if (correctAnswer !== undefined) {
        await updateDoc(eventRef, { correctAnswer, updatedAt: new Date().toISOString() });
      }

      if (!currentCorrectAnswer) {
        return res.json({ success: true, message: 'Event correct answer is blank; scoring skipped.' });
      }

      // 4. Fetch all participants of this campaign
      const participantsPath = `clients/${clientId}/campaigns/${campaignId}/participants`;
      const participantsSnap = await getDocs(collection(serverDb, participantsPath));
      const participants = participantsSnap.docs.map(d => ({ ...d.data(), id: d.id }));

      let responseCount = 0;
      let updatedParticipantCount = 0;

      // 5. Query and score all responses for each participant
      for (const participant of participants) {
        const pResponsesPath = `clients/${clientId}/campaigns/${campaignId}/participants/${participant.id}/responses`;
        const rSnap = await getDocs(query(collection(serverDb, pResponsesPath), where('eventId', '==', eventId)));
        
        for (const docSnap of rSnap.docs) {
          const rData = docSnap.data();
          const isCorrect = rData.answer === currentCorrectAnswer;
          const pointsAllocated = isCorrect 
            ? Number(scoringRules.correctPredictionPoints || 10) 
            : Number(scoringRules.participationPoints || 0);

          await updateDoc(docSnap.ref, {
            pointsAwarded: pointsAllocated,
            updatedAt: new Date().toISOString()
          });

          responseCount++;
        }

        // Recompute participant.totalPoints = sum of ALL their response.pointsAwarded for that campaign
        const allRSnap = await getDocs(collection(serverDb, pResponsesPath));
        let sumTotalPoints = 0;
        for (const rDoc of allRSnap.docs) {
          sumTotalPoints += (rDoc.data()?.pointsAwarded || 0);
        }

        const participantRef = doc(serverDb, `${participantsPath}/${participant.id}`);
        await updateDoc(participantRef, {
          totalPoints: sumTotalPoints,
          updatedAt: new Date().toISOString()
        });
        updatedParticipantCount++;
      }

      return res.json({
        success: true,
        message: `Successfully computed scores for event "${eventId}"`,
        summary: {
          scouredResponses: responseCount,
          updatedParticipants: updatedParticipantCount,
          correctAnswer: currentCorrectAnswer
        }
      });
    } catch (e: any) {
      console.error('[Score Cloud Function Error]', e);
      return res.status(500).json({ error: e.message || 'Scoring engine failure' });
    }
  });

  /**
   * Simulated Cloud Function: Send coupon assignment message using WhatsAppService.
   */
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
          name,
          giftDescription,
          couponCode,
          campaignUrl
        ]);
        console.log(`[Cloud Function: SendCoupon] Coupon template transmitted for ${recipientPhone}`);
      } catch (e: any) {
        console.warn('[Cloud Function: SendCoupon] Template failed, sending text fallback:', e.message);
        
        const fallbackText = `Congratulations ${name}! 🎁 You won: ${giftDescription}! Claim it using your exclusive code: ${couponCode}. Check status or play more here: ${campaignUrl}`;
        deliveryResult = await waService.sendTextMessage(recipientPhone, fallbackText);
      }

      return res.json({
        success: true,
        message: 'Coupon reward dispatched successfully',
        data: deliveryResult
      });
    } catch (error: any) {
      console.error('[Cloud Function: SendCoupon] Internal error:', error);
      return res.status(500).json({ error: error.message || 'Failed sending coupon message' });
    }
  });

  /**
   * 3. WhatsApp Business Platform Webhook Authentication (GET)
   * Essential for verifying secure channels in Facebook Business Manager callback setup.
   */
  app.get('/api/whatsapp/webhook', (req, res) => {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'studio-webhook-token-supersecure-123';
    
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('[WhatsApp Webhook] Channel verification handshake completed!');
      return res.status(200).send(challenge);
    } else {
      console.warn('[WhatsApp Webhook] Invalid verify token received on hook challenge.');
      return res.sendStatus(403);
    }
  });

  /**
   * 4. Simulated Webhook Receiver (POST) to map status logs (sent, delivered, read, dynamic failures).
   */
  app.post('/api/whatsapp/webhook', (req, res) => {
    const payload = req.body;
    console.log('[WhatsApp Webhook POST] Webhook payload payload parsed:', JSON.stringify(payload, null, 2));

    // Handle Meta status updates
    const statuses = payload?.entry?.[0]?.changes?.[0]?.value?.statuses;
    if (statuses && Array.isArray(statuses)) {
      for (const status of statuses) {
        const messageId = status.id;
        const recipientPhone = status.recipient_id;
        const deliveryStatus = status.status; // sent, delivered, read, failed
        const timestamp = status.timestamp;

        console.log(`[Meta State Changed] Message: ${messageId} | To: ${recipientPhone} | Status: ${deliveryStatus} | Epoch: ${timestamp}`);
      }
    }

    // Handle Gupshup callback formats
    if (payload?.type === 'delivered' || payload?.type === 'sent' || payload?.type === 'read') {
      const messageId = payload.externalId || payload.messageId;
      console.log(`[Gupshup State Changed] Message: ${messageId} | Status: ${payload.type}`);
    }

    return res.status(200).json({ received: true });
  });

  // ==========================================
  // SERVER STATIC AND DEV WORKSPACE ASSETS
  // ==========================================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite development middleware injection loaded.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production static distribution files active.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Full-Stack Server Ready] Serving at http://0.0.0.0:${PORT}`);
  });
}

startServer();
