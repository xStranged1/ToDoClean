import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { assignTasksToUser, getCurrentWeekPeriod } from '@/services/assignments';
import { listSectors } from '@/services/sectors';
import { listTasksBySector } from '@/services/tasks';
import { listUsersForHouse } from '@/services/users';
import { useAuthStore } from '@/stores/authStore';
import { Stack } from 'expo-router';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

export default function AssignScreen() {
  const activeHouseId = useAuthStore((s) => s.activeHouseId);
  const user = useAuthStore((s) => s.user);
  const activeHouseRole = useAuthStore((s) => s.activeHouseRole);
  // If role is still loading, we allow the UI to work and rely on Firestore rules later.
  const canAssign = activeHouseRole === 'owner' || activeHouseRole === 'admin' || activeHouseRole === null;
  const [users, setUsers] = React.useState<{ id: string; uid: string; displayName: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const [sectors, setSectors] = React.useState<{ id: string; name: string }[]>([]);
  const [selectedSectorIds, setSelectedSectorIds] = React.useState<Record<string, boolean>>({});
  const [tasks, setTasks] = React.useState<{ id: string; name: string; sectorId: string }[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = React.useState<Record<string, boolean>>({});
  const [userSearch, setUserSearch] = React.useState('');
  const [sectorSearch, setSectorSearch] = React.useState('');
  const [taskSearch, setTaskSearch] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeHouseId) return;
      const rows = await listUsersForHouse(activeHouseId);
      if (cancelled) return;
      setUsers(rows.map((u) => ({ id: u.id, uid: u.uid, displayName: u.displayName })));
      setSelectedUserId((prev) => prev || rows[0]?.uid || '');
    })();
    return () => {
      cancelled = true;
    };
  }, [activeHouseId]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeHouseId) return;
      const s = await listSectors(activeHouseId);
      if (cancelled) return;
      setSectors(s.map((x) => ({ id: x.id, name: x.name })));
    })();
    return () => {
      cancelled = true;
    };
  }, [activeHouseId]);

  const selectedSectorIdList = React.useMemo(
    () => Object.entries(selectedSectorIds).filter(([, v]) => v).map(([k]) => k),
    [selectedSectorIds]
  );
  const selectedTasksCount = React.useMemo(
    () => Object.values(selectedTaskIds).filter(Boolean).length,
    [selectedTaskIds]
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeHouseId) return;
      if (selectedSectorIdList.length === 0) {
        setTasks([]);
        setSelectedTaskIds({});
        return;
      }
      const t = await listTasksBySector({ houseId: activeHouseId, sectorIds: selectedSectorIdList });
      if (cancelled) return;
      setTasks(t.map((x) => ({ id: x.id, name: x.name, sectorId: x.sectorId })));
      // Keep selected tasks if still present, drop others
      setSelectedTaskIds((prev) => {
        const next: Record<string, boolean> = {};
        for (const task of t) if (prev[task.id]) next[task.id] = true;
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [activeHouseId, selectedSectorIdList]);

  const onAssign = async () => {
    if (!activeHouseId || !user || !selectedUserId) return;
    setLoading(true);
    try {
      const selectedTasks = tasks.filter((t) => selectedTaskIds[t.id]);
      await assignTasksToUser({
        houseId: activeHouseId,
        userId: selectedUserId,
        createdBy: user.uid,
        period: getCurrentWeekPeriod(),
        tasks: selectedTasks.map((t) => ({ taskId: t.id, sectorId: t.sectorId, name: t.name })),
      });
      showSuccessToast(`Tareas asignadas a ${users.find((u) => u.uid === selectedUserId)?.displayName || selectedUserId}`)
    }
    catch (e) {
      console.error("Error asignando tareas", e);
      showErrorToast("Error asignando tareas. Por favor, intentá de nuevo.");
    }
    finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Asignar' }} />
      <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className="text-lg font-semibold">Asignar tareas</Text>
        {activeHouseRole === 'member' && (
          <Text className="text-sm text-muted-foreground">
            Solo lectura (no tenés permisos para asignar).
          </Text>
        )}

        <View className="mt-4 gap-2">
          <Text className="font-medium">Usuario seleccionado</Text>
          <Input value={userSearch} onChangeText={setUserSearch} placeholder="Buscar usuario…" />
          {users
            .filter((u) => u.displayName.toLowerCase().includes(userSearch.trim().toLowerCase()))
            .map((u) => (
              <Button
                key={u.uid}
                variant={u.uid === selectedUserId ? 'default' : 'secondary'}
                onPress={() => setSelectedUserId(u.uid)}>
                <Text>{u.displayName}</Text>
              </Button>
            ))}
        </View>

        <View className="mt-6 gap-2">
          <Text className="font-medium">Sectores</Text>
          <Input value={sectorSearch} onChangeText={setSectorSearch} placeholder="Buscar sector…" />
          {sectors
            .filter((s) => s.name.toLowerCase().includes(sectorSearch.trim().toLowerCase()))
            .map((s) => (
              <View
                key={s.id}
                className="flex-row items-center justify-between rounded-lg border border-border p-3">
                <Text>{s.name}</Text>
                <Checkbox
                  checked={!!selectedSectorIds[s.id]}
                  onCheckedChange={(v) =>
                    setSelectedSectorIds((prev) => ({ ...prev, [s.id]: !!v }))
                  }
                />
              </View>
            ))}
        </View>

        <View className="mt-6 gap-2">
          <View className='flex gap-2'>
            <Text className="font-medium">Tareas</Text>
            <Input value={taskSearch} onChangeText={setTaskSearch} placeholder="Buscar tarea…" />
            <Button
              onPress={() => {
                // Select all tasks if any unselected, otherwise deselect all
                const allSelected = selectedTasksCount === tasks.length;
                const newSelectedTaskIds: Record<string, boolean> = {};
                for (const t of tasks) newSelectedTaskIds[t.id] = !allSelected;
                setSelectedTaskIds(newSelectedTaskIds);
              }}
              disabled={!canAssign || !activeHouseId || !user || !selectedUserId || loading}>
              <Text>{loading ? 'Asignando…' : selectedTasksCount === tasks.length ? 'Deseleccionar todas' : `Seccionar todas (${tasks.length})`}</Text>
            </Button>
          </View>


          {tasks.length === 0 ? (
            <Text className="text-sm text-muted-foreground">Seleccioná sectores para ver tareas.</Text>
          ) : (
            tasks
              .filter((t) => t.name.toLowerCase().includes(taskSearch.trim().toLowerCase()))
              .map((t) => (
                <View
                  key={t.id}
                  className="flex-row items-center justify-between rounded-lg border border-border p-3">
                  <View className="flex-1">
                    <Text>{t.name}</Text>
                    <Text className="text-xs text-muted-foreground">
                      {sectors.find((s) => s.id === t.sectorId)?.name ?? t.sectorId}
                    </Text>
                  </View>
                  <Checkbox
                    checked={!!selectedTaskIds[t.id]}
                    onCheckedChange={(v) =>
                      setSelectedTaskIds((prev) => ({ ...prev, [t.id]: !!v }))
                    }
                  />
                </View>
              ))
          )}
        </View>

        <View className="mt-6">
          <Button
            onPress={onAssign}
            disabled={!canAssign || !activeHouseId || !user || !selectedUserId || loading || selectedTasksCount === 0}>
            <Text>{loading ? 'Asignando…' : `Asignar (${selectedTasksCount})`}</Text>
          </Button>
        </View>
      </ScrollView>
    </>
  );
}

