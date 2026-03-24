import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { assignTasksToUser, getCurrentWeekPeriod } from '@/services/assignments';
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

type Slot = string | string[]; // string[] = combined sectors

type PriorityConfig = Record<number, Slot[]>;

type HouseUserRow = { id: string; uid: string; displayName: string; inHome: boolean };

type UserWithSlot = {
  uid: string;
  displayName: string;
  // Current slot assignment (sector ids)
  currentSlot: string[];
  // Next slot after rotation (sector ids)
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

// User rotation order persisted per house
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

/** Given N users, pick the right slot list from the priority config.
 *  Falls back to the closest lower N if exact match missing. */
function getSlotsForN(config: PriorityConfig, n: number): Slot[] | null {
  if (config[n]) return config[n];
  // Try lower counts
  for (let i = n - 1; i >= 1; i--) {
    if (config[i]) return config[i];
  }
  return null;
}

/** Rotate an array one step: last element becomes first */
function rotateRight<T>(arr: T[]): T[] {
  if (arr.length === 0) return arr;
  return [arr[arr.length - 1], ...arr.slice(0, arr.length - 1)];
}

function slotToIds(slot: Slot): string[] {
  return Array.isArray(slot) ? slot : [slot];
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PassWeekScreen() {
  const activeHouseId = useAuthStore((s) => s.activeHouseId);
  const currentUser = useAuthStore((s) => s.user);

  type LoadState = 'loading' | 'no_config' | 'ready' | 'error';
  const [loadState, setLoadState] = React.useState<LoadState>('loading');

  const [sectorNames, setSectorNames] = React.useState<Record<string, string>>({});
  const [rows, setRows] = React.useState<UserWithSlot[]>([]);
  // mutable rotation offset — 0 = current rotation
  const [rotationOffset, setRotationOffset] = React.useState(0);
  const [assigning, setAssigning] = React.useState(false);

  // Stable base: ordered user list + their base slots (from priority config order)
  const baseRef = React.useRef<{ uid: string; slot: string[] }[]>([]);

  // ── Load ────────────────────────────────────────────────────────────────────

  React.useEffect(() => {
    if (!activeHouseId) return;
    (async () => {
      setLoadState('loading');
      try {
        const [allUsers, sectors, config] = await Promise.all([
          listUsersForHouse(activeHouseId),
          listSectors(activeHouseId),
          loadPriorityConfig(activeHouseId),
        ]);

        // Names map
        const names: Record<string, string> = {};
        for (const s of sectors) names[s.id] = s.name;
        setSectorNames(names);

        // Only in-home users
        const inHome = (allUsers as HouseUserRow[]).filter((u) => u.inHome);
        const n = inHome.length;

        const slots = getSlotsForN(config, n);
        if (!slots || slots.length < n) {
          setLoadState('no_config');
          return;
        }

        // Load or init persisted user order
        let savedOrder = await loadUserOrder(activeHouseId);
        let orderedUsers: HouseUserRow[];

        if (savedOrder && savedOrder.length === n && savedOrder.every((uid) => inHome.find((u) => u.uid === uid))) {
          orderedUsers = savedOrder.map((uid) => inHome.find((u) => u.uid === uid)!);
        } else {
          orderedUsers = inHome;
          await saveUserOrder(activeHouseId, orderedUsers.map((u) => u.uid));
        }

        // Assign slots in priority order (slot[0] = position 0, etc.)
        const base = orderedUsers.map((u, i) => ({
          uid: u.uid,
          slot: slotToIds(slots[i]),
        }));
        baseRef.current = base;

        buildRows(base, orderedUsers, 0);
        setRotationOffset(0);
        setLoadState('ready');
      } catch (e) {
        console.error(e);
        setLoadState('error');
      }
    })();
  }, [activeHouseId]);

  function buildRows(
    base: { uid: string; slot: string[] }[],
    users: HouseUserRow[],
    offset: number
  ) {
    const n = base.length;
    const rotated = rotateRight([...base.map((b) => b.slot)].slice());
    // Apply offset rotations
    let current = base.map((b) => b.slot);
    let next = rotateRight([...current]);
    for (let i = 1; i < offset; i++) {
      current = rotateRight(current);
      next = rotateRight([...current]);
    }

    const mapped: UserWithSlot[] = users.map((u, i) => ({
      uid: u.uid,
      displayName: u.displayName,
      currentSlot: current[i],
      nextSlot: next[i],
    }));
    setRows(mapped);
  }

  // Recompute rows when offset changes
  React.useEffect(() => {
    if (loadState !== 'ready') return;
    const base = baseRef.current;
    let current = base.map((b) => b.slot);
    for (let i = 0; i < rotationOffset; i++) current = rotateRight(current);
    const next = rotateRight([...current]);
    setRows((prev) =>
      prev.map((r, i) => ({ ...r, currentSlot: current[i], nextSlot: next[i] }))
    );
  }, [rotationOffset, loadState]);

  // ── Move user up in rotation order ─────────────────────────────────────────

  function moveUserUp(index: number) {
    if (index === 0 || !activeHouseId) return;
    setRows((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      // Also update baseRef and persist
      const newBase = next.map((r, i) => ({ uid: r.uid, slot: baseRef.current.find((b) => b.uid === r.uid)!.slot }));
      baseRef.current = newBase;
      saveUserOrder(activeHouseId, next.map((r) => r.uid));
      return next;
    });
  }

  // ── Assign ─────────────────────────────────────────────────────────────────

  async function onPassWeek() {
    if (!activeHouseId || !currentUser) return;

    Alert.alert(
      'Pasar de semana',
      `Se asignarán los sectores rotados a ${rows.length} usuarios. ¿Continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setAssigning(true);
            try {
              const period = getCurrentWeekPeriod();

              await Promise.all(
                rows.map(async (r) => {
                  // Get tasks for each sector in the next slot
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

              // Advance rotation offset
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

        {/* Current assignments */}
        <Text className="text-lg font-semibold mb-3">Sectores asignados actualmente</Text>
        <View className="gap-2 mb-6">
          {rows.map((r) => (
            <View key={r.uid} className="rounded-lg border border-border px-4 py-3">
              <Text className="font-medium">{r.displayName}</Text>
              <Text className="text-sm text-muted-foreground">{slotDisplay(r.currentSlot)}</Text>
            </View>
          ))}
        </View>

        {/* Next rotation preview */}
        <Text className="text-lg font-semibold mb-1">Los sectores rotarán a</Text>
        <Text className="text-xs text-muted-foreground mb-3">
          Usá ↑ para ajustar el orden de rotación de cada usuario.
        </Text>
        <View className="gap-2 mb-8">
          {rows.map((r, i) => (
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
                disabled={i === 0}
                onPress={() => moveUserUp(i)}>
                <Text>↑</Text>
              </Button>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View className="gap-3">
          <Button onPress={onPassWeek} disabled={assigning || rows.length === 0}>
            <Text>{assigning ? 'Asignando…' : 'Pasar de semana'}</Text>
          </Button>

          <Button variant="secondary" disabled>
            <Text className="text-muted-foreground">Pasar por estadística (próximamente)</Text>
          </Button>
        </View>

        <View className="h-8" />
      </ScrollView>
    </>
  );
}