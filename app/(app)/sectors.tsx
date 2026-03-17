import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { createSector, listSectors } from '@/services/sectors';
import { useAuthStore } from '@/stores/authStore';
import { Stack } from 'expo-router';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

export default function SectorsScreen() {
  const activeHouseId = useAuthStore((s) => s.activeHouseId);
  const activeHouseRole = useAuthStore((s) => s.activeHouseRole);
  const canEdit = activeHouseRole === 'owner' || activeHouseRole === 'admin';
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [rows, setRows] = React.useState<{ id: string; name: string; description?: string }[]>([]);

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

  return (
    <>
      <Stack.Screen options={{ title: 'Sectores' }} />
      <ScrollView className="flex-1 p-6">
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
              <Text className="font-medium">{s.name}</Text>
              {!!s.description && <Text className="text-sm text-muted-foreground">{s.description}</Text>}
            </View>
          ))}
        </View>
      </ScrollView>
    </>
  );
}

