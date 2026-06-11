import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query,
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebaseConfig';
import { Campaign } from '../types';
import { 
  isSandboxActive, 
  getSandboxCampaigns, 
  getSandboxCampaignById, 
  createSandboxCampaign, 
  updateSandboxCampaign, 
  deleteSandboxCampaign 
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

export function getCampaignsCollectionPath(clientId: string): string {
  return `clients/${clientId}/campaigns`;
}

export async function getCampaigns(clientId: string): Promise<Campaign[]> {
  if (isSandboxActive()) {
    return getSandboxCampaigns(clientId);
  }
  const colPath = getCampaignsCollectionPath(clientId);
  try {
    const q = query(collection(db, colPath), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => ({
      ...docSnap.data() as Campaign,
      id: docSnap.id,
      clientId, // ensure match
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colPath);
    throw error;
  }
}

export async function getCampaignById(clientId: string, campaignId: string): Promise<Campaign | null> {
  if (isSandboxActive()) {
    return getSandboxCampaignById(clientId, campaignId);
  }
  const docPath = `${getCampaignsCollectionPath(clientId)}/${campaignId}`;
  try {
    const docRef = doc(db, getCampaignsCollectionPath(clientId), campaignId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return {
        ...docSnap.data() as Campaign,
        id: docSnap.id,
        clientId,
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
    throw error;
  }
}

export async function createCampaign(clientId: string, campaignData: Omit<Campaign, 'createdAt' | 'updatedAt'>): Promise<void> {
  const timestamp = new Date().toISOString();
  
  if (isSandboxActive()) {
    const freshCampaign: Campaign = {
      ...campaignData,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    createSandboxCampaign(clientId, freshCampaign);
    return;
  }
  
  const docPath = `${getCampaignsCollectionPath(clientId)}/${campaignData.id}`;
  try {
    const docRef = doc(db, getCampaignsCollectionPath(clientId), campaignData.id);
    
    // Deeply clean the payload of any undefined values
    const cleanedData = removeUndefinedFields(campaignData);

    // Filter fields to strictly match what firestore.rules allows in `hasOnly`
    const allowedFields = [
      'id', 'clientId', 'name', 'description', 'eventType', 'gameType', 
      'startDate', 'endDate', 'status', 'config', 'metadata'
    ];
    
    const safeData: any = {};
    allowedFields.forEach(field => {
      if (cleanedData[field] !== undefined) {
        safeData[field] = cleanedData[field];
      }
    });

    await setDoc(docRef, {
      config: {}, // Fallback to ensure hasAll(['config']) passes
      status: 'draft', // Fallback to ensure hasAll(['status']) passes
      ...safeData,
      clientId, // keep consistency
      createdAt: timestamp, // Match the rules supporting ISO strings
      updatedAt: timestamp,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
    throw error;
  }
}

export async function updateCampaign(
  clientId: string, 
  campaignId: string, 
  campaignUpdates: Partial<Omit<Campaign, 'id' | 'clientId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const timestamp = new Date().toISOString();
  
  if (isSandboxActive()) {
    updateSandboxCampaign(clientId, campaignId, campaignUpdates);
    return;
  }
  
  const docPath = `${getCampaignsCollectionPath(clientId)}/${campaignId}`;
  try {
    const docRef = doc(db, getCampaignsCollectionPath(clientId), campaignId);
    
    // Deeply clean the updates payload of any undefined values
    const cleanedUpdates = removeUndefinedFields(campaignUpdates);

    // Filter fields to strictly match what firestore.rules allows
    const allowedFields = [
      'name', 'description', 'eventType', 'gameType', 
      'startDate', 'endDate', 'status', 'config', 'metadata'
    ];

    const safeUpdates: any = {};
    allowedFields.forEach(field => {
      if (cleanedUpdates[field] !== undefined) {
        safeUpdates[field] = cleanedUpdates[field];
      }
    });

    await updateDoc(docRef, {
      ...safeUpdates,
      updatedAt: timestamp,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
    throw error;
  }
}

export async function deleteCampaign(clientId: string, campaignId: string): Promise<void> {
  if (isSandboxActive()) {
    deleteSandboxCampaign(clientId, campaignId);
    return;
  }
  const docPath = `${getCampaignsCollectionPath(clientId)}/${campaignId}`;
  try {
    const docRef = doc(db, getCampaignsCollectionPath(clientId), campaignId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
    throw error;
  }
}