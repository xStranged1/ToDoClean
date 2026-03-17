import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAuthStore } from '@/stores/authStore';
import { signOut } from 'firebase/auth';
import { Link, Stack } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

import { auth } from '@/services/firebase';

export default function HomeScreen() {
  const activeHouseId = useAuthStore((s) => s.activeHouseId);
  const houses = useAuthStore((s) => s.houses);

  return (
    <>
      <Stack.Screen options={{ title: 'Limpieza' }} />
      <View className="flex-1 gap-4 p-6 bg-background">
        <Text className="text-xl font-semibold">Casa actual</Text>
        <Text className="text-muted-foreground">
          {activeHouseId ? houses.find((h) => h.id === activeHouseId)?.name ?? activeHouseId : 'Sin casa seleccionada'}
        </Text>

        <View className="gap-2">
          <Link href="/(app)/users" asChild>
            <Button>
              <Text>Usuarios</Text>
            </Button>
          </Link>
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
    </>
  );
}

