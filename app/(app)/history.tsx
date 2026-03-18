import { Text } from '@/components/ui/text';
import {
  getAssignmentsForHouse,
  getWeeklyHistory,
} from '@/services/assignments';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { listUsersForHouse } from '@/services/users';
import { useAuthStore } from '@/stores/authStore';
import { Stack } from 'expo-router';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

export default function HistoryScreen() {
  const activeHouseId = useAuthStore((s) => s.activeHouseId);
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.activeHouseRole);
  const isAdmin = role === 'owner' || role === 'admin';

  const [users, setUsers] = React.useState<{ uid: string; displayName: string }[]>([]);
  const [selectedUid, setSelectedUid] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<
    { id: string; userId: string; tasksCount: number; verifiedCount: number; completedCount: number }[]
  >([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeHouseId || !user) return;
      if (!isAdmin) return;
      const u = await listUsersForHouse(activeHouseId);
      if (cancelled) return;
      const mapped = u.map((x) => ({ uid: x.uid, displayName: x.displayName }));
      setUsers(mapped);
      setSelectedUid((prev) => prev ?? user.uid);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeHouseId, user, isAdmin]);

  const refresh = React.useCallback(async () => {
    if (!activeHouseId || !user) return;

    const targetUid = isAdmin ? selectedUid ?? user.uid : user.uid;
    const history = await getWeeklyHistory({ houseId: activeHouseId, userId: targetUid, limit: 12 });

    setRows(
      history.map((a) => {
        const statuses = Object.values(a.statusByTask ?? {});
        const verifiedCount = statuses.filter((s) => s === 'verified').length;
        const completedCount = statuses.filter((s) => s === 'completed').length;
        return {
          id: a.id,
          userId: a.userId,
          tasksCount: a.tasks.length,
          verifiedCount,
          completedCount,
        };
      })
    );
  }, [activeHouseId, user, isAdmin, selectedUid]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <>
      <Stack.Screen options={{ title: 'Historial' }} />
      <ScrollView className="flex-1 p-6">
        {!activeHouseId || !user ? (
          <Text>Iniciá sesión y seleccioná una casa.</Text>
        ) : (
          <View className="gap-2">
            {isAdmin && (
              <View className="gap-2 rounded-lg border border-border p-3">
                <Text className="font-medium">Filtrar por usuario</Text>
                {users.map((u) => (
                  <Button
                    key={u.uid}
                    variant={u.uid === (selectedUid ?? user.uid) ? 'default' : 'secondary'}
                    onPress={() => setSelectedUid(u.uid)}>
                    <Text>{u.displayName}</Text>
                  </Button>
                ))}
              </View>
            )}

            {rows.map((r) => (
              <View key={r.id} className="rounded-lg border border-border p-3">
                <Text className="font-medium">Semana #{r.id.slice(0, 6)}</Text>
                <Text className="text-sm text-muted-foreground">
                  {r.tasksCount} tareas · {r.completedCount} completadas · {r.verifiedCount} verificadas
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}

