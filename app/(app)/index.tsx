import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { TaskItem } from '@/components/domain/TaskItem';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  getCurrentWeekAssignmentsForUser,
  updateTaskStatus,
  deleteAssignmentsForUser,
} from '@/services/assignments';
import { listUsersForHouse } from '@/services/users';
import { useAuthStore } from '@/stores/authStore';
import { useTaskStore } from '@/stores/taskStore';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomAlert from '@/components/ui/CustomAlert';
import { getSectorsForHouse } from '@/services/sectors';

type TaskRow = {
  assignmentId: string;
  taskId: string;
  name: string;
  sectorId: string;
  sectorName?: string;
  status: 'pending' | 'completed' | 'verified';
};

function groupBySector(tasks: TaskRow[]): { sectorId: string; sectorName: string; tasks: TaskRow[] }[] {
  const map = new Map<string, { sectorId: string; sectorName: string; tasks: TaskRow[] }>();
  for (const t of tasks) {
    if (!map.has(t.sectorId)) {
      map.set(t.sectorId, {
        sectorId: t.sectorId,
        sectorName: t.sectorName ?? t.sectorId,
        tasks: [],
      });
    }
    map.get(t.sectorId)!.tasks.push(t);
  }
  return Array.from(map.values());
}

export default function HomeScreen() {
  const activeHouseId = useAuthStore((s) => s.activeHouseId);
  const houses = useAuthStore((s) => s.houses);
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.activeHouseRole);
  const { selectedUserId: selectedUserIdParam } = useLocalSearchParams<{ selectedUserId?: string }>();
  const [selectedUserId, setSelectedUserId] = React.useState<string | undefined>(undefined);

  const isOwnTasks = !!user && selectedUserId === user.uid;
  const isAdmin = role === 'owner' || role === 'admin';

  const [weeklyTasks, setWeeklyTasks] = React.useState<TaskRow[]>([]);
  const [houseUsers, setHouseUsers] = React.useState<{ uid: string; displayName: string }[]>([]);
  const [refreshing, setRefreshing] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = React.useState(false);

  const { overrides, setOverride, clearOverride, clearAll } = useTaskStore();

  const refresh = React.useCallback(async () => {
    if (!activeHouseId || !user || !selectedUserId) {
      setWeeklyTasks([]);
      return;
    }

    const [assignments, users, sectors] = await Promise.all([
      getCurrentWeekAssignmentsForUser({ houseId: activeHouseId, userId: selectedUserId }),
      listUsersForHouse(activeHouseId),
      getSectorsForHouse(activeHouseId),
    ]);

    const sectorMap = new Map(sectors.map((s) => [s.id, s.name]));
    setHouseUsers(users.map((u) => ({ uid: u.uid, displayName: u.displayName })));

    const merged: TaskRow[] = [];
    for (const a of assignments) {
      for (const t of a.tasks) {
        merged.push({
          assignmentId: a.id,
          taskId: t.taskId,
          name: t.name,
          sectorId: t.sectorId,
          sectorName: sectorMap.get(t.sectorId) ?? t.sectorId,
          status: ((a.statusByTask?.[t.taskId] as string) ?? 'pending') as TaskRow['status'],
        });
      }
    }
    setWeeklyTasks(merged);
    clearAll();
  }, [activeHouseId, user, selectedUserId, clearAll]);

  React.useEffect(() => {
    if (typeof selectedUserIdParam === 'string') {
      setSelectedUserId(selectedUserIdParam);
    } else if (!selectedUserId && user?.uid) {
      setSelectedUserId(user.uid);
    }
  }, [selectedUserIdParam, user, selectedUserId]);

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

  const updateMany = async (taskRows: TaskRow[], nextStatus: 'completed' | 'verified') => {
    if (!activeHouseId || taskRows.length === 0) return;
    setSubmitting(true);
    taskRows.forEach((t) => setOverride(`${t.assignmentId}-${t.taskId}`, nextStatus));
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
    } catch {
      taskRows.forEach((t) => clearOverride(`${t.assignmentId}-${t.taskId}`));
    } finally {
      setSubmitting(false);
    }
  };

  const onToggleTask = async (task: TaskRow, checked: boolean) => {
    if (!activeHouseId) return;

    const key = `${task.assignmentId}-${task.taskId}`;
    const currentStatus = overrides[key]?.status ?? task.status;

    // Non-admins cannot uncheck a verified task
    if (!checked && currentStatus === 'verified' && !isAdmin) return;

    const nextStatus: TaskRow['status'] = checked
      ? isOwnTasks
        ? 'completed'
        : 'verified'
      : 'pending';

    // Optimistic — instant UI feedback, no waiting
    setOverride(key, nextStatus);

    try {
      await updateTaskStatus({
        houseId: activeHouseId,
        assignmentId: task.assignmentId,
        taskId: task.taskId,
        newStatus: nextStatus,
      });
      setWeeklyTasks((prev) =>
        prev.map((t) =>
          t.assignmentId === task.assignmentId && t.taskId === task.taskId
            ? { ...t, status: nextStatus }
            : t
        )
      );
      clearOverride(key);
    } catch {
      clearOverride(key);
    }
  };

  const onDeleteAllTasks = async () => {
    if (!activeHouseId || !selectedUserId) return;
    setShowDeleteAlert(false);
    setSubmitting(true);
    try {
      await deleteAssignmentsForUser({ houseId: activeHouseId, userId: selectedUserId });
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
  console.log("weeklyTasks[0].sectorName");
  console.log(weeklyTasks[0]);
  console.log(weeklyTasks[0].sectorName);

  const grouped = React.useMemo(() => groupBySector(weeklyTasks), [weeklyTasks]);

  return (
    <>
      <Stack.Screen options={{ title: 'Limpieza' }} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <SafeAreaView>
          <View className="flex-1 gap-4 p-6 bg-background mt-4">
            <View className="flex flex-row justify-between mr-2">
              <Text className="text-xl font-semibold">Casa actual</Text>
              <ThemeToggle />
            </View>
            <Text className="text-muted-foreground">
              {activeHouseId
                ? houses.find((h) => h.id === activeHouseId)?.name ?? activeHouseId
                : 'Sin casa seleccionada'}
            </Text>

            <View className="gap-2">
              <Text className="text-lg font-semibold">
                {isOwnTasks
                  ? 'Mis tareas (esta semana)'
                  : `Tareas de ${selectedUserName} (esta semana)`}
              </Text>

              {canCompleteOwn && (
                <Button
                  variant="secondary"
                  disabled={submitting || weeklyTasks.length === 0}
                  onPress={() => updateMany(weeklyTasks, 'completed')}
                >
                  <Text>Marcar todas completadas</Text>
                </Button>
              )}
              {canVerifyOthers && (
                <Button
                  variant="secondary"
                  disabled={submitting || weeklyTasks.length === 0}
                  onPress={() => updateMany(weeklyTasks, 'verified')}
                >
                  <Text>Marcar todas controladas</Text>
                </Button>
              )}
              {isAdmin && (
                <Button
                  variant="destructive"
                  disabled={submitting || weeklyTasks.length === 0}
                  onPress={() => setShowDeleteAlert(true)}
                >
                  <Text>Eliminar todas las tareas</Text>
                </Button>
              )}

              {weeklyTasks.length === 0 ? (
                <Text className="text-sm text-muted-foreground">
                  No hay tareas asignadas esta semana.
                </Text>
              ) : (
                grouped.map((group) => (
                  <View key={group.sectorId} className="gap-2 mt-4">
                    {/* Sector header */}
                    <View className="flex-row items-center gap-2 mt-2">
                      <Text className="text-sm font-semibold text-foreground capitalize">
                        {group.sectorName}
                      </Text>
                      <View className="flex-1 h-px bg-border" />
                      <Text className="text-xs text-muted-foreground">
                        {group.tasks.length} {group.tasks.length === 1 ? 'tarea' : 'tareas'}
                      </Text>
                    </View>

                    {/* Tasks in this sector */}
                    {group.tasks.map((t) => {
                      const key = `${t.assignmentId}-${t.taskId}`;
                      const effectiveStatus = overrides[key]?.status ?? t.status;
                      const isVerified = effectiveStatus === 'verified';
                      const checkboxDisabled =
                        !canEditTaskStatus || submitting || (!isAdmin && isVerified);

                      return (
                        <TaskItem
                          key={key}
                          title={t.name}
                          status={effectiveStatus}
                          checked={effectiveStatus === 'completed' || effectiveStatus === 'verified'}
                          checkboxDisabled={checkboxDisabled}
                          onCheckedChange={(checked) => {
                            if (!canEditTaskStatus) return;
                            void onToggleTask(t, checked);
                          }}
                        />
                      );
                    })}
                  </View>
                ))
              )}
            </View>
          </View>
        </SafeAreaView>
      </ScrollView>

      <CustomAlert
        open={showDeleteAlert}
        onOpenChange={setShowDeleteAlert}
        title="¿Eliminar todas las tareas?"
        description={`Esta acción eliminará todas las tareas asignadas a ${selectedUserName} esta semana. No se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={onDeleteAllTasks}
        onCancel={() => setShowDeleteAlert(false)}
      />
    </>
  );
}