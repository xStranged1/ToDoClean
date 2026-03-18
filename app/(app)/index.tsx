import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { getCurrentWeekAssignmentsForUser } from '@/services/weekly';
import { useAuthStore } from '@/stores/authStore';
import { signOut } from 'firebase/auth';
import { Link, Stack } from 'expo-router';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

import { auth } from '@/services/firebase';
import { TaskItem } from '@/components/domain/TaskItem';

export default function HomeScreen() {
  const activeHouseId = useAuthStore((s) => s.activeHouseId);
  const houses = useAuthStore((s) => s.houses);
  const user = useAuthStore((s) => s.user);
  const [weeklyTasks, setWeeklyTasks] = React.useState<
    { taskId: string; name: string; sectorId: string; status: string }[]
  >([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeHouseId || !user) return;
      const assignments = await getCurrentWeekAssignmentsForUser({ houseId: activeHouseId, userId: user.uid });
      if (cancelled) return;
      const merged: { taskId: string; name: string; sectorId: string; status: string }[] = [];
      for (const a of assignments) {
        for (const t of a.tasks) {
          merged.push({
            taskId: t.taskId,
            name: t.name,
            sectorId: t.sectorId,
            status: (a.statusByTask?.[t.taskId] as string) ?? 'pending',
          });
        }
      }
      setWeeklyTasks(merged);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeHouseId, user]);

  return (
    <>
      <Stack.Screen options={{ title: 'Limpieza' }} />
      <ScrollView>
        <View className="flex-1 gap-4 p-6 bg-background">
          <Text className="text-xl font-semibold">Casa actual</Text>
          <Text className="text-muted-foreground">
            {activeHouseId ? houses.find((h) => h.id === activeHouseId)?.name ?? activeHouseId : 'Sin casa seleccionada'}
          </Text>

          <View className="gap-2">
            <Text className="text-lg font-semibold">Mis tareas (esta semana)</Text>
            {weeklyTasks.length === 0 ? (
              <Text className="text-sm text-muted-foreground">No tenés tareas asignadas esta semana.</Text>
            ) : (
              weeklyTasks.map((t) => (
                <TaskItem
                  key={t.taskId}
                  title={t.name}
                  subtitle={`estado: ${t.status}`}
                  checked={t.status === 'completed' || t.status === 'verified'}
                />
              ))
            )}
          </View>

          <View className="gap-2">
            <Link href="/(app)/sectors" asChild>
              <Button variant="secondary">
                <Text>Sectores</Text>
              </Button>
            </Link>
            <Link href="/(app)/tasks" asChild>
              <Button variant="secondary">
                <Text>Tareas</Text>
              </Button>
            </Link>
            <Link href="/(app)/assign" asChild>
              <Button variant="secondary">
                <Text>Asignar</Text>
              </Button>
            </Link>
            <Link href="/(app)/history" asChild>
              <Button variant="secondary">
                <Text>Historial</Text>
              </Button>
            </Link>
          </View>

          <View className="mt-auto">
            <Button variant="ghost" onPress={() => signOut(auth)}>
              <Text>Cerrar sesión</Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

