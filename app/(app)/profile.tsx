import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/lib/useColorScheme';
import { auth } from '@/services/firebase';
import { useAuthStore } from '@/stores/authStore';
import { deleteUser } from 'firebase/auth';
import { setDoc, serverTimestamp, getDocs, deleteDoc } from 'firebase/firestore';
import { refs } from '@/services/refs';
import { Stack } from 'expo-router';
import * as React from 'react';
import { ScrollView, View, Switch } from 'react-native';
import { User, Home, Mail, ShieldCheck, Trash2, Camera } from 'lucide-react-native';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import CustomAlert from '@/components/ui/CustomAlert';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const myUser = useAuthStore((s) => s.myUser);
  const activeHouseId = useAuthStore((s) => s.activeHouseId);
  const activeHouseRole = useAuthStore((s) => s.activeHouseRole);
  const houses = useAuthStore((s) => s.houses);
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const iconColor = colorScheme === 'dark' ? '#fff' : '#000';
  const [displayName, setDisplayName] = React.useState(myUser?.displayName ?? '');
  const [savingName, setSavingName] = React.useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  // Reflect store updates
  React.useEffect(() => {
    if (myUser?.displayName) setDisplayName(myUser.displayName);
  }, [myUser?.displayName]);

  // inHome status from houseUser — read-only
  const [inHome, setInHome] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeHouseId || !user) return;
      const { getHouseUser } = await import('@/services/users');
      const hu = await getHouseUser(activeHouseId, user.uid);
      if (!cancelled) setInHome(hu?.inHome ?? null);
    })();
    return () => { cancelled = true; };
  }, [activeHouseId, user]);

  const onSaveName = async () => {
    if (!user || !displayName.trim()) return;
    setSavingName(true);
    try {
      const { updateProfile } = await import('firebase/auth');
      await updateProfile(auth.currentUser!, { displayName: displayName.trim() });
      await setDoc(refs.user(user.uid), {
        displayName: displayName.trim(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      if (activeHouseId) {
        await setDoc(refs.houseUser(activeHouseId, user.uid), {
          displayName: displayName.trim(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
      showSuccessToast('Nombre actualizado', 'Tu nombre fue actualizado correctamente.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al actualizar nombre.';
      showErrorToast('Error', msg);
    } finally {
      setSavingName(false);
    }
  };

  const onDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      // Remove from all houses
      const { listHousesForUser } = await import('@/services/houses');
      const userHouses = await listHousesForUser(user.uid);
      await Promise.all(
        userHouses.map(async (h) => {
          await deleteDoc(refs.houseUser(h.id, user.uid));
          await deleteDoc(refs.membership(user.uid, h.id));
        })
      );
      // Delete global profile
      await deleteDoc(refs.user(user.uid));
      // Delete Firebase Auth account
      await deleteUser(auth.currentUser!);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al eliminar cuenta.';
      showErrorToast('Error', msg);
    } finally {
      setDeleting(false);
      setShowDeleteAlert(false);
    }
  };

  const activeHouseName = houses.find((h) => h.id === activeHouseId)?.name ?? '—';

  return (
    <>
      <Stack.Screen options={{ title: 'Perfil' }} />

      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="gap-6 p-6">

          {/* Avatar placeholder
          <View className="items-center gap-3">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-muted border border-border">
              <User size={40} color={iconColor} strokeWidth={1.5} />
            </View>
            <View className="flex-row items-center gap-1.5 opacity-50">
              <Camera size={13} color={iconColor} />
              <Text className="text-xs text-muted-foreground">Foto de perfil — próximamente</Text>
            </View>
          </View> */}

          {/* Nombre */}
          <View className="gap-3 rounded-xl border border-border p-4">
            <View className="flex-row items-center gap-2">
              <User size={16} color={iconColor} />
              <Text className="font-semibold">Nombre</Text>
            </View>
            <Input
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Tu nombre"
            />
            <Button
              onPress={onSaveName}
              disabled={savingName || !displayName.trim() || displayName.trim() === myUser?.displayName}
            >
              <Text>{savingName ? 'Guardando…' : 'Guardar nombre'}</Text>
            </Button>
          </View>

          {/* Email (read-only) */}
          <View className="gap-3 rounded-xl border border-border p-4">
            <View className="flex-row items-center gap-2">
              <Mail size={16} color={iconColor} />
              <Text className="font-semibold">Email</Text>
            </View>
            <Text className="text-muted-foreground">{user?.email ?? '—'}</Text>
          </View>

          {/* Casa y estado */}
          <View className="gap-3 rounded-xl border border-border p-4">
            <View className="flex-row items-center gap-2">
              <Home size={16} color={iconColor} />
              <Text className="font-semibold">Casa activa</Text>
            </View>
            <Text className="text-muted-foreground">{activeHouseName}</Text>

            <View className="flex-row items-center gap-2">
              <ShieldCheck size={16} color={iconColor} />
              <Text className="font-semibold">Rol</Text>
            </View>
            <Text className="text-muted-foreground capitalize">{activeHouseRole ?? '—'}</Text>

            <View className="flex-row items-center gap-2">
              <Home size={16} color={iconColor} />
              <Text className="font-semibold">¿Estás en casa?</Text>
            </View>
            {inHome === null ? (
              <Text className="text-muted-foreground text-sm">Cargando…</Text>
            ) : (
              <View className="flex-row items-center gap-2">
                <View className={`h-2.5 w-2.5 rounded-full ${inHome ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                <Text className="text-muted-foreground">
                  {inHome ? 'En casa' : 'Fuera de casa'}
                </Text>
              </View>
            )}
            <Text className="text-xs text-muted-foreground opacity-60">
              Este estado solo lo puede cambiar un administrador de la casa.
            </Text>
          </View>

          {/* Modo oscuro */}
          <View className="gap-3 rounded-xl border border-border p-4">
            <Text className="font-semibold">Apariencia</Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-muted-foreground">Modo oscuro</Text>
              <Switch
                value={isDark}
                onValueChange={toggleColorScheme}
              />
            </View>
          </View>

          {/* Eliminar cuenta */}
          <View className="gap-3 rounded-xl border border-destructive/40 p-4">
            <Text className="font-semibold text-destructive">Zona de peligro</Text>
            <Text className="text-sm text-muted-foreground">
              Eliminar tu cuenta es permanente. Serás removido de todas tus casas.
            </Text>
            <Button
              variant="destructive"
              onPress={() => setShowDeleteAlert(true)}
              disabled={deleting}
            >
              <View className="flex-row items-center gap-2">
                <Trash2 size={16} color={`${colorScheme == 'dark' ? '#fff' : '000'} `} />
                <Text className="text-destructive-foreground">
                  {deleting ? 'Eliminando…' : 'Eliminar cuenta'}
                </Text>
              </View>
            </Button>
          </View>

        </View>
      </ScrollView>

      <CustomAlert
        open={showDeleteAlert}
        onOpenChange={setShowDeleteAlert}
        title="¿Eliminar cuenta?"
        description="Esta acción es permanente. Se eliminarán todos tus datos y serás removido de todas las casas. No se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={onDeleteAccount}
        onCancel={() => setShowDeleteAlert(false)}
      />
    </>
  );
}