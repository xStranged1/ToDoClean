import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  const activeHouseRole = useAuthStore((s) => s.activeHouseRole);
  const canEdit = activeHouseRole === 'owner' || activeHouseRole === 'admin';

  const [sectors, setSectors] = React.useState<{ id: string; name: string }[]>([]);
  const [sectorId, setSectorId] = React.useState<string>('');
  const [taskName, setTaskName] = React.useState('');
  const [taskDescription, setTaskDescription] = React.useState('');
  const [rows, setRows] = React.useState<
    { id: string; name: string; description?: string; sectorId: string }[]
  >([]);

  // ✅ CARGA DE SECTORES
  React.useEffect(() => {
    if (!activeHouseId) return;

    const load = async () => {
      const allSectors = await listSectors(activeHouseId);
      const mapped = allSectors.map((s) => ({ id: s.id, name: s.name }));
      setSectors(mapped);

      if (!sectorId && mapped.length > 0) {
        setSectorId(mapped[0].id);
      }
    };

    load();
  }, [activeHouseId]);

  // ✅ CARGA DE TAREAS CUANDO CAMBIA SECTOR
  React.useEffect(() => {
    if (!activeHouseId || !sectorId) return;

    const loadTasks = async () => {
      const tasks = await listTasksBySector({
        houseId: activeHouseId,
        sectorIds: [sectorId],
      });

      setRows(
        tasks.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          sectorId: t.sectorId,
        }))
      );
    };

    loadTasks();
  }, [sectorId, activeHouseId]);

  const refresh = async () => {
    if (!activeHouseId || !sectorId) return;

    const tasks = await listTasksBySector({
      houseId: activeHouseId,
      sectorIds: [sectorId],
    });

    setRows(
      tasks.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        sectorId: t.sectorId,
      }))
    );
  };

  const onCreate = async () => {
    if (!activeHouseId || !sectorId) return;

    await createTask({
      houseId: activeHouseId,
      sectorId,
      name: taskName,
      description: taskDescription,
    });

    setTaskName('');
    setTaskDescription('');
    await refresh();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Tareas' }} />

      <ScrollView className="flex-1 p-6">
        {canEdit ? (
          <View className="gap-3">
            <Text className="text-lg font-semibold">Crear tarea</Text>

            {/* ✅ SELECT ARREGLADO */}
            <View className="gap-2">
              <Label>Sector</Label>

              <Select
                value={sectorId}
                onValueChange={(value) => setSectorId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sector" />
                </SelectTrigger>

                <SelectContent>
                  {sectors.map((s) => (
                    <SelectItem
                      key={s.id}
                      value={s.id}
                      label={s.name}
                    >
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>

            <Input
              value={taskName}
              onChangeText={setTaskName}
              placeholder="Nombre de la tarea"
            />

            <Input
              value={taskDescription}
              onChangeText={setTaskDescription}
              placeholder="Descripción (opcional)"
            />

            <Button
              onPress={onCreate}
              disabled={!activeHouseId || !sectorId || !taskName.trim()}
            >
              <Text>Crear</Text>
            </Button>
          </View>
        ) : (
          <View className="gap-2">
            <Text className="text-lg font-semibold">Tareas</Text>
            <Text className="text-sm text-muted-foreground">
              Solo lectura (no tenés permisos para editar).
            </Text>
          </View>
        )}

        <View className="mt-6 gap-2">
          <Text className="text-lg font-semibold">
            Lista (sector actual)
          </Text>

          {rows.map((t) => (
            <TaskItem
              key={t.id}
              title={t.name}
              description={t.description}
              subtitle={`sectorId: ${t.sectorId}`}
            />
          ))}
        </View>
      </ScrollView>
    </>
  );
}

