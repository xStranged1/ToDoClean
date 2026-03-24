import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { auth } from '@/services/firebase';
import { useAuthStore } from '@/stores/authStore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Link, router, Stack } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const user = useAuthStore((s) => s.user);

  React.useEffect(() => {
    if (user) router.replace('/(app)/(tabs)');
  }, [user]);

  const onLogin = async () => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Login' }} />
      <View className="flex-1 justify-center gap-4 p-6">
        <Text className="text-2xl font-semibold">Iniciar sesión</Text>
        <View className="gap-2">
          <Text className="text-sm text-muted-foreground">Email</Text>
          <Input value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        </View>
        <View className="gap-2">
          <Text className="text-sm text-muted-foreground">Contraseña</Text>
          <Input value={password} onChangeText={setPassword} secureTextEntry />
        </View>
        <Button onPress={onLogin} disabled={loading}>
          <Text>{loading ? 'Ingresando…' : 'Ingresar'}</Text>
        </Button>
        <Link href="/(auth)/register" asChild>
          <Button variant="ghost">
            <Text>Crear cuenta</Text>
          </Button>
        </Link>
        <Link href="/join" asChild>
          <Button variant="ghost">
            <Text>Unirse</Text>
          </Button>
        </Link>
      </View>
    </>
  );
}

