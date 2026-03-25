import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { assignTasksToUser, getCurrentWeekPeriod, getAssignmentsForHouse } from '@/services/assignments';
import { db } from '@/services/firebase';
import { listSectors } from '@/services/sectors';
import { listTasksBySector } from '@/services/tasks';
import { listUsersForHouse } from '@/services/users';
import { useAuthStore } from '@/stores/authStore';
import { Link, Stack } from 'expo-router';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import * as React from 'react';
import { Alert, ScrollView, View } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

type Slot = string | string[];

type PriorityConfig = Record<number, Slot[]>;

type HouseUserRow = { id: string; uid: string; displayName: string; inHome: boolean };

// Current assignment pulled from Firestore (latest assignment doc per user)
type CurrentAssignment = {
  uid: string;
  displayName: string;
  sectorIds: string[];
};

// Next rotation row (user + what they'll get next)
type NextAssignment = {
  uid: string;
  displayName: string;
  nextSlot: string[];
};

// ─── Firestore helpers ────────────────────────────────────────────────────────

const SLOT_SEP = '|';

function deserializeConfig(raw: Record<string, string[]>): PriorityConfig {
  const out: PriorityConfig = {};
  for (const [n, slots] of Object.entries(raw)) {
    out[Number(n)] = slots.map((slot) =>
      slot.includes(SLOT_SEP) ? slot.split(SLOT_SEP) : slot
    );
  }
  return out;
}

async function loadPriorityConfig(houseId: string): Promise<PriorityConfig> {
  const snap = await getDoc(doc(db, 'houses', houseId, 'config', 'sectorPriority'));
  if (!snap.exists()) return {};
  const raw = snap.data()?.config as Record<string, string[]> | undefined;
  return raw ? deserializeConfig(raw) : {};
}

async function loadUserOrder(houseId: string): Promise<string[] | null> {
  const snap = await getDoc(doc(db, 'houses', houseId, 'config', 'userOrder'));
  if (!snap.exists()) return null;
  return (snap.data()?.order as string[]) ?? null;
}

async function saveUserOrder(houseId: string, uids: string[]) {
  await setDoc(
    doc(db, 'houses', houseId, 'config', 'userOrder'),
    { order: uids, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSlotsForN(config: PriorityConfig, n: number): Slot[] | null {
  if (config[n]) return config[n];
  for (let i = n - 1; i >= 1; i--) {
    if (config[i]) return config[i];
  }
  return null;
}

/** Rotate array one step right: last element becomes first */
function rotateRight<T>(arr: T[]): T[] {
  if (arr.length === 0) return arr;
  return [arr[arr.length - 1], ...arr.slice(0, arr.length - 1)];
}

function slotToIds(slot: Slot): string[] {
  return Array.isArray(slot) ? slot : [slot];
}

/** Given an ordered user list and their positional slots, compute the next rotation slots */
function computeNextSlots(
  orderedUsers: { uid: string }[],
  slotsPerPosition: string[][],
  rotationOffset: number
): string[][] {
  let current = [...slotsPerPosition];
  for (let i = 0; i < rotationOffset; i++) current = rotateRight(current);
  return rotateRight([...current]);
}

/**
 * Sort inHome users according to the saved order.
 * Users not present in savedOrder (new members) are appended at the end.
 */
function getUserOrder(inHome: HouseUserRow[], savedOrder: string[] | null): HouseUserRow[] {
  if (!savedOrder || savedOrder.length === 0) return inHome;

  const byUid = new Map(inHome.map((u) => [u.uid, u]));
  const ordered: HouseUserRow[] = [];

  for (const uid of savedOrder) {
    const u = byUid.get(uid);
    if (u) ordered.push(u);
  }

  // Append any new members not yet in savedOrder
  for (const u of inHome) {
    if (!savedOrder.includes(u.uid)) ordered.push(u);
  }

  return ordered;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PassWeekScreen() {
  const activeHouseId = useAuthStore((s) => s.activeHouseId);
  const currentUser = useAuthStore((s) => s.user);

  type LoadState = 'loading' | 'no_config' | 'ready' | 'error';
  const [loadState, setLoadState] = React.useState<LoadState>('loading');

  const [sectorNames, setSectorNames] = React.useState<Record<string, string>>({});

  // Current assignments: ordered to match nextRows at all times
  const [currentAssignments, setCurrentAssignments] = React.useState<CurrentAssignment[]>([]);

  // Next rotation: ordered list of users with their upcoming slots
  const [nextRows, setNextRows] = React.useState<NextAssignment[]>([]);

  // How many times "Pasar semana" has been pressed this session
  const [rotationOffset, setRotationOffset] = React.useState(0);
  const [assigning, setAssigning] = React.useState(false);
  const [savingOrder, setSavingOrder] = React.useState(false);

  // Canonical slot-per-position array (index = position, value = sector ids).
  const slotsPerPositionRef = React.useRef<string[][]>([]);
  // Current ordered user list
  const orderedUsersRef = React.useRef<HouseUserRow[]>([]);
  // Latest Firestore sector assignments by uid (never changes after load)
  const latestByUserRef = React.useRef<Record<string, string[]>>({});

  // ── Load ────────────────────────────────────────────────────────────────────

  React.useEffect(() => {
    if (!activeHouseId) return;
    (async () => {
      setLoadState('loading');
      try {
        const [allUsers, sectors, config, allAssignments] = await Promise.all([
          listUsersForHouse(activeHouseId),
          listSectors(activeHouseId),
          loadPriorityConfig(activeHouseId),
          getAssignmentsForHouse({ houseId: activeHouseId, periodType: 'week' }),
        ]);

        // Sector names map
        const names: Record<string, string> = {};
        for (const s of sectors) names[s.id] = s.name;
        setSectorNames(names);

        // Only in-home users
        const inHome = (allUsers as HouseUserRow[]).filter((u) => u.inHome);
        const n = inHome.length;

        // ── Latest Firestore assignment per in-home user ──
        // allAssignments is ordered by createdAt desc, so first match = latest
        const latestByUser: Record<string, string[]> = {};
        for (const a of allAssignments) {
          if (!inHome.find((u) => u.uid === a.userId)) continue;
          if (!latestByUser[a.userId]) {
            latestByUser[a.userId] = [...new Set(a.tasks.map((t) => t.sectorId))];
          }
        }
        latestByUserRef.current = latestByUser;

        // ── Next rotation setup ──────────────────────────────────────────────
        const slots = getSlotsForN(config, n);
        if (!slots || slots.length < n) {
          setLoadState('no_config');
          return;
        }

        // Load saved order and apply it — canonical order for BOTH sections
        const savedOrder = await loadUserOrder(activeHouseId);
        const orderedUsers = getUserOrder(inHome, savedOrder);

        // Persist if savedOrder was missing or stale
        if (
          !savedOrder ||
          savedOrder.length !== n ||
          !savedOrder.every((uid) => inHome.find((u) => u.uid === uid))
        ) {
          await saveUserOrder(activeHouseId, orderedUsers.map((u) => u.uid));
        }

        orderedUsersRef.current = orderedUsers;

        // Current assignments: same order as orderedUsers
        setCurrentAssignments(
          orderedUsers.map((u) => ({
            uid: u.uid,
            displayName: u.displayName,
            sectorIds: latestByUser[u.uid] ?? [],
          }))
        );

        // Positional slots: slot[i] belongs to position i
        const slotsPerPosition = slots.slice(0, n).map((s) => slotToIds(s));
        slotsPerPositionRef.current = slotsPerPosition;

        // Next = rotateRight once from current (rotationOffset = 0 on load)
        const nextSlots = rotateRight([...slotsPerPosition]);
        setNextRows(
          orderedUsers.map((u, i) => ({
            uid: u.uid,
            displayName: u.displayName,
            nextSlot: nextSlots[i],
          }))
        );

        setRotationOffset(0);
        setLoadState('ready');
      } catch (e) {
        console.error(e);
        setLoadState('error');
      }
    })();
  }, [activeHouseId]);

  // Recompute next rotation when rotationOffset advances (after "Pasar semana")
  React.useEffect(() => {
    if (loadState !== 'ready') return;
    const orderedUsers = orderedUsersRef.current;
    const slotsPerPosition = slotsPerPositionRef.current;
    const nextSlots = computeNextSlots(orderedUsers, slotsPerPosition, rotationOffset);
    setNextRows((prev) =>
      prev.map((r, i) => ({ ...r, nextSlot: nextSlots[i] }))
    );
  }, [rotationOffset, loadState]);

  // ── Move user up in next-rotation order (circular) ───────────────────────────
  //
  // Both sections stay in lockstep: user names move together, sectors stay positional.

  function moveUserUp(index: number) {
    const n = orderedUsersRef.current.length;
    const swapWith = (index - 1 + n) % n; // circular

    // Update the canonical user order
    const newOrdered = [...orderedUsersRef.current];
    [newOrdered[swapWith], newOrdered[index]] = [newOrdered[index], newOrdered[swapWith]];
    orderedUsersRef.current = newOrdered;

    // Recompute next slots based on new user order + current rotation offset
    const nextSlots = computeNextSlots(newOrdered, slotsPerPositionRef.current, rotationOffset);

    // Update both sections in lockstep
    setNextRows(
      newOrdered.map((u, i) => ({
        uid: u.uid,
        displayName: u.displayName,
        nextSlot: nextSlots[i],
      }))
    );

    setCurrentAssignments(
      newOrdered.map((u) => ({
        uid: u.uid,
        displayName: u.displayName,
        sectorIds: latestByUserRef.current[u.uid] ?? [],
      }))
    );
  }

  // ── Save rotation order ─────────────────────────────────────────────────────

  async function onSaveOrder() {
    if (!activeHouseId) return;
    setSavingOrder(true);
    try {
      const uids = orderedUsersRef.current.map((u) => u.uid);
      await saveUserOrder(activeHouseId, uids);
      Alert.alert('Listo', 'El orden de rotación fue guardado.');
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el orden.');
    } finally {
      setSavingOrder(false);
    }
  }

  // ── Assign ─────────────────────────────────────────────────────────────────

  async function onPassWeek() {
    if (!activeHouseId || !currentUser) return;

    Alert.alert(
      'Pasar de semana',
      `Se asignarán los sectores rotados a ${nextRows.length} usuarios. ¿Continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setAssigning(true);
            try {
              const period = getCurrentWeekPeriod();

              await Promise.all(
                nextRows.map(async (r) => {
                  const tasks = await listTasksBySector({
                    houseId: activeHouseId,
                    sectorIds: r.nextSlot,
                  });

                  await assignTasksToUser({
                    houseId: activeHouseId,
                    userId: r.uid,
                    createdBy: currentUser.uid,
                    period,
                    tasks: tasks.map((t) => ({
                      taskId: t.id,
                      sectorId: t.sectorId,
                      name: t.name,
                    })),
                  });
                })
              );

              setRotationOffset((prev) => prev + 1);
              Alert.alert('Listo', 'Las tareas fueron asignadas correctamente.');
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Error desconocido';
              Alert.alert('Error', msg);
            } finally {
              setAssigning(false);
            }
          },
        },
      ]
    );
  }

  // ── Render helpers ──────────────────────────────────────────────────────────

  function slotDisplay(ids: string[]) {
    if (!ids || ids.length === 0) return 'Sin asignación';
    return ids.map((id) => sectorNames[id] ?? id).join(' + ');
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loadState === 'loading') {
    return (
      <>
        <Stack.Screen options={{ title: 'Pasar semana' }} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground">Cargando…</Text>
        </View>
      </>
    );
  }

  if (loadState === 'no_config') {
    return (
      <>
        <Stack.Screen options={{ title: 'Pasar semana' }} />
        <View className="flex-1 items-center justify-center gap-4 p-8">
          <Text className="text-center text-base font-medium">
            No hay prioridad de sectores configurada para la cantidad actual de usuarios en casa.
          </Text>
          <Text className="text-center text-sm text-muted-foreground">
            Configurá el orden de prioridad antes de pasar de semana.
          </Text>
          <Link href="/(app)/sector-priority" asChild>
            <Button>
              <Text>Ir a Prioridad de sectores</Text>
            </Button>
          </Link>
        </View>
      </>
    );
  }

  if (loadState === 'error') {
    return (
      <>
        <Stack.Screen options={{ title: 'Pasar semana' }} />
        <View className="flex-1 items-center justify-center p-8">
          <Text className="text-destructive text-center">
            Ocurrió un error al cargar los datos. Intentá de nuevo.
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Pasar semana' }} />
      <ScrollView className="flex-1 p-6">

        {/* Current assignments — ordered to match nextRows at all times */}
        <Text className="text-lg font-semibold mb-3">Sectores asignados actualmente</Text>
        <View className="gap-2 mb-6">
          {currentAssignments.map((r) => (
            <View key={r.uid} className="rounded-lg border border-border px-4 py-3">
              <Text className="font-medium">{r.displayName}</Text>
              <Text className="text-sm text-muted-foreground">{slotDisplay(r.sectorIds)}</Text>
            </View>
          ))}
        </View>

        {/* Next rotation preview */}
        <Text className="text-lg font-semibold mb-1">Los sectores rotarán a</Text>
        <Text className="text-xs text-muted-foreground mb-3">
          Usá ↑ para ajustar el orden de rotación. El listado es circular.
        </Text>
        <View className="gap-2 mb-8">
          {nextRows.map((r, i) => (
            <View
              key={r.uid}
              className="flex-row items-center gap-3 rounded-lg border border-border px-4 py-3">
              <View className="flex-1">
                <Text className="font-medium">{r.displayName}</Text>
                <Text className="text-sm text-muted-foreground">{slotDisplay(r.nextSlot)}</Text>
              </View>
              <Button
                size="sm"
                variant="ghost"
                onPress={() => moveUserUp(i)}>
                <Text>↑</Text>
              </Button>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View className="gap-3">
          <Button onPress={onPassWeek} disabled={assigning || nextRows.length === 0}>
            <Text>{assigning ? 'Asignando…' : 'Pasar de semana'}</Text>
          </Button>

          <Button variant="secondary" disabled>
            <Text className="text-muted-foreground">Pasar por estadística (próximamente)</Text>
          </Button>

          <Button variant="secondary" onPress={onSaveOrder} disabled={savingOrder}>
            <Text>{savingOrder ? 'Guardando…' : 'Guardar orden de rotación'}</Text>
          </Button>
        </View>

        <View className="h-8" />
      </ScrollView>
    </>
  );
}