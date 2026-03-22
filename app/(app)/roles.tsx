import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { setUserRole } from '@/services/houses';
import { listUsersForHouse } from '@/services/users';
import { useAuthStore } from '@/stores/authStore';
import { Stack } from 'expo-router';
import * as React from 'react';
import { Alert, ScrollView, View } from 'react-native';
import type { HouseRole } from '@/services/types';

type UserRow = {
  id: string;
  uid: string;
  displayName: string;
  role: HouseRole;
  canControl: boolean;
};

const ROLE_LABELS: Record<HouseRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Miembro',
};

export default function RolesScreen() {
  const activeHouseId = useAuthStore((s) => s.activeHouseId);
  const currentUserUid = useAuthStore((s) => s.user?.uid);
  const activeHouseRole = useAuthStore((s) => s.activeHouseRole);
  const isOwner = activeHouseRole === 'owner';

  const [rows, setRows] = React.useState<UserRow[]>([]);
  const [loading, setLoading] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!activeHouseId) return;
    const users = await listUsersForHouse(activeHouseId);
    setRows(
      users.map((u) => ({
        id: u.id,
        uid: u.uid,
        displayName: u.displayName,
        role: u.role as HouseRole,
        canControl: u.canControl,
      }))
    );
  }, [activeHouseId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const changeRole = async (user: UserRow, newRole: HouseRole) => {
    if (!activeHouseId) return;
    if (user.uid === currentUserUid) {
      Alert.alert('No podés cambiar tu propio rol.');
      return;
    }
    if (user.role === 'owner') {
      Alert.alert('No se puede cambiar el rol del owner.');
      return;
    }

    const label = ROLE_LABELS[newRole];
    Alert.alert(
      'Cambiar rol',
      `¿Asignar "${label}" a ${user.displayName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setLoading(true);
            try {
              await setUserRole({ houseId: activeHouseId, uid: user.uid, role: newRole });
              await refresh();
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Roles' }} />
      <ScrollView className="flex-1 p-6">
        {!isOwner && (
          <Text className="mb-4 text-sm text-muted-foreground">
            Solo el owner puede modificar roles.
          </Text>
        )}

        <View className="gap-3">
          {rows.map((u) => {
            const isSelf = u.uid === currentUserUid;
            const isProtected = u.role === 'owner' || isSelf;

            return (
              <View
                key={u.uid}
                className="rounded-lg border border-border p-3 gap-2">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="font-medium">{u.displayName}</Text>
                    <Text className="text-xs text-muted-foreground">
                      {ROLE_LABELS[u.role]}{isSelf ? ' · vos' : ''}
                    </Text>
                  </View>

                  {isOwner && !isProtected && (
                    <View className="flex-row gap-2">
                      <Button
                        size="sm"
                        variant={u.role === 'admin' ? 'default' : 'secondary'}
                        disabled={loading || u.role === 'admin'}
                        onPress={() => changeRole(u, 'admin')}>
                        <Text>Admin</Text>
                      </Button>
                      <Button
                        size="sm"
                        variant={u.role === 'member' ? 'default' : 'secondary'}
                        disabled={loading || u.role === 'member'}
                        onPress={() => changeRole(u, 'member')}>
                        <Text>Miembro</Text>
                      </Button>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </>
  );
}