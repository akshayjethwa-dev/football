import { 
  signInWithEmailAndPassword, 
  signOut, 
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebaseConfig';
import { UserProfile, UserRole } from '../types';

const USERS_COLLECTION = 'users';

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function loginWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  return credential.user;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export async function registerWithEmail(email: string, password: string, role: UserRole = 'clientadmin', clientId: string | null = null): Promise<UserProfile> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  const profile: Omit<UserProfile, 'createdAt' | 'updatedAt'> = {
    id: user.uid,
    email,
    role,
    clientId
  };

  await createUserProfile(user.uid, profile);
  return {
    ...profile,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const path = `${USERS_COLLECTION}/${userId}`;
  try {
    const docRef = doc(db, USERS_COLLECTION, userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    throw error;
  }
}

export async function createUserProfile(userId: string, profile: Omit<UserProfile, 'createdAt' | 'updatedAt'>): Promise<void> {
  const path = `${USERS_COLLECTION}/${userId}`;
  try {
    const docRef = doc(db, USERS_COLLECTION, userId);
    await setDoc(docRef, {
      ...profile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}
