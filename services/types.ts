import type { Timestamp } from 'firebase/firestore';

export type HouseRole = 'owner' | 'admin' | 'member';

export type TaskFrequency = 'daily' | 'weekly' | 'monthly' | 'custom';

export type TaskStatus = 'pending' | 'inProgress' | 'completed' | 'verified';

export type PeriodType = 'week' | 'day';

export type Id = string;

export interface House {
  name: string;
  ownerUid: Id;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Global user profile (account-level, not house-specific)
export interface AppUser {
  uid: Id;
  email: string | null;
  displayName: string;
  photoURL?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Membership index for fast "which houses does this user belong to?"
export interface UserMembership {
  houseId: Id;
  role: HouseRole;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Membership/profile of a user within a given house
export interface HouseUser {
  uid: Id;
  displayName: string;
  role: HouseRole;
  inHome: boolean;
  canControl: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Sector {
  name: string;
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Task {
  name: string;
  sectorId: Id;
  frequency: TaskFrequency;
  defaultAssigned: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AssignmentTaskSnapshot {
  taskId: Id;
  sectorId: Id;
  name: string;
}

export interface Assignment {
  userId: Id;
  periodType: PeriodType;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  tasks: AssignmentTaskSnapshot[];
  statusByTask: Record<Id, TaskStatus>;
  createdBy: Id;
  createdAt: Timestamp;
}

