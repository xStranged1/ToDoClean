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
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

