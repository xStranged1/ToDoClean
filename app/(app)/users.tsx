// users.tsx
import { Text } from '@/components/ui/text';
import { listUsersForHouse, setUserInHome } from '@/services/users';
import { getAssignmentsForHouse } from '@/services/assignments';
import { listSectors } from '@/services/sectors';
import { useAuthStore } from '@/stores/authStore';
import { router, Stack } from 'expo-router';
import * as React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { UserRow } from '@/components/domain/UserRow';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Assignment } from '@/services/types';
import { showErrorToast } from '@/lib/toast';
import { useTabStore } from '@/stores/tabStore';

type EnrichedUser = {
  id: string;
  uid: string;
  displayName: string;
  inHome: boolean;
  role: string;
  canControl: boolean;
  sectors: string[];
  state: 'active' | 'completed' | 'finished' | 'none';
};

function deriveState(assignment: Assignment | undefined): EnrichedUser['state'] {
  if (!assignment || !assignment.tasks || assignment.tasks.length === 0) return 'none';

  const statuses = Object.values(assignment.statusByTask ?? {});
  if (statuses.length === 0) return 'active';

  const allDone = statuses.every((s) => s === 'completed' || s === 'verified');
  if (allDone) return 'finished';

  const someDone = statuses.some((s) => s === 'completed' || s === 'verified');
  return someDone ? 'completed' : 'active';
}

export default function UsersScreen() {
  const activeHouseId = useAuthStore((s) => s.activeHouseId);
  const currentUid = useAuthStore((s) => s.user?.uid);

  const [rows, setRows] = React.useState<EnrichedUser[]>([]);
  const [currentUserCanControl, setCurrentUserCanControl] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    useTabStore.getState().setActualTabTitle('Usuarios');
  }, [])

  const load = React.useCallback(async () => {
    if (!activeHouseId) return;
    setLoading(true);
    try {
      const [users, assignments, sectors] = await Promise.all([
        listUsersForHouse(activeHouseId),
        getAssignmentsForHouse({ houseId: activeHouseId, periodType: 'week' }),
        listSectors(activeHouseId),
      ]);

      const sectorNameMap = new Map(sectors.map((s) => [s.id, s.name]));

      const latestAssignmentByUser = new Map<string, Assignment>();
      for (const a of assignments) {
        if (!latestAssignmentByUser.has(a.userId)) {
          latestAssignmentByUser.set(a.userId, a);
        }
      }

      const mapped: EnrichedUser[] = users.map((u) => {
        const assignment = latestAssignmentByUser.get(u.uid);
        const sectorIds = [
          ...new Set((assignment?.tasks ?? []).map((t) => t.sectorId).filter(Boolean)),
        ];
        const sectorNames = sectorIds.map((id) => sectorNameMap.get(id) ?? id);

        return {
          id: u.id,
          uid: u.uid,
          displayName: u.displayName,
          inHome: u.inHome,
          role: u.role,
          canControl: u.canControl ?? false,
          sectors: sectorNames,
          state: deriveState(assignment),
        };
      });

      const me = mapped.find((u) => u.uid === currentUid);
      setCurrentUserCanControl(me?.canControl ?? false);
      setRows(mapped);
    } finally {
      setLoading(false);
    }
  }, [activeHouseId, currentUid]);

  React.useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const handleLongPress = async (user: EnrichedUser) => {
    if (!activeHouseId || !currentUserCanControl) return;
    const nextValue = !user.inHome;

    setRows((prev) =>
      prev.map((r) => (r.uid === user.uid ? { ...r, inHome: nextValue } : r))
    );

    try {
      await setUserInHome({ houseId: activeHouseId, uid: user.uid, inHome: nextValue });
    } catch {
      setRows((prev) =>
        prev.map((r) => (r.uid === user.uid ? { ...r, inHome: !nextValue } : r))
      );
      showErrorToast('Error', 'No se pudo actualizar el estado.');
    }
  };

  const inHome = rows.filter((u) => u.inHome);
  const outHome = rows.filter((u) => !u.inHome);

  return (
    <>
      <ScrollView
        className="flex-1 p-6"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <SafeAreaView>
          {!activeHouseId ? (
            <Text className="text-muted-foreground">Seleccioná una casa.</Text>
          ) : loading ? (
            <Text className="text-muted-foreground">Cargando...</Text>
          ) : (
            <View className="gap-6">
              <Section
                title={inHome.length > 0 ? 'En casa' : 'Nadie en casa'}
                users={inHome}
                currentUserCanControl={currentUserCanControl}
                onPress={(u) =>
                  router.push({
                    pathname: '/(tabs)',
                    params: { selectedUserId: u.uid },
                  })
                }
                onLongPress={handleLongPress}
              />
              <Section
                title={outHome.length > 0 ? 'Fuera de casa' : 'Todos en casa'}
                users={outHome}
                currentUserCanControl={currentUserCanControl}
                onPress={(u) =>
                  router.push({
                    pathname: '/(tabs)',
                    params: { selectedUserId: u.uid },
                  })
                }
                onLongPress={handleLongPress}
              />
            </View>
          )}
        </SafeAreaView>
      </ScrollView>
    </>
  );
}

function Section({
  title,
  users,
  currentUserCanControl,
  onPress,
  onLongPress,
}: {
  title: string;
  users: EnrichedUser[];
  currentUserCanControl: boolean;
  onPress: (u: EnrichedUser) => void;
  onLongPress: (u: EnrichedUser) => void;
}) {
  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </Text>
      {users.length === 0 ? (
        <Text className="text-sm text-muted-foreground italic">—</Text>
      ) : (
        users.map((u) => (
          <UserRow
            key={u.id}
            name={u.displayName}
            inHome={u.inHome}
            role={u.role}
            canControl={u.canControl}
            state={u.state}
            sectors={u.sectors}
            onPress={() => onPress(u)}
            onLongPress={currentUserCanControl ? () => onLongPress(u) : undefined}
          />
        ))
      )}
    </View>
  );
}