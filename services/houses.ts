import {
  addDoc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { refs } from './refs';
import type { House, HouseRole, HouseUser, UserMembership } from './types';

export type HouseSummary = {
  id: string;
  name: string;
  ownerUid: string;
  code?: string;
};

const INVITE_ALPHANUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no special chars, avoid ambiguous I/O/1/0

export function generateHouseCode(length = 8) {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += INVITE_ALPHANUM[Math.floor(Math.random() * INVITE_ALPHANUM.length)];
  }
  return out;
}

async function reserveUniqueHouseCode() {
  // Try a few times. Collisions are extremely unlikely but we handle them.
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateHouseCode(8);
    const codeRef = refs.houseCode(code);
    const reserved = await runTransaction(codeRef.firestore, async (tx) => {
      const snap = await tx.get(codeRef);
      if (snap.exists()) return null;
      tx.set(codeRef, { reserved: true, createdAt: serverTimestamp() });
      return code;
    });
    if (reserved) return reserved;
  }
  throw new Error('Failed to reserve unique house code. Please retry.');
}

export async function createHouse(params: { name: string; ownerUid: string }) {
  const code = await reserveUniqueHouseCode();
  const houseData = {
    name: params.name.trim(),
    ownerUid: params.ownerUid,
    code,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } satisfies Omit<House, 'createdAt' | 'updatedAt'> & {
    createdAt: unknown;
    updatedAt: unknown;
  };

  const houseRef = await addDoc(refs.houses(), houseData);

  // Bind invite code -> houseId
  await setDoc(refs.houseCode(code), { houseId: houseRef.id, updatedAt: serverTimestamp() }, { merge: true });

  // Create membership/profile for the owner inside the house.
  const ownerHouseUser: Omit<HouseUser, 'createdAt' | 'updatedAt'> & {
    createdAt: unknown;
    updatedAt: unknown;
  } = {
    uid: params.ownerUid,
    displayName: 'Owner',
    role: 'owner',
    inHome: true,
    canControl: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ownerMembership: Omit<UserMembership, 'createdAt' | 'updatedAt'> & {
    createdAt: unknown;
    updatedAt: unknown;
  } = {
    houseId: houseRef.id,
    role: 'owner',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await Promise.all([
    setDoc(refs.houseUser(houseRef.id, params.ownerUid), ownerHouseUser),
    setDoc(refs.membership(params.ownerUid, houseRef.id), ownerMembership),
  ]);

  return { houseId: houseRef.id };
}

export async function getHouse(houseId: string): Promise<HouseSummary | null> {
  const snap = await getDoc(refs.house(houseId));
  if (!snap.exists()) return null;
  const data = snap.data() as House;
  return { id: snap.id, name: data.name, ownerUid: data.ownerUid, code: data.code };
}

/**
 * List houses for a user using the per-user membership index:
 * `users/{uid}/memberships/{houseId}`.
 */
export async function listHousesForUser(uid: string): Promise<HouseSummary[]> {
  const membershipsSnap = await getDocs(refs.memberships(uid));
  const houseIds = membershipsSnap.docs.map((d) => d.id);

  const houses = await Promise.all(houseIds.map((houseId) => getHouse(houseId)));
  return houses.filter((h): h is HouseSummary => Boolean(h));
}

export async function setUserRole(params: {
  houseId: string;
  uid: string;
  role: HouseRole;
}) {
  const membershipRef = refs.membership(params.uid, params.houseId);
  const houseUserRef = refs.houseUser(params.houseId, params.uid);
  const roleUpdate = { role: params.role, updatedAt: serverTimestamp() };

  await Promise.all([setDoc(membershipRef, roleUpdate, { merge: true }), setDoc(houseUserRef, roleUpdate, { merge: true })]);
}

export async function getHouseIdByCode(codeRaw: string) {
  const code = codeRaw.trim().toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(code)) return null;
  const snap = await getDoc(refs.houseCode(code));
  if (!snap.exists()) return null;
  return (snap.data() as { houseId?: string }).houseId ?? null;
}

