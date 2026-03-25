import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { createSector, deleteSector, listSectors, updateSector } from '@/services/sectors';
import { useAuthStore } from '@/stores/authStore';
import { Stack } from 'expo-router';
import * as React from 'react';
import { Alert, ScrollView, View } from 'react-native';

export default function SectorsScreen() {
  const activeHouseId = useAuthStore((s) => s.activeHouseId);
  const activeHouseRole = useAuthStore((s) => s.activeHouseRole);
  const canEdit = activeHouseRole === 'owner' || activeHouseRole === 'admin';
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [rows, setRows] = React.useState<{ id: string; name: string; description?: string }[]>([]);
  const [editing, setEditing] = React.useState<{ id: string; name: string; description?: string } | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editDescription, setEditDescription] = React.useState('');

  const refresh = React.useCallback(async () => {
    if (!activeHouseId) return;
    const sectors = await listSectors(activeHouseId);
    setRows(sectors.map((s) => ({ id: s.id, name: s.name, description: s.description })));
  }, [activeHouseId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const onCreate = async () => {
    if (!activeHouseId) return;
    await createSector({ houseId: activeHouseId, name, description });
    setName('');
    setDescription('');
    await refresh();
  };

  const openEdit = (row: { id: string; name: string; description?: string }) => {
    setEditing(row);
    setEditName(row.name);
    setEditDescription(row.description ?? '');
  };

  const onSaveEdit = async () => {
    if (!activeHouseId || !editing) return;
    await updateSector({
      houseId: activeHouseId,
      sectorId: editing.id,
      name: editName,
      description: editDescription,
    });
    setEditing(null);
    await refresh();
  };

  const onDelete = async (sectorId: string) => {
    if (!activeHouseId) return;
    Alert.alert('Borrar sector', '¿Seguro? Esto no borra tareas automáticamente.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          await deleteSector({ houseId: activeHouseId, sectorId });
          await refresh();
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Sectores' }} />
      <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 40 }}>
        {canEdit ? (
          <View className="gap-3">
            <Text className="text-lg font-semibold">Crear sector</Text>
            <Input value={name} onChangeText={setName} placeholder="Nombre" />
            <Input value={description} onChangeText={setDescription} placeholder="Descripción (opcional)" />
            <Button onPress={onCreate} disabled={!activeHouseId || !name.trim()}>
              <Text>Crear</Text>
            </Button>
          </View>
        ) : (
          <View className="gap-2">
            <Text className="text-lg font-semibold">Sectores</Text>
            <Text className="text-sm text-muted-foreground">Solo lectura (no tenés permisos para editar).</Text>
          </View>
        )}

        <View className="mt-6 gap-2">
          <Text className="text-lg font-semibold">Lista</Text>
          {rows.map((s) => (
            <View key={s.id} className="rounded-lg border border-border p-3">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="font-medium">{s.name}</Text>
                  {!!s.description && <Text className="text-sm text-muted-foreground">{s.description}</Text>}
                </View>
                {canEdit && (
                  <View className="flex-row gap-2">
                    <Button size="sm" variant="secondary" onPress={() => openEdit(s)}>
                      <Text>Editar</Text>
                    </Button>
                    <Button size="sm" variant="destructive" onPress={() => onDelete(s.id)}>
                      <Text>Borrar</Text>
                    </Button>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar sector</DialogTitle>
            </DialogHeader>
            <View className="gap-3">
              <Input value={editName} onChangeText={setEditName} placeholder="Nombre" />
              <Input value={editDescription} onChangeText={setEditDescription} placeholder="Descripción (opcional)" />
            </View>
            <DialogFooter>
              <Button variant="secondary" onPress={() => setEditing(null)}>
                <Text>Cancelar</Text>
              </Button>
              <Button onPress={onSaveEdit} disabled={!editName.trim()}>
                <Text>Guardar</Text>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ScrollView>
    </>
  );
}

