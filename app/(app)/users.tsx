import { Text } from '@/components/ui/text';
import { listUsersForHouse } from '@/services/users';
import { useAuthStore } from '@/stores/authStore';
import { Stack } from 'expo-router';
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { UserRow } from '@/components/domain/UserRow';

export default function UsersScreen() {
  const activeHouseId = useAuthStore((s) => s.activeHouseId);
  const [rows, setRows] = React.useState<{ id: string; displayName: string; inHome: boolean; role: string }[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeHouseId) return;
      const users = await listUsersForHouse(activeHouseId);
      if (cancelled) return;
      setRows(users.map((u) => ({ id: u.id, displayName: u.displayName, inHome: u.inHome, role: u.role })));
    })();
    return () => {
      cancelled = true;
    };
  }, [activeHouseId]);

  return (
    <>
      <Stack.Screen options={{ title: 'Usuarios' }} />
      <ScrollView className="flex-1 p-6">
        {!activeHouseId ? (
          <Text>Seleccioná una casa.</Text>
        ) : (
          <View className="gap-2">
            {rows.map((u) => (
              <UserRow
                key={u.id}
                name={u.displayName}
                subtitle={`${u.inHome ? 'En casa' : 'Fuera de casa'} · ${u.role}`}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}

