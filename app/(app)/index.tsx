import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAuthStore } from '@/stores/authStore';
import { signOut } from 'firebase/auth';
import { Link, Stack } from 'expo-router';
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { auth } from '@/services/firebase';

export default function HomeScreen() {
  const activeHouseId = useAuthStore((s) => s.activeHouseId);
  const houses = useAuthStore((s) => s.houses);
  const activeHouse = houses.find((h) => h.id === activeHouseId);
  const [copied, setCopied] = React.useState(false);

  const inviteLink = activeHouse?.code ? `appLimpieza://join?code=${activeHouse.code}` : null;

  return (
    <>
      <Stack.Screen options={{ title: 'Limpieza' }} />
      <ScrollView>
        <View className="flex-1 gap-4 p-6 bg-background">
          <Text className="text-xl font-semibold">Casa actual</Text>
          <Text className="text-muted-foreground">
            {activeHouseId ? houses.find((h) => h.id === activeHouseId)?.name ?? activeHouseId : 'Sin casa seleccionada'}
          </Text>

          {!!inviteLink && (
            <View className="gap-2 rounded-lg border border-border p-3">
              <Text className="font-medium">Invitar por link</Text>
              <Text className="text-sm text-muted-foreground">{inviteLink}</Text>
              <Button
                variant="secondary"
                onPress={async () => {
                  await Clipboard.setStringAsync(inviteLink);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                }}>
                <Text>{copied ? 'Copiado' : 'Copiar link'}</Text>
              </Button>
            </View>
          )}

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
      </ScrollView>
    </>
  );
}

