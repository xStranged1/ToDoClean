import { getDocs, orderBy, query, where } from 'firebase/firestore';

import { refs } from './refs';
import { getCurrentWeekPeriod } from './assignments';
import type { Assignment } from './types';

export async function getCurrentWeekAssignmentsForUser(params: { houseId: string; userId: string }) {
  const period = getCurrentWeekPeriod();
  const q = query(
    refs.assignments(params.houseId),
    where('userId', '==', params.userId),
    where('periodType', '==', 'week'),
    where('periodStart', '>=', period.periodStart),
    where('periodStart', '<', period.periodEnd),
    orderBy('periodStart', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Assignment) }));
}

