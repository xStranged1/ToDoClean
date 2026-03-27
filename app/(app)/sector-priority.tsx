import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { listSectors } from '@/services/sectors';
import { useAuthStore } from '@/stores/authStore';
import { Stack } from 'expo-router';
import * as React from 'react';
import { Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { useTabStore } from '@/stores/tabStore';

// ─── Types ───────────────────────────────────────────────────────────────────

type SectorOption = { id: string; name: string };

// A slot is either a single sectorId or an array of sectorIds (combined)
type Slot = string | string[];

type PriorityConfig = {
  [nUsers: number]: Slot[];
};

// ─── Firestore helpers ────────────────────────────────────────────────────────
// Firestore doesn't support nested arrays, so combined slots are serialized
// as "id1|id2" strings and deserialized back to string[] on read.

const SLOT_SEP = '|';

function serializeConfig(config: PriorityConfig): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [n, slots] of Object.entries(config)) {
    out[n] = slots.map((slot) =>
      Array.isArray(slot) ? slot.join(SLOT_SEP) : slot
    );
  }
  return out;
}

function deserializeConfig(raw: Record<string, string[]>): PriorityConfig {
  const out: PriorityConfig = {};
  for (const [n, slots] of Object.entries(raw)) {
    out[Number(n)] = slots.map((slot) =>
      slot.includes(SLOT_SEP) ? slot.split(SLOT_SEP) : slot
    );
  }
  return out;
}

function priorityRef(houseId: string) {
  return doc(db, 'houses', houseId, 'config', 'sectorPriority');
}

async function loadPriorityConfig(houseId: string): Promise<PriorityConfig> {
  const snap = await getDoc(priorityRef(houseId));
  if (!snap.exists()) return {};
  const data = snap.data();
  const raw = data?.config as Record<string, string[]> | undefined;
  return raw ? deserializeConfig(raw) : {};
}

async function savePriorityConfig(houseId: string, config: PriorityConfig) {
  await setDoc(priorityRef(houseId), { config: serializeConfig(config), updatedAt: serverTimestamp() });
}

// ─── Constants ────────────────────────────────────────────────────────────────

