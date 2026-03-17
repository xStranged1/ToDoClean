import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { listSectors } from '@/services/sectors';
import { createTask, listTasksBySector } from '@/services/tasks';
import { useAuthStore } from '@/stores/authStore';
import { Stack } from 'expo-router';
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { TaskItem } from '@/components/domain/TaskItem';

export default function TasksScreen() {
  const activeHouseId = useAuthStore((s) => s.activeHouseId);
  const [sectors, setSectors] = React.useState<{ id: string; name: string }[]>([]);
  const [sectorId, setSectorId] = React.useState<string>('');
  const [taskName, setTaskName] = React.useState('');
  const [rows, setRows] = React.useState<{ id: string; name: string; sectorId: string }[]>([]);

  const refresh = React.useCallback(async () => {
    if (!activeHouseId) return;
    const allSectors = await listSectors(activeHouseId);
    setSectors(allSectors.map((s) => ({ id: s.id, name: s.name })));
    const firstSector = sectorId || allSectors[0]?.id || '';
    if (firstSector) {
      setSectorId(firstSector);
      const tasks = await listTasksBySector({ houseId: activeHouseId, sectorIds: [firstSector] });
      setRows(tasks.map((t) => ({ id: t.id, name: t.name, sectorId: t.sectorId })));
    } else {
      setRows([]);
    }
  }, [activeHouseId, sectorId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const onCreate = async () => {
    if (!activeHouseId || !sectorId) return;
    await createTask({ houseId: activeHouseId, sectorId, name: taskName });
    setTaskName('');
    await refresh();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Tareas' }} />
      <ScrollView className="flex-1 p-6">
        <View className="gap-3">
          <Text className="text-lg font-semibold">Crear tarea</Text>
          <Text className="text-sm text-muted-foreground">
            Sector actual: {sectors.find((s) => s.id === sectorId)?.name ?? '—'}
          </Text>
          <Input value={taskName} onChangeText={setTaskName} placeholder="Nombre de la tarea" />
          <Button onPress={onCreate} disabled={!activeHouseId || !sectorId || !taskName.trim()}>
            <Text>Crear</Text>
          </Button>
        </View>

        <View className="mt-6 gap-2">
          <Text className="text-lg font-semibold">Lista (sector actual)</Text>
          {rows.map((t) => (
            <TaskItem key={t.id} title={t.name} subtitle={`sectorId: ${t.sectorId}`} />
          ))}
        </View>
      </ScrollView>
    </>
  );
}

