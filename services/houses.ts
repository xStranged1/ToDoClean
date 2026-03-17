import {
  addDoc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Timestamp,
} from 'firebase/firestore';

import { refs } from './refs';
import type { House, HouseRole, HouseUser, UserMembership } from './types';

export type HouseSummary = {
  id: string;
  name: string;
  ownerUid: string;
};

export async function createHouse(params: { name: string; ownerUid: string }) {
  const houseData = {
    name: params.name.trim(),
    ownerUid: params.ownerUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } satisfies Omit<House, 'createdAt' | 'updatedAt'> & {
    createdAt: unknown;
    updatedAt: unknown;
  };

  const houseRef = await addDoc(refs.houses(), houseData);

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
  return { id: snap.id, name: data.name, ownerUid: data.ownerUid };
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

