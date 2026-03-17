import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { createHouse } from '@/services/houses';
import { createUserAccount, addUserToHouse } from '@/services/users';
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

  React.useEffect(() => {
    if (user) router.replace('/(app)');
  }, [user]);

  const onRegister = async () => {
    setLoading(true);
    try {
      const { uid } = await createUserAccount({
        email,
        password,
        displayName,
      });

      // Create first house for this user and add them to it.
      const { houseId } = await createHouse({
        name: houseName.trim() || 'Mi casa',
        ownerUid: uid,
      });

      await addUserToHouse({
        houseId,
        uid,
        displayName: displayName.trim() || 'Owner',
        role: 'owner',
      });

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
        <View className="gap-2">
          <Text className="text-sm text-muted-foreground">Nombre de la casa</Text>
          <Input value={houseName} onChangeText={setHouseName} />
        </View>
        <View className="gap-2">
          <Text className="text-sm text-muted-foreground">Email</Text>
          <Input value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
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

