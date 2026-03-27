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
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { updateExpoPushToken } from '@/services/users';
import { useTabStore } from '@/stores/tabStore';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {

  const { colorScheme } = useColorScheme();
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const { updateAvailable, downloadAndReload } = useExpoUpdates();
  const prevTabTitle = useTabStore((s) => s.prevTabTitle);
  const actualTabTitle = useTabStore((s) => s.actualTabTitle);
  const [showUpdateAlert, setShowUpdateAlert] = React.useState(false);
  const [expoPushToken, setExpoPushToken] = React.useState('');
  const [channels, setChannels] = React.useState<Notifications.NotificationChannel[]>([]);
  const [notification, setNotification] = React.useState<Notifications.Notification | undefined>(
    undefined
  );
  const myUser = useAuthStore(s => s.myUser);
  const activeHouseId = useAuthStore(s => s.activeHouseId);

  React.useEffect(() => bootstrap(), [bootstrap]);

  React.useEffect(() => {
    if (updateAvailable) {
      setShowUpdateAlert(true);
    }
  }, [updateAvailable]);

  React.useEffect(() => {

    if (Platform.OS === 'android') {
      Notifications.getNotificationChannelsAsync().then(value => setChannels(value ?? []));
    }
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  React.useEffect(() => {
    if (myUser && activeHouseId) {
      registerForPushNotificationsAsync(activeHouseId, myUser.uid)
    }
  }, [myUser, activeHouseId])

  async function registerForPushNotificationsAsync(houseId: string, uid: string) {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('myNotificationChannel', {
        name: 'A channel is needed for the permissions prompt to appear',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notification!');
        return;
      }
      // Learn more about projectId:
      // https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
      // EAS projectId is used here.
      try {
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (!projectId) {
          throw new Error('Project ID not found');
        }
        token = (
          await Notifications.getExpoPushTokenAsync({
            projectId,
          })
        ).data;
        console.log("ExpoPushToken seteado");
        console.log(token);
        updateExpoPushToken(houseId, uid, token);

      } catch (e) {
        token = `${e}`;
      }
    } else {
      alert('Must use physical device for Push Notifications');
    }

    return token;
  }

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
            <Stack.Screen name="(app)" options={{ headerShown: true, title: actualTabTitle }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false, title: prevTabTitle }} />
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
