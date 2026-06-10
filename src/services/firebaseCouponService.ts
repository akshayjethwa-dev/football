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
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebaseConfig';
import { Coupon, CouponStatus } from '../types';
import { 
  isSandboxActive, 
  getSandboxCoupons, 
  createSandboxCoupons, 
  updateSandboxCoupon 
} from './sandboxService';

export function getCouponsCollectionPath(clientId: string, campaignId: string): string {
  return `clients/${clientId}/campaigns/${campaignId}/coupons`;
}

/**
 * Fetch all coupons for a specific campaign.
 */
export async function getCoupons(clientId: string, campaignId: string): Promise<Coupon[]> {
  if (isSandboxActive()) {
    return getSandboxCoupons(campaignId);
  }

  const colPath = getCouponsCollectionPath(clientId, campaignId);
  try {
    const q = query(collection(db, colPath), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => ({
      ...docSnap.data() as Coupon,
      id: docSnap.id,
      campaignId,
      clientId,
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colPath);
    throw error;
  }
}

/**
 * Generate N random coupon codes for a campaign.
 */
export async function generateCoupons(
  clientId: string,
  campaignId: string,
  count: number,
  description: string,
  validFrom?: string,
  validTo?: string
): Promise<Coupon[]> {
  const generated: Coupon[] = [];

  const prefix = description.trim().split(/\s+/)[0]?.substring(0, 4).toUpperCase() || 'OFFER';

  for (let i = 0; i < count; i++) {
    const uniqueId = `cp-${Date.now()}-${i}-${Math.floor(Math.random() * 10000)}`;
    const code = `${prefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const coupon: Coupon = {
      id: uniqueId,
      campaignId,
      clientId,
      code,
      participantId: null,
      status: 'unused',
      metadata: {
        description,
        validFrom: validFrom || new Date().toISOString().split('T')[0],
        validTo: validTo || new Date(Date.now() + 30 * 86400 * 1000).toISOString().split('T')[0],
      },
      createdAt: isSandboxActive() ? new Date().toISOString() : null, // Filled below
      updatedAt: isSandboxActive() ? new Date().toISOString() : null,
    };

    generated.push(coupon);
  }

  if (isSandboxActive()) {
    createSandboxCoupons(generated);
    return generated;
  }

  const colPath = getCouponsCollectionPath(clientId, campaignId);
  try {
    for (const coupon of generated) {
      const docRef = doc(db, colPath, coupon.id);
      await setDoc(docRef, {
        ...coupon,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    return generated;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, colPath);
    throw error;
  }
}

/**
 * Assign an unassigned coupon to a specific participant.
 */
export async function assignCoupon(
  clientId: string,
  campaignId: string,
  couponId: string,
  participantId: string
): Promise<void> {
  if (isSandboxActive()) {
    updateSandboxCoupon(campaignId, couponId, { participantId, updatedAt: new Date().toISOString() });
    return;
  }

  const colPath = getCouponsCollectionPath(clientId, campaignId);
  const docPath = `${colPath}/${couponId}`;
  try {
    const docRef = doc(db, colPath, couponId);
    await updateDoc(docRef, {
      participantId,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
    throw error;
  }
}

/**
 * Manually update coupon status ('unused' | 'used' | 'expired').
 */
export async function updateCouponStatus(
  clientId: string,
  campaignId: string,
  couponId: string,
  status: CouponStatus
): Promise<void> {
  if (isSandboxActive()) {
    updateSandboxCoupon(campaignId, couponId, { status, updatedAt: new Date().toISOString() });
    return;
  }

  const colPath = getCouponsCollectionPath(clientId, campaignId);
  const docPath = `${colPath}/${couponId}`;
  try {
    const docRef = doc(db, colPath, couponId);
    await updateDoc(docRef, {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
    throw error;
  }
}
