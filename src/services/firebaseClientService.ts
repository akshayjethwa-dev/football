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
import { Client } from '../types';
import { 
  isSandboxActive, 
  getSandboxClients, 
  getSandboxClientById, 
  createSandboxClient, 
  updateSandboxClient, 
  deleteSandboxClient 
} from './sandboxService';

const CLIENTS_COLLECTION = 'clients';

// Helper function to dynamically strip out 'undefined' keys so Firestore doesn't crash
function removeUndefinedFields(obj: any) {
  const cleaned: any = {};
  Object.entries(obj).forEach(([key, val]) => {
    if (val !== undefined) {
      cleaned[key] = val;
    }
  });
  return cleaned;
}

export async function getClients(): Promise<Client[]> {
  if (isSandboxActive()) {
    return getSandboxClients();
  }
  try {
    const q = query(collection(db, CLIENTS_COLLECTION), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => ({
      ...docSnap.data() as Client,
      id: docSnap.id,
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, CLIENTS_COLLECTION);
    throw error;
  }
}

export async function getClientById(id: string): Promise<Client | null> {
  if (isSandboxActive()) {
    return getSandboxClientById(id);
  }
  const path = `${CLIENTS_COLLECTION}/${id}`;
  try {
    const docRef = doc(db, CLIENTS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return {
        ...docSnap.data() as Client,
        id: docSnap.id,
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    throw error;
  }
}

export async function createClient(clientData: Omit<Client, 'createdAt' | 'updatedAt'>): Promise<void> {
  if (isSandboxActive()) {
    const freshClient: Client = {
      ...clientData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    createSandboxClient(freshClient);
    return;
  }
  const path = `${CLIENTS_COLLECTION}/${clientData.id}`;
  try {
    const docRef = doc(db, CLIENTS_COLLECTION, clientData.id);
    
    // Clean payload of any undefined values
    const cleanedData = removeUndefinedFields(clientData);

    await setDoc(docRef, {
      ...cleanedData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function updateClient(id: string, clientUpdates: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  if (isSandboxActive()) {
    updateSandboxClient(id, clientUpdates);
    return;
  }
  const path = `${CLIENTS_COLLECTION}/${id}`;
  try {
    const docRef = doc(db, CLIENTS_COLLECTION, id);
    
    // Clean updates of any undefined values
    const cleanedUpdates = removeUndefinedFields(clientUpdates);

    await updateDoc(docRef, {
      ...cleanedUpdates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function deleteClient(id: string): Promise<void> {
  if (isSandboxActive()) {
    deleteSandboxClient(id);
    return;
  }
  const path = `${CLIENTS_COLLECTION}/${id}`;
  try {
    const docRef = doc(db, CLIENTS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}