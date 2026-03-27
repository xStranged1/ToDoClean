import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { createHouse } from '@/services/houses';
import { createUserAccount, joinHouseByCode } from '@/services/users';
import { useAuthStore } from '@/stores/authStore';
import { router, Stack } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

export default function RegisterScreen() {
  const [displayName, setDisplayName] = React.useState('');
  const [houseName, setHouseName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const refreshHouses = useAuthStore((s) => s.refreshHouses);
  const user = useAuthStore((s) => s.user);
  const pendingJoinCode = useAuthStore((s) => s.pendingJoinCode);
  const setPendingJoinCode = useAuthStore((s) => s.setPendingJoinCode);

  React.useEffect(() => {
    if (user) router.replace('/(tabs)');

  }, [user]);

  const onRegister = async () => {
    setLoading(true);
    try {
      const { uid } = await createUserAccount({
        email,
        password,
        displayName,
      });

      if (pendingJoinCode) {
        await joinHouseByCode({
          code: pendingJoinCode,
          uid,
          displayName: displayName.trim() || 'Usuario',
        });
        setPendingJoinCode(null);
      } else {
        await createHouse({
          name: houseName.trim() || 'Mi casa',
          ownerUid: uid,
          ownerDisplayName: displayName.trim() || 'Owner',
        });
      }

      await refreshHouses();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Registro' }} />
      <View className="flex-1 justify-center gap-4 p-6">
        <Text className="text-2xl font-semibold">Crear cuenta</Text>
        <View className="gap-2">
          <Text className="text-sm text-muted-foreground">Tu nombre</Text>
          <Input value={displayName} onChangeText={setDisplayName} />
        </View>
        {!pendingJoinCode && (
          <View className="gap-2">
            <Text className="text-sm text-muted-foreground">Nombre de la casa</Text>
            <Input value={houseName} onChangeText={setHouseName} />
          </View>
        )}
        <View className="gap-2">
          <Text className="text-sm text-muted-foreground">Email</Text>
          <Input
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
        <View className="gap-2">
          <Text className="text-sm text-muted-foreground">Contraseña</Text>
          <Input value={password} onChangeText={setPassword} secureTextEntry />
        </View>
        <Button onPress={onRegister} disabled={loading}>
          <Text>{loading ? 'Creando…' : 'Crear cuenta'}</Text>
        </Button>
      </View>
    </>
  );
}