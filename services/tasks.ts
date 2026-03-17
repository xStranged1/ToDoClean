import {
  addDoc,
  deleteDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import { refs } from './refs';
import type { Task, TaskFrequency } from './types';

export async function createTask(params: {
  houseId: string;
  sectorId: string;
  name: string;
  description?: string;
  frequency?: TaskFrequency;
  defaultAssigned?: boolean;
}) {
  const data: Omit<Task, 'createdAt' | 'updatedAt'> & { createdAt: unknown; updatedAt: unknown } = {
    name: params.name.trim(),
    description: params.description?.trim() || "",
    sectorId: params.sectorId,
    frequency: params.frequency ?? 'weekly',
    defaultAssigned: params.defaultAssigned ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(refs.tasks(params.houseId), data);
  return { taskId: ref.id };
}

export async function updateTask(params: {
  houseId: string;
  taskId: string;
  name?: string;
  description?: string;
  sectorId?: string;
  frequency?: TaskFrequency;
  defaultAssigned?: boolean;
}) {
  const patch: Partial<Task> & { updatedAt: unknown } = {
    updatedAt: serverTimestamp(),
  };
  if (params.name != null) patch.name = params.name.trim();
  if (params.description != null) patch.description = params.description.trim() || undefined;
  if (params.sectorId != null) patch.sectorId = params.sectorId;
  if (params.frequency != null) patch.frequency = params.frequency;
  if (params.defaultAssigned != null) patch.defaultAssigned = params.defaultAssigned;

  await setDoc(refs.task(params.houseId, params.taskId), patch, { merge: true });
}

export async function deleteTask(params: { houseId: string; taskId: string }) {
  await deleteDoc(refs.task(params.houseId, params.taskId));
}

export async function listTasksBySector(params: { houseId: string; sectorIds: string[] }) {
  if (params.sectorIds.length === 0) return [];
  // Firestore "in" supports up to 30 values. For now we assume a sane number of sectors selected.
  const q = query(refs.tasks(params.houseId), where('sectorId', 'in', params.sectorIds));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Task) }));
}

export async function listTasks(houseId: string) {
  const snap = await getDocs(query(refs.tasks(houseId)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Task) }));
}

export async function setTaskDefaultAssigned(params: {
  houseId: string;
  taskId: string;
  defaultAssigned: boolean;
}) {
  await setDoc(
    refs.task(params.houseId, params.taskId),
    { defaultAssigned: params.defaultAssigned, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

