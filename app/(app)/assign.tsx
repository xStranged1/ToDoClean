import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { assignTasksToUser, getCurrentWeekPeriod } from '@/services/assignments';
import { listTasks } from '@/services/tasks';
import { listUsersForHouse } from '@/services/users';
import { useAuthStore } from '@/stores/authStore';
import { Stack } from 'expo-router';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

export default function AssignScreen() {
  const activeHouseId = useAuthStore((s) => s.activeHouseId);
  const user = useAuthStore((s) => s.user);
  const [users, setUsers] = React.useState<{ id: string; uid: string; displayName: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);

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

  const onAssignDemo = async () => {
    if (!activeHouseId || !user || !selectedUserId) return;
    setLoading(true);
    try {
      // Minimal demo: assign all tasks from all sectors would require sector selection UI.
      // For now: assign all tasks in the house.
      const tasks = await listTasks(activeHouseId);
      await assignTasksToUser({
        houseId: activeHouseId,
        userId: selectedUserId,
        createdBy: user.uid,
        period: getCurrentWeekPeriod(),
        tasks: tasks.map((t) => ({ taskId: t.id, sectorId: t.sectorId, name: t.name })),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Asignar' }} />
      <ScrollView className="flex-1 p-6">
        <Text className="text-lg font-semibold">Asignar tareas (demo)</Text>
        <Text className="text-sm text-muted-foreground">
          Esta pantalla se completa después con selector de sectores/tareas. Por ahora arma un flujo end-to-end.
        </Text>

        <View className="mt-4 gap-2">
          <Text className="font-medium">Usuario seleccionado</Text>
          {users.map((u) => (
            <Button key={u.uid} variant={u.uid === selectedUserId ? 'default' : 'secondary'} onPress={() => setSelectedUserId(u.uid)}>
              <Text>{u.displayName}</Text>
            </Button>
          ))}
        </View>

        <View className="mt-6">
          <Button onPress={onAssignDemo} disabled={!activeHouseId || !user || !selectedUserId || loading}>
            <Text>{loading ? 'Asignando…' : 'Asignar (demo)'}</Text>
          </Button>
        </View>
      </ScrollView>
    </>
  );
}

