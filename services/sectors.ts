import { addDoc, deleteDoc, getDocs, query, serverTimestamp, setDoc } from 'firebase/firestore';

import { refs } from './refs';
import type { Sector } from './types';

export async function createSector(params: { houseId: string; name: string; description?: string }) {
  const data: Omit<Sector, 'createdAt' | 'updatedAt'> & { createdAt: unknown; updatedAt: unknown } = {
    name: params.name.trim(),
    description: params.description?.trim() || undefined,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(refs.sectors(params.houseId), data);
  return { sectorId: ref.id };
}

export async function updateSector(params: {
  houseId: string;
  sectorId: string;
  name?: string;
  description?: string;
}) {
  const patch: Partial<Sector> & { updatedAt: unknown } = {
    updatedAt: serverTimestamp(),
  };
  if (params.name != null) patch.name = params.name.trim();
  if (params.description != null) patch.description = params.description.trim() || undefined;
  await setDoc(refs.sector(params.houseId, params.sectorId), patch, { merge: true });
}

export async function deleteSector(params: { houseId: string; sectorId: string }) {
  await deleteDoc(refs.sector(params.houseId, params.sectorId));
}

export async function listSectors(houseId: string) {
  const snap = await getDocs(query(refs.sectors(houseId)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Sector) }));
}

