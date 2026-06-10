import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  query,
  orderBy,
  collectionGroup,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebaseConfig';
import { Participant, CampaignResponse, Campaign, Client } from '../types';
import { 
  isSandboxActive, 
  getSandboxParticipants, 
  createSandboxParticipant, 
  updateSandboxParticipant, 
  deleteSandboxParticipant, 
  getSandboxParticipantById,
  getSandboxResponses,
  createSandboxResponse,
  getSandboxAllResponsesForCampaign
} from './sandboxService';

// Helper function to dynamically and deeply strip out 'undefined' keys so Firestore doesn't crash
function removeUndefinedFields(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedFields);
  } else if (obj !== null && typeof obj === 'object') {
    const cleaned: any = {};
    Object.entries(obj).forEach(([key, val]) => {
      if (val !== undefined) {
        cleaned[key] = removeUndefinedFields(val);
      }
    });
    return cleaned;
  }
  return obj;
}

export function getParticipantsCollectionPath(clientId: string, campaignId: string): string {
  return `clients/${clientId}/campaigns/${campaignId}/participants`;
}

export function getResponsesCollectionPath(clientId: string, campaignId: string, participantId: string): string {
  return `clients/${clientId}/campaigns/${campaignId}/participants/${participantId}/responses`;
}

// Fetch Campaign and Client context by public Campaign ID
export async function getCampaignByPublicId(campaignId: string): Promise<{ campaign: Campaign; client: Client } | null> {
  if (isSandboxActive()) {
    // Return first mock client + mock campaign from seed
    const { getSandboxClients, getSandboxCampaigns } = await import('./sandboxService');
    const campaigns = getSandboxCampaigns('ashrey-cafe');
    const camp = campaigns.find(c => c.id === campaignId) || campaigns[0];
    const clients = getSandboxClients();
    const cl = clients.find(c => c.id === camp.clientId) || clients[0];
    return { campaign: camp, client: cl };
  }

  try {
    const q = query(collectionGroup(db, 'campaigns'), where('id', '==', campaignId));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    const campaignDoc = querySnapshot.docs[0];
    const campaign = { ...campaignDoc.data() as Campaign, id: campaignDoc.id };

    // Now resolve its owning Client tenant
    const clientDocRef = doc(db, 'clients', campaign.clientId);
    const clientSnap = await getDoc(clientDocRef);
    if (!clientSnap.exists()) {
      throw new Error(`Owner client "${campaign.clientId}" not found for campaign.`);
    }
    const client = { ...clientSnap.data() as Client, id: clientSnap.id };

    return { campaign, client };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `campaignsGroup/whereId/${campaignId}`);
    throw error;
  }
}

export async function getParticipants(clientId: string, campaignId: string): Promise<Participant[]> {
  if (isSandboxActive()) {
    return getSandboxParticipants(campaignId);
  }
  const colPath = getParticipantsCollectionPath(clientId, campaignId);
  try {
    const q = query(collection(db, colPath), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => ({
      ...docSnap.data() as Participant,
      id: docSnap.id,
      campaignId,
      clientId,
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colPath);
    throw error;
  }
}

export async function getParticipantById(clientId: string, campaignId: string, participantId: string): Promise<Participant | null> {
  if (isSandboxActive()) {
    return getSandboxParticipantById(campaignId, participantId);
  }
  const colPath = getParticipantsCollectionPath(clientId, campaignId);
  try {
    const docRef = doc(db, colPath, participantId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return {
      ...docSnap.data() as Participant,
      id: docSnap.id,
      campaignId,
      clientId,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${colPath}/${participantId}`);
    throw error;
  }
}

export async function createParticipant(
  clientId: string, 
  campaignId: string, 
  participantData: Omit<Participant, 'createdAt' | 'updatedAt' | 'totalPoints'>
): Promise<void> {
  if (isSandboxActive()) {
    const fresh: Participant = {
      ...participantData,
      totalPoints: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    createSandboxParticipant(fresh);
    return;
  }

  const colPath = getParticipantsCollectionPath(clientId, campaignId);
  const docPath = `${colPath}/${participantData.id}`;
  try {
    const docRef = doc(db, colPath, participantData.id);
    
    // Clean payload of undefined values like email
    const cleanedData = removeUndefinedFields(participantData);

    await setDoc(docRef, {
      ...cleanedData,
      totalPoints: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
    throw error;
  }
}

export async function updateParticipant(
  clientId: string, 
  campaignId: string, 
  participantId: string, 
  updates: Partial<Omit<Participant, 'id' | 'campaignId' | 'clientId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  if (isSandboxActive()) {
    updateSandboxParticipant(campaignId, participantId, updates);
    return;
  }

  const colPath = getParticipantsCollectionPath(clientId, campaignId);
  const docPath = `${colPath}/${participantId}`;
  try {
    const docRef = doc(db, colPath, participantId);
    
    // Clean updates of undefined values
    const cleanedUpdates = removeUndefinedFields(updates);

    await updateDoc(docRef, {
      ...cleanedUpdates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
    throw error;
  }
}

export async function getResponses(clientId: string, campaignId: string, participantId: string): Promise<CampaignResponse[]> {
  if (isSandboxActive()) {
    return getSandboxResponses(campaignId, participantId);
  }
  const colPath = getResponsesCollectionPath(clientId, campaignId, participantId);
  try {
    const q = query(collection(db, colPath), orderBy('createdAt', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => ({
      ...docSnap.data() as CampaignResponse,
      id: docSnap.id,
      participantId,
      campaignId,
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colPath);
    throw error;
  }
}

export async function createResponse(
  clientId: string,
  campaignId: string,
  participantId: string,
  responseData: Omit<CampaignResponse, 'createdAt' | 'updatedAt' | 'pointsAwarded'>
): Promise<void> {
  if (isSandboxActive()) {
    const fresh: CampaignResponse = {
      ...responseData,
      pointsAwarded: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    createSandboxResponse(fresh);
    return;
  }

  const colPath = getResponsesCollectionPath(clientId, campaignId, participantId);
  const docPath = `${colPath}/${responseData.id}`;
  try {
    const docRef = doc(db, colPath, responseData.id);
    
    // Clean payload of undefined values
    const cleanedData = removeUndefinedFields(responseData);

    await setDoc(docRef, {
      ...cleanedData,
      pointsAwarded: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
    throw error;
  }
}

export async function getAllResponsesForCampaign(clientId: string, campaignId: string): Promise<CampaignResponse[]> {
  if (isSandboxActive()) {
    return getSandboxAllResponsesForCampaign(campaignId);
  }
  
  // To fetch all responses safely, query across the collectionGroup of responses filtering by campaignId
  try {
    const q = query(collectionGroup(db, 'responses'), where('campaignId', '==', campaignId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => ({
      ...docSnap.data() as CampaignResponse,
      id: docSnap.id,
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `collectionGroup/responses/campaignId/${campaignId}`);
    throw error;
  }
}