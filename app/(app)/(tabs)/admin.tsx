import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAuthStore } from '@/stores/authStore';
import { Stack } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';
import * as Clipboard from 'expo-clipboard';

export default function AdminMenuScreen() {
  const activeHouseId = useAuthStore((s) => s.activeHouseId);
  const houses = useAuthStore((s) => s.houses);
  const activeHouse = houses.find((h) => h.id === activeHouseId);
  const inviteLink = activeHouse?.code ? `appLimpieza://join?code=${activeHouse.code}` : null;
  const [copied, setCopied] = React.useState(false);

  return (
    <>
      <Stack.Screen options={{ title: 'Admin' }} />
      <View className="flex-1 gap-4 p-6">
        <Text className="text-muted-foreground">Menu admin (placeholder)</Text>

        {!!inviteLink && (
          <View className="gap-2 rounded-lg border border-border p-3">
            <Text className="font-medium">Invitar por link (oculto)</Text>
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
      </View>
    </>
  );
}