const USER_COUNTS = [4, 5, 6, 7, 8, 9, 10, 11];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SectorPriorityScreen() {
  const activeHouseId = useAuthStore((s) => s.activeHouseId);
  const activeHouseRole = useAuthStore((s) => s.activeHouseRole);
  const canEdit = activeHouseRole === 'owner' || activeHouseRole === 'admin';

  const [sectors, setSectors] = React.useState<SectorOption[]>([]);
  const [config, setConfig] = React.useState<PriorityConfig>({});
  const [selectedN, setSelectedN] = React.useState<number>(4);
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  // For the slot picker modal state
  const [editingSlotIndex, setEditingSlotIndex] = React.useState<number | null>(null);
  const [pickerSelected, setPickerSelected] = React.useState<string[]>([]);

  React.useEffect(() => {
    useTabStore.getState().setActualTabTitle('Prioridad de sectores');
  }, [])


  React.useEffect(() => {
    if (!activeHouseId) return;
    (async () => {
      setLoading(true);
      const [sectorList, savedConfig] = await Promise.all([
        listSectors(activeHouseId),
        loadPriorityConfig(activeHouseId),
      ]);
      setSectors(sectorList.map((s) => ({ id: s.id, name: s.name })));
      setConfig(savedConfig);
      setLoading(false);
    })();
  }, [activeHouseId]);

  const currentSlots: Slot[] = config[selectedN] ?? [];

  function getSectorName(id: string) {
    return sectors.find((s) => s.id === id)?.name ?? id;
  }

  function slotLabel(slot: Slot): string {
    if (Array.isArray(slot)) return slot.map(getSectorName).join(' + ');
    return getSectorName(slot);
  }

  // ── Slot operations ──────────────────────────────────────────────────────

  function addSlot() {
    setPickerSelected([]);
    setEditingSlotIndex(-1); // -1 = new slot
  }

  function editSlot(index: number) {
    const slot = currentSlots[index];
    setPickerSelected(Array.isArray(slot) ? slot : [slot]);
    setEditingSlotIndex(index);
  }

  function removeSlot(index: number) {
    const next = currentSlots.filter((_, i) => i !== index);
    setConfig((prev) => ({ ...prev, [selectedN]: next }));
  }

  function moveSlot(index: number, direction: 'up' | 'down') {
    const next = [...currentSlots];
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= next.length) return;
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    setConfig((prev) => ({ ...prev, [selectedN]: next }));
  }

  function confirmPicker() {
    if (pickerSelected.length === 0) return;
    const newSlot: Slot = pickerSelected.length === 1 ? pickerSelected[0] : pickerSelected;
    const next = [...currentSlots];
    if (editingSlotIndex === -1) {
      next.push(newSlot);
    } else if (editingSlotIndex !== null) {
      next[editingSlotIndex] = newSlot;
    }
    setConfig((prev) => ({ ...prev, [selectedN]: next }));
    setEditingSlotIndex(null);
    setPickerSelected([]);
  }

  function togglePickerSector(id: string) {
    setPickerSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function onSave() {
    if (!activeHouseId) return;
    setSaving(true);
    try {
      await savePriorityConfig(activeHouseId, config);
      showSuccessToast('Guardado', 'La configuración fue guardada correctamente.');
    } catch (e) {
      showErrorToast('Error', 'No se pudo guardar la configuración.');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Prioridad de sectores' }} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground">Cargando…</Text>
        </View>
      </>
    );
  }

  // Picker overlay
  if (editingSlotIndex !== null) {
    return (
      <>
        <Stack.Screen options={{ title: 'Seleccionar sector(es)' }} />
        <View className="flex-1 p-6 gap-4">
          <Text className="text-base text-muted-foreground">
            Seleccioná uno o más sectores para este slot. Si seleccionás varios, se combinarán.
          </Text>
          <ScrollView className="flex-1">
            <View className="gap-2">
              {sectors.map((s) => {
                const selected = pickerSelected.includes(s.id);
                return (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => togglePickerSector(s.id)}
                    className={`rounded-lg border p-3 ${selected ? 'border-primary bg-primary/10' : 'border-border'
                      }`}>
                    <Text className={selected ? 'font-semibold' : ''}>{s.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
          <View className="flex-row gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onPress={() => {
                setEditingSlotIndex(null);
                setPickerSelected([]);
              }}>
              <Text>Cancelar</Text>
            </Button>
            <Button
              className="flex-1"
              disabled={pickerSelected.length === 0}
              onPress={confirmPicker}>
              <Text>Confirmar</Text>
            </Button>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Prioridad de sectores' }} />
      <ScrollView className="flex-1 p-6"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* N-users tabs */}
        <Text className="text-lg font-semibold mb-3">Cantidad de usuarios</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          <View className="flex-row gap-2">
            {USER_COUNTS.map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => setSelectedN(n)}
                className={`rounded-full px-4 py-2 border ${selectedN === n ? 'bg-primary border-primary' : 'border-border bg-background'
                  }`}>
                <Text className={selectedN === n ? 'text-primary-foreground font-semibold' : ''}>
                  {n === 11 ? '11+' : String(n)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Slot list */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-base font-semibold">
            Orden de prioridad ({currentSlots.length} slots)
          </Text>
          {canEdit && (
            <Button size="sm" onPress={addSlot}>
              <Text>+ Agregar slot</Text>
            </Button>
          )}
        </View>

        {currentSlots.length === 0 ? (
          <View className="rounded-lg border border-dashed border-border p-6 items-center">
            <Text className="text-muted-foreground text-sm">
              No hay slots configurados para {selectedN} usuarios.
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {currentSlots.map((slot, i) => (
              <View
                key={i}
                className="flex-row items-center gap-2 rounded-lg border border-border p-3">
                {/* Position badge */}
                <View className="w-7 h-7 rounded-full bg-muted items-center justify-center">
                  <Text className="text-xs font-bold text-muted-foreground">{i + 1}</Text>
                </View>

                {/* Label */}
                <View className="flex-1">
                  <Text className="font-medium">{slotLabel(slot)}</Text>
                  {Array.isArray(slot) && (
                    <Text className="text-xs text-muted-foreground">Combinado</Text>
                  )}
                </View>

                {canEdit && (
                  <View className="flex-row gap-1">
                    <Button size="sm" variant="ghost" onPress={() => moveSlot(i, 'up')} disabled={i === 0}>
                      <Text>↑</Text>
                    </Button>
                    <Button size="sm" variant="ghost" onPress={() => moveSlot(i, 'down')} disabled={i === currentSlots.length - 1}>
                      <Text>↓</Text>
                    </Button>
                    <Button size="sm" variant="secondary" onPress={() => editSlot(i)}>
                      <Text>Editar</Text>
                    </Button>
                    <Button size="sm" variant="destructive" onPress={() => removeSlot(i)}>
                      <Text>✕</Text>
                    </Button>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {canEdit && (
          <Button className="mt-6" onPress={onSave} disabled={saving}>
            <Text>{saving ? 'Guardando…' : 'Guardar configuración'}</Text>
          </Button>
        )}

        {!canEdit && (
          <Text className="mt-4 text-sm text-muted-foreground text-center">
            Solo lectura — necesitás ser admin o dueño para editar.
          </Text>
        )}
      </ScrollView>
    </>
  );
}