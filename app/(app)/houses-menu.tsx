import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAuthStore } from '@/stores/authStore';
import { Link, Stack } from 'expo-router';
import { View } from 'react-native';

export default function HousesMenuScreen() {
  const houses = useAuthStore((s) => s.houses);
  const activeHouseId = useAuthStore((s) => s.activeHouseId);
  const setActiveHouseId = useAuthStore((s) => s.setActiveHouseId);

  return (
    <>
      <Stack.Screen options={{ title: 'Casas' }} />
      <View className="flex-1 gap-4 p-6">
        <View className="gap-2 rounded-lg border border-border p-3">
          <Text className="font-medium">Tus casas</Text>
          {houses.length === 0 ? (
            <Text className="text-sm text-muted-foreground">No tenes casas disponibles.</Text>
          ) : (
            houses.map((house) => (
              <Button
                key={house.id}
                variant={house.id === activeHouseId ? 'default' : 'secondary'}
                onPress={() => setActiveHouseId(house.id)}>
                <Text>{house.name}</Text>
              </Button>
            ))
          )}
        </View>

        <Link href="/join" asChild>
          <Button variant="secondary">
            <Text>Unirme a una nueva</Text>
          </Button>
        </Link>
      </View>
    </>
  );
}
