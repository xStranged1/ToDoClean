import { Text } from '@/components/ui/text';
import { Stack } from 'expo-router';
import { View } from 'react-native';

export default function SectorPriorityScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Prioridad de sectores' }} />
      <View className="flex-1 items-center justify-center p-6">
        <Text>Pantalla placeholder: prioridad de sectores.</Text>
      </View>
    </>
  );
}
