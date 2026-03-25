import {
  createUserWithEmailAndPassword,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';

import { auth } from './firebase';
import { refs } from './refs';
import type { AppUser, HouseRole, HouseUser, UserMembership } from './types';
import { getHouseIdByCode } from './houses';

export async function createUserAccount(params: {
  email: string;
  password: string;
  displayName: string;
}) {
  const credential = await createUserWithEmailAndPassword(auth, params.email, params.password);
  const user = credential.user;

  const displayName = params.displayName.trim() || 'Usuario';
  await updateProfile(user, { displayName });

  await upsertGlobalUserProfile(user);

  return { uid: user.uid };
}

export async function upsertGlobalUserProfile(user: FirebaseUser) {
  const data: Omit<AppUser, 'createdAt' | 'updatedAt'> & { createdAt: unknown; updatedAt: unknown } =
  {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName ?? 'Usuario',
    photoURL: user.photoURL ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Create if missing; otherwise merge to preserve createdAt in future we can refine.
  await setDoc(refs.user(user.uid), data, { merge: true });
}

export async function getMyUserByUid(uid: string) {
  const snap = await getDoc(refs.user(uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as AppUser) };
}

/**
 * Add a user to a house (multi-casa). This writes BOTH:
 * - `houses/{houseId}/users/{uid}` (house-scoped profile)
 * - `users/{uid}/memberships/{houseId}` (fast index for "my houses")
 */
export async function addUserToHouse(params: {
  houseId: string;
  uid: string;
  displayName: string;
  role?: HouseRole;
}) {
  const role: HouseRole = params.role ?? 'member';

  const houseUser: Omit<HouseUser, 'createdAt' | 'updatedAt'> & { createdAt: unknown; updatedAt: unknown } =
  {
    uid: params.uid,
    displayName: params.displayName.trim() || 'Usuario',
    role,
    inHome: true,
    canControl: role !== 'member',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const membership: Omit<UserMembership, 'createdAt' | 'updatedAt'> & { createdAt: unknown; updatedAt: unknown } =
  {
    houseId: params.houseId,
    role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await Promise.all([
    setDoc(refs.houseUser(params.houseId, params.uid), houseUser, { merge: true }),
    setDoc(refs.membership(params.uid, params.houseId), membership, { merge: true }),
  ]);
}

export async function setUserInHome(params: { houseId: string; uid: string; inHome: boolean }) {
  await setDoc(
    refs.houseUser(params.houseId, params.uid),
    { inHome: params.inHome, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function listUsersForHouse(houseId: string) {
  const snap = await getDocs(refs.houseUsers(houseId));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as HouseUser) }));
}

export async function getHouseUser(houseId: string, uid: string) {
  const snap = await getDoc(refs.houseUser(houseId, uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as HouseUser) };
}

export async function joinHouseByCode(params: { code: string; uid: string; displayName: string }) {
  const houseId = await getHouseIdByCode(params.code);
  if (!houseId) throw new Error('Invalid house code');
  await addUserToHouse({ houseId, uid: params.uid, displayName: params.displayName, role: 'member' });
  return { houseId };
}
