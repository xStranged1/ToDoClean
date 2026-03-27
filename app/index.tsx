import * as React from 'react';
import { Stack, router } from 'expo-router';

import { useAuthStore } from '@/stores/authStore';

export default function Screen() {
  const user = useAuthStore((s) => s.user);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);

  React.useEffect(() => {
    if (isBootstrapping) return;
    router.replace(user ? '/(tabs)' : '/(auth)/login');
  }, [user, isBootstrapping]);

  return <Stack.Screen options={{ title: 'Loading…' }} />;
}
