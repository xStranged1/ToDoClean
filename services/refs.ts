import { collection, doc } from 'firebase/firestore';

import { db } from './firebase';

export const refs = {
  // Root collections
  users: () => collection(db, 'users'),
  user: (uid: string) => doc(db, 'users', uid),

  houses: () => collection(db, 'houses'),
  house: (houseId: string) => doc(db, 'houses', houseId),

  // House invite code index: `houseCodes/{code} -> { houseId }`
  houseCodes: () => collection(db, 'houseCodes'),
  houseCode: (code: string) => doc(db, 'houseCodes', code),

  // Per-user membership index
  memberships: (uid: string) => collection(db, 'users', uid, 'memberships'),
  membership: (uid: string, houseId: string) => doc(db, 'users', uid, 'memberships', houseId),

  // Per-house subcollections
  houseUsers: (houseId: string) => collection(db, 'houses', houseId, 'users'),
  houseUser: (houseId: string, uid: string) => doc(db, 'houses', houseId, 'users', uid),

  sectors: (houseId: string) => collection(db, 'houses', houseId, 'sectors'),
  sector: (houseId: string, sectorId: string) => doc(db, 'houses', houseId, 'sectors', sectorId),

  tasks: (houseId: string) => collection(db, 'houses', houseId, 'tasks'),
  task: (houseId: string, taskId: string) => doc(db, 'houses', houseId, 'tasks', taskId),

  assignments: (houseId: string) => collection(db, 'houses', houseId, 'assignments'),
  assignment: (houseId: string, assignmentId: string) =>
    doc(db, 'houses', houseId, 'assignments', assignmentId),
};

