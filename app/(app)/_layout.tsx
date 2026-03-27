import { Stack, router } from 'expo-router';
import * as React from 'react';

import { useAuthStore } from '@/stores/authStore';

export default function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);

  React.useEffect(() => {
    if (isBootstrapping) return;
    if (!user) router.replace('/(auth)/login');
  }, [user, isBootstrapping]);

  return (
    <Stack>
      <Stack.Screen name="assign" options={{ headerShown: false, title: 'Asignar' }} />
      <Stack.Screen name="history" options={{ headerShown: false, title: 'Historial' }} />
      <Stack.Screen name="houses-menu" options={{ headerShown: false, title: 'Casas' }} />
      <Stack.Screen name="index" options={{ headerShown: false, title: 'Limpieza' }} />
      <Stack.Screen name="pass-week" options={{ headerShown: false, title: 'Pasar semana' }} />
      <Stack.Screen name="profile" options={{ headerShown: false, title: 'Perfil' }} />
      <Stack.Screen name="roles" options={{ headerShown: false, title: 'Roles' }} />
      <Stack.Screen name="sectors" options={{ headerShown: false, title: 'Sectores' }} />
      <Stack.Screen name="settings" options={{ headerShown: false, title: 'Configuracion' }} />
      <Stack.Screen name="tasks" options={{ headerShown: false, title: 'Tareas' }} />
      <Stack.Screen name="users" options={{ headerShown: false, title: 'Usuarios' }} />
    </Stack>
  );
}

