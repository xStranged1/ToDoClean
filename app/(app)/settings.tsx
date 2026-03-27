import { Text } from '@/components/ui/text';
import { useTabStore } from '@/stores/tabStore';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

export default function SettingsScreen() {
  useEffect(() => {
    useTabStore.getState().setActualTabTitle('Configuracion');
  }, [])

  return (
    <>
      <View className="flex-1 items-center justify-center p-6">
        <Text>Pantalla placeholder: configuracion.</Text>
      </View>
    </>
  );
}
