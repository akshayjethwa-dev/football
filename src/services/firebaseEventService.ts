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
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebaseConfig';
import { CampaignEvent } from '../types';
import { 
  isSandboxActive, 
  getSandboxEvents, 
  getSandboxEventById, 
  createSandboxEvent, 
  updateSandboxEvent, 
  deleteSandboxEvent 
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

export function getEventsCollectionPath(clientId: string, campaignId: string): string {
  return `clients/${clientId}/campaigns/${campaignId}/events`;
}

export async function getEvents(clientId: string, campaignId: string): Promise<CampaignEvent[]> {
  if (isSandboxActive()) {
    return getSandboxEvents(clientId, campaignId);
  }
  const colPath = getEventsCollectionPath(clientId, campaignId);
  try {
    const q = query(collection(db, colPath), orderBy('createdAt', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => ({
      ...docSnap.data() as CampaignEvent,
      id: docSnap.id,
      campaignId,
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colPath);
    throw error;
  }
}

export async function getEventById(clientId: string, campaignId: string, eventId: string): Promise<CampaignEvent | null> {
  if (isSandboxActive()) {
    return getSandboxEventById(clientId, campaignId, eventId);
  }
  const docPath = `${getEventsCollectionPath(clientId, campaignId)}/${eventId}`;
  try {
    const docRef = doc(db, getEventsCollectionPath(clientId, campaignId), eventId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return {
        ...docSnap.data() as CampaignEvent,
        id: docSnap.id,
        campaignId,
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
    throw error;
  }
}

export async function createEvent(
  clientId: string, 
  campaignId: string, 
  eventData: Omit<CampaignEvent, 'createdAt' | 'updatedAt'>
): Promise<void> {
  if (isSandboxActive()) {
    const freshEvent: CampaignEvent = {
      ...eventData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    createSandboxEvent(clientId, campaignId, freshEvent);
    return;
  }
  const docPath = `${getEventsCollectionPath(clientId, campaignId)}/${eventData.id}`;
  try {
    const docRef = doc(db, getEventsCollectionPath(clientId, campaignId), eventData.id);
    
    // Clean the payload to remove undefined fields like `scoringConfig`
    const cleanedData = removeUndefinedFields(eventData);

    await setDoc(docRef, {
      ...cleanedData,
      campaignId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
    throw error;
  }
}

export async function updateEvent(
  clientId: string,
  campaignId: string,
  eventId: string,
  eventUpdates: Partial<Omit<CampaignEvent, 'id' | 'campaignId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  if (isSandboxActive()) {
    updateSandboxEvent(clientId, campaignId, eventId, eventUpdates);
    return;
  }
  const docPath = `${getEventsCollectionPath(clientId, campaignId)}/${eventId}`;
  try {
    const docRef = doc(db, getEventsCollectionPath(clientId, campaignId), eventId);
    
    // Clean updates payload
    const cleanedUpdates = removeUndefinedFields(eventUpdates);

    await updateDoc(docRef, {
      ...cleanedUpdates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
    throw error;
  }
}

export async function deleteEvent(clientId: string, campaignId: string, eventId: string): Promise<void> {
  if (isSandboxActive()) {
    deleteSandboxEvent(clientId, campaignId, eventId);
    return;
  }
  const docPath = `${getEventsCollectionPath(clientId, campaignId)}/${eventId}`;
  try {
    const docRef = doc(db, getEventsCollectionPath(clientId, campaignId), eventId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
    throw error;
  }
}