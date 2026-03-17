import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { getHouseIdByCode } from '@/services/houses';
import { joinHouseByCode } from '@/services/users';
import { useAuthStore } from '@/stores/authStore';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

export default function JoinHouseScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const user = useAuthStore((s) => s.user);
  const setPendingJoinCode = useAuthStore((s) => s.setPendingJoinCode);
  const refreshHouses = useAuthStore((s) => s.refreshHouses);

  const normalizedParam = String(code ?? '').trim().toUpperCase();
  const [textCode, setTextCode] = React.useState<string>(normalizedParam ?? '');
  const [status, setStatus] = React.useState<'idle' | 'checking' | 'invalid' | 'joining'>(
    normalizedParam ? 'checking' : 'idle'
  );

  const handleJoin = async (inputCode: string) => {
    const normalized = inputCode.trim().toUpperCase();
    if (!normalized) return;

    setStatus('checking');

    const houseId = await getHouseIdByCode(normalized);
    if (!houseId) {
      setStatus('invalid');
      return;
    }

    if (!user) {
      setPendingJoinCode(normalized);
      router.replace('/(auth)/register');
      return;
    }

    setStatus('joining');
    await joinHouseByCode({
      code: normalized,
      uid: user.uid,
      displayName: user.displayName ?? 'Usuario',
    });

    await refreshHouses();
    router.replace('/(app)');
  };

  // 👉 Auto-join solo si viene por parámetro
  React.useEffect(() => {
    if (normalizedParam) {
      handleJoin(normalizedParam);
    }
  }, [normalizedParam]);

  return (
    <>
      <Stack.Screen options={{ title: 'Unirse a casa' }} />
      <View className="flex-1 justify-center gap-4 p-6">
        <Text className="text-xl font-semibold">Unirse a una casa</Text>

        <Input
          className="text-muted-foreground"
          value={textCode}
          onChangeText={setTextCode}
          placeholder="Ingresa el código"
        />

        {status === 'invalid' && (
          <Text className="text-destructive">El código no es válido.</Text>
        )}
        {status === 'checking' && <Text>Validando…</Text>}
        {status === 'joining' && <Text>Uniéndote…</Text>}

        {/* ✅ Botón para join manual */}
        <Button onPress={() => handleJoin(textCode)}>
          <Text>Unirse</Text>
        </Button>

        {status === 'invalid' && (
          <Button variant="secondary" onPress={() => router.replace('/(auth)/login')}>
            <Text>Ir a login</Text>
          </Button>
        )}
      </View>
    </>
  );
}
