import { Text } from '@/components/ui/text';
import { getWeeklyHistory } from '@/services/assignments';
import { useAuthStore } from '@/stores/authStore';
import { Stack } from 'expo-router';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

export default function HistoryScreen() {
  const activeHouseId = useAuthStore((s) => s.activeHouseId);
  const user = useAuthStore((s) => s.user);
  const [rows, setRows] = React.useState<{ id: string; tasksCount: number }[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeHouseId || !user) return;
      const history = await getWeeklyHistory({ houseId: activeHouseId, userId: user.uid, limit: 12 });
      if (cancelled) return;
      setRows(history.map((a) => ({ id: a.id, tasksCount: a.tasks.length })));
    })();
    return () => {
      cancelled = true;
    };
  }, [activeHouseId, user]);

  return (
    <>
      <Stack.Screen options={{ title: 'Historial' }} />
      <ScrollView className="flex-1 p-6">
        {!activeHouseId || !user ? (
          <Text>Iniciá sesión y seleccioná una casa.</Text>
        ) : (
          <View className="gap-2">
            {rows.map((r) => (
              <View key={r.id} className="rounded-lg border border-border p-3">
                <Text className="font-medium">Semana #{r.id.slice(0, 6)}</Text>
                <Text className="text-sm text-muted-foreground">{r.tasksCount} tareas</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}

