import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { TaskItem } from '@/components/domain/TaskItem';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { getCurrentWeekAssignmentsForUser, updateTaskStatus } from '@/services/assignments';
import { listUsersForHouse } from '@/services/users';
import { useAuthStore } from '@/stores/authStore';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

export default function HomeScreen() {
  const activeHouseId = useAuthStore((s) => s.activeHouseId);
  const houses = useAuthStore((s) => s.houses);
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.activeHouseRole);
  const { selectedUserId: selectedUserIdParam } = useLocalSearchParams<{ selectedUserId?: string }>();
  const [selectedUserId, setSelectedUserId] = React.useState<string | undefined>(undefined);

  const isOwnTasks = !!user && selectedUserId === user.uid;
  const [weeklyTasks, setWeeklyTasks] = React.useState<
    { assignmentId: string; taskId: string; name: string; sectorId: string; status: string }[]
  >([]);
  const [houseUsers, setHouseUsers] = React.useState<{ uid: string; displayName: string }[]>([]);
  const [refreshing, setRefreshing] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!activeHouseId || !user || !selectedUserId) {
      setWeeklyTasks([]);
      return;
    }

    const [assignments, users] = await Promise.all([
      getCurrentWeekAssignmentsForUser({ houseId: activeHouseId, userId: selectedUserId }),
      listUsersForHouse(activeHouseId),
    ]);

    setHouseUsers(users.map((u) => ({ uid: u.uid, displayName: u.displayName })));

    const merged: { assignmentId: string; taskId: string; name: string; sectorId: string; status: string }[] = [];
    for (const a of assignments) {
      for (const t of a.tasks) {
        merged.push({
          assignmentId: a.id,
          taskId: t.taskId,
          name: t.name,
          sectorId: t.sectorId,
          status: (a.statusByTask?.[t.taskId] as string) ?? 'pending',
        });
      }
    }
    setWeeklyTasks(merged);
  }, [activeHouseId, user, selectedUserId]);

  React.useEffect(() => {
    if (typeof selectedUserIdParam === 'string') {
      setSelectedUserId(selectedUserIdParam);
    } else if (!selectedUserId && user?.uid) {
      setSelectedUserId(user.uid);
    }
  }, [selectedUserIdParam, user, selectedUserId]);
  const isAdmin = role === 'owner' || role === 'admin';

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const updateMany = async (taskRows: typeof weeklyTasks, nextStatus: 'completed' | 'verified') => {
    if (!activeHouseId || taskRows.length === 0) return;
    setSubmitting(true);
    try {
      await Promise.all(
        taskRows.map((t) =>
          updateTaskStatus({
            houseId: activeHouseId,
            assignmentId: t.assignmentId,
            taskId: t.taskId,
            newStatus: nextStatus,
          })
        )
      );
      await refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const onToggleTask = async (task: (typeof weeklyTasks)[number], checked: boolean) => {
    if (!activeHouseId) return;
    const nextStatus = checked ? (isOwnTasks ? 'completed' : 'verified') : 'pending';
    setSubmitting(true);
    try {
      await updateTaskStatus({
        houseId: activeHouseId,
        assignmentId: task.assignmentId,
        taskId: task.taskId,
        newStatus: nextStatus,
      });
      await refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const selectedUserName =
    houseUsers.find((u) => u.uid === selectedUserId)?.displayName ?? (isOwnTasks ? 'Mis tareas' : 'Tareas');
  const canVerifyOthers = !!selectedUserId && !isOwnTasks && isAdmin;
  const canCompleteOwn = isOwnTasks;
  const canEditTaskStatus = canCompleteOwn || canVerifyOthers;

  return (
    <>
      <Stack.Screen options={{ title: 'Limpieza' }} />
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View className="flex-1 gap-4 p-6 bg-background mt-4">
          <View className="flex flex-row justify-between mr-2">
            <Text className="text-xl font-semibold">Casa actual</Text>
            <ThemeToggle />
          </View>
          <Text className="text-muted-foreground">
            {activeHouseId ? houses.find((h) => h.id === activeHouseId)?.name ?? activeHouseId : 'Sin casa seleccionada'}
          </Text>

          <View className="gap-2">
            <Text className="text-lg font-semibold">
              {isOwnTasks ? 'Mis tareas (esta semana)' : `Tareas de ${selectedUserName} (esta semana)`}
            </Text>
            {canCompleteOwn && (
              <Button
                variant="secondary"
                disabled={submitting || weeklyTasks.length === 0}
                onPress={() => updateMany(weeklyTasks, 'completed')}>
                <Text>Marcar todas completadas</Text>
              </Button>
            )}
            {canVerifyOthers && (
              <Button
                variant="secondary"
                disabled={submitting || weeklyTasks.length === 0}
                onPress={() => updateMany(weeklyTasks, 'verified')}>
                <Text>Marcar todas controladas</Text>
              </Button>
            )}
            {weeklyTasks.length === 0 ? (
              <Text className="text-sm text-muted-foreground">No tenés tareas asignadas esta semana.</Text>
            ) : (
              weeklyTasks.map((t) => (
                <TaskItem
                  key={`${t.assignmentId}-${t.taskId}`}
                  title={t.name}
                  subtitle={`estado: ${t.status}`}
                  checked={t.status === 'completed' || t.status === 'verified'}
                  checkboxDisabled={!canEditTaskStatus || submitting}
                  onCheckedChange={(checked) => {
                    if (!canEditTaskStatus) return;
                    void onToggleTask(t, checked);
                  }}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

