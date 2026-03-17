import {
  addDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  orderBy,
  type Timestamp,
} from 'firebase/firestore';

import { refs } from './refs';
import type { Assignment, AssignmentTaskSnapshot, PeriodType, TaskStatus } from './types';

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 (Sun) ... 6 (Sat)
  const diffToMonday = (day + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diffToMonday);
  return d;
}

function endOfWeek(start: Date) {
  const d = new Date(start);
  d.setDate(d.getDate() + 7);
  return d;
}

export type WeekPeriod = {
  periodType: 'week';
  periodStart: Date;
  periodEnd: Date;
};

export function getCurrentWeekPeriod(now = new Date()): WeekPeriod {
  const s = startOfWeek(now);
  return { periodType: 'week', periodStart: s, periodEnd: endOfWeek(s) };
}

export async function assignTasksToUser(params: {
  houseId: string;
  userId: string;
  createdBy: string;
  period?: WeekPeriod;
  tasks: AssignmentTaskSnapshot[];
}) {
  const period = params.period ?? getCurrentWeekPeriod();

  const statusByTask: Record<string, TaskStatus> = {};
  for (const t of params.tasks) statusByTask[t.taskId] = 'pending';

  const data: Omit<Assignment, 'createdAt' | 'periodStart' | 'periodEnd'> & {
    createdAt: unknown;
    periodStart: unknown;
    periodEnd: unknown;
  } = {
    userId: params.userId,
    periodType: period.periodType,
    periodStart: period.periodStart as unknown,
    periodEnd: period.periodEnd as unknown,
    tasks: params.tasks,
    statusByTask,
    createdBy: params.createdBy,
    createdAt: serverTimestamp(),
  };

  // We store JS Date for periodStart/end; Firestore SDK will serialize it as Timestamp.
  const ref = await addDoc(refs.assignments(params.houseId), data as unknown as Assignment);
  return { assignmentId: ref.id };
}

export async function updateTaskStatus(params: {
  houseId: string;
  assignmentId: string;
  taskId: string;
  newStatus: TaskStatus;
}) {
  const patch = {
    [`statusByTask.${params.taskId}`]: params.newStatus,
    updatedAt: serverTimestamp(),
  };
  await setDoc(refs.assignment(params.houseId, params.assignmentId), patch, { merge: true });
}

export async function getAssignmentsForUser(params: {
  houseId: string;
  userId: string;
  periodType?: PeriodType;
}) {
  const q = query(
    refs.assignments(params.houseId),
    where('userId', '==', params.userId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Assignment) }));
  if (!params.periodType) return rows;
  return rows.filter((a) => a.periodType === params.periodType);
}

export async function getAssignmentsForHouse(params: { houseId: string; periodType?: PeriodType }) {
  const q = query(refs.assignments(params.houseId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Assignment) }));
  if (!params.periodType) return rows;
  return rows.filter((a) => a.periodType === params.periodType);
}

export async function getWeeklyHistory(params: { houseId: string; userId: string; limit?: number }) {
  const q = query(
    refs.assignments(params.houseId),
    where('userId', '==', params.userId),
    where('periodType', '==', 'week'),
    orderBy('periodStart', 'desc')
  );
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Assignment) }));
  return rows.slice(0, params.limit ?? 12);
}

