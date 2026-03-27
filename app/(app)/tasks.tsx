import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type Option,
} from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { listSectors } from '@/services/sectors';
import { createTask, deleteTask, listTasksBySector, updateTask } from '@/services/tasks';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { useAuthStore } from '@/stores/authStore';
import { Stack } from 'expo-router';
import * as React from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { TaskItem } from '@/components/domain/TaskItem';
import { useTabStore } from '@/stores/tabStore';

export default function TasksScreen() {
  const activeHouseId = useAuthStore((s) => s.activeHouseId);
  const activeHouseRole = useAuthStore((s) => s.activeHouseRole);
  const canEdit = activeHouseRole === 'owner' || activeHouseRole === 'admin';

  const [sectors, setSectors] = React.useState<{ id: string; name: string }[]>([]);
  const [sectorId, setSectorId] = React.useState<Option | undefined>(undefined);
  const [taskName, setTaskName] = React.useState('');
  const [taskDescription, setTaskDescription] = React.useState('');
  const [editing, setEditing] = React.useState<{
    id: string;
    name: string;
    description?: string;
    sectorId: string;
  } | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editDescription, setEditDescription] = React.useState('');
  const [editSectorId, setEditSectorId] = React.useState<Option | undefined>(undefined);
  const [rows, setRows] = React.useState<
    { id: string; name: string; description?: string; sectorId: string }[]
  >([]);

  React.useEffect(() => {
    useTabStore.getState().setActualTabTitle('Tareas');
  }, [])

  // ✅ CARGA DE SECTORES
  React.useEffect(() => {
    if (!activeHouseId) return;

    const load = async () => {
      const allSectors = await listSectors(activeHouseId);
      const mapped = allSectors.map((s) => ({ id: s.id, name: s.name }));
      setSectors(mapped);

      if (!sectorId && mapped.length > 0) {
        setSectorId({ value: mapped[0].id, label: mapped[0].name });
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
        sectorIds: [sectorId.value],
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
      sectorIds: [sectorId.value],
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

    try {
      await createTask({
        houseId: activeHouseId,
        sectorId: sectorId.value,
        name: taskName,
        description: taskDescription,
      });

      showSuccessToast('Tarea creada', 'Se creó la tarea correctamente.');

      setTaskName('');
      setTaskDescription('');
      await refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Ocurrió un error al crear la tarea.';
      showErrorToast('Error', message);
    }
  };

  const openEdit = (row: { id: string; name: string; description?: string; sectorId: string }) => {
    setEditing(row);
    setEditName(row.name);
    setEditDescription(row.description ?? '');
    setEditSectorId({
      value: row.sectorId,
      label: sectors.find((s) => s.id === row.sectorId)?.name ?? row.sectorId,
    });
  };

  const onSaveEdit = async () => {
    if (!activeHouseId || !editing || !editSectorId) return;
    await updateTask({
      houseId: activeHouseId,
      taskId: editing.id,
      name: editName,
      description: editDescription,
      sectorId: editSectorId.value,
    });
    setEditing(null);
    await refresh();
  };

  const onDelete = async (taskId: string) => {
    if (!activeHouseId) return;
    Alert.alert('Borrar tarea', '¿Seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          await deleteTask({ houseId: activeHouseId, taskId });
          await refresh();
        },
      },
    ]);
  };

  return (
    <>

      <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 40 }}>
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
              disabled={!activeHouseId || !sectorId?.value || !taskName.trim()}
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
            <View key={t.id} className="gap-2">
              <TaskItem
                title={t.name}
                description={t.description}
                subtitle={`sector: ${sectors.find((s) => s.id === t.sectorId)?.name ?? t.sectorId}`}
              />
              {canEdit && (
                <View className="flex-row gap-2">
                  <Button size="sm" variant="secondary" onPress={() => openEdit(t)}>
                    <Text>Editar</Text>
                  </Button>
                  <Button size="sm" variant="destructive" onPress={() => onDelete(t.id)}>
                    <Text>Borrar</Text>
                  </Button>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar tarea</DialogTitle>
          </DialogHeader>
          <View className="gap-3">
            <View className="gap-2">
              <Label>Sector</Label>
              <Select
                value={editSectorId}
                onValueChange={(value) => setEditSectorId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sector" />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map((s) => (
                    <SelectItem key={s.id} value={s.id} label={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>
            <Input value={editName} onChangeText={setEditName} placeholder="Nombre" />
            <Input value={editDescription} onChangeText={setEditDescription} placeholder="Descripción (opcional)" />
          </View>
          <DialogFooter>
            <Button variant="secondary" onPress={() => setEditing(null)}>
              <Text>Cancelar</Text>
            </Button>
            <Button onPress={onSaveEdit} disabled={!editName.trim() || !editSectorId}>
              <Text>Guardar</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

