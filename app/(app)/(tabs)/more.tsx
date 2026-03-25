import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { auth } from '@/services/firebase';
import { Link, Stack } from 'expo-router';
import { signOut } from 'firebase/auth';
import { View } from 'react-native';

export default function MoreScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Mas' }} />
      <View className="flex-1 gap-4 p-6 mt-8">
        <View className="gap-2">
          <Link href="/(app)/tasks" asChild>
            <Button variant="secondary">
              <Text>Tareas</Text>
            </Button>
          </Link>

          <Link href="/(app)/sectors" asChild>
            <Button variant="secondary">
              <Text>Sectores</Text>
            </Button>
          </Link>

          <Link href="/(app)/profile" asChild>
            <Button variant="secondary">
              <Text>Perfil</Text>
            </Button>
          </Link>

          <Link href="/(app)/history" asChild>
            <Button variant="secondary">
              <Text>Historial</Text>
            </Button>
          </Link>

          <Link href="/(app)/settings" asChild>
            <Button variant="secondary">
              <Text>Configuracion</Text>
            </Button>
          </Link>
        </View>

        <View className="gap-2">
          <Link href="/(app)/houses-menu" asChild>
            <Button variant="secondary">
              <Text>Casas y unirme</Text>
            </Button>
          </Link>

          <Button variant="ghost" onPress={() => signOut(auth)}>
            <Text>Cerrar sesion</Text>
          </Button>
        </View>
      </View>
    </>
  );
}
