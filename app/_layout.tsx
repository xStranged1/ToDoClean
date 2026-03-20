import '@/global.css';

import { NAV_THEME } from '@/lib/theme';
import { toastRef } from '@/lib/toast';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Toast, ToastProvider } from 'react-native-toast-notifications';
import { useColorScheme } from 'nativewind';
import * as React from 'react';

import { useAuthStore } from '@/stores/authStore';
import { CustomToast } from '@/components/ui/CustomToast';
import CustomAlert from '@/components/ui/CustomAlert';
import { useExpoUpdates } from '@/lib/useExpoUpdates';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export default function RootLayout() {

  const { colorScheme } = useColorScheme();
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const { updateAvailable, downloadAndReload } = useExpoUpdates();
  const [showUpdateAlert, setShowUpdateAlert] = React.useState(false);

  React.useEffect(() => bootstrap(), [bootstrap]);

  React.useEffect(() => {
    if (updateAvailable) {
      setShowUpdateAlert(true);
    }
  }, [updateAvailable]);
  return (
    <>
      <ToastProvider
        ref={toastRef}
        placement="top"
        duration={3000}
        animationType="slide-in"
        swipeEnabled={true}
        offsetTop={50}
        renderToast={(toast) => <CustomToast toast={toast} />}
      >
        <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <Stack>
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
          </Stack>
          <PortalHost />
        </ThemeProvider>
      </ToastProvider>
      <CustomAlert
        open={showUpdateAlert}
        onOpenChange={setShowUpdateAlert}
        title="Actualización disponible"
        description="Hay una nueva versión de la aplicación disponible. ¿Deseas actualizar ahora?"
        confirmLabel="Actualizar"
        cancelLabel="Cancelar"
        onConfirm={downloadAndReload}
        onCancel={() => setShowUpdateAlert(false)}
      />
    </>
  );
}
