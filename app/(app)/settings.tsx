import { Text } from '@/components/ui/text';
import { Stack } from 'expo-router';
import { View } from 'react-native';

export default function SettingsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Configuracion' }} />
      <View className="flex-1 items-center justify-center p-6">
        <Text>Pantalla placeholder: configuracion.</Text>
      </View>
    </>
  );
}
