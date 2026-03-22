import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAuthStore } from '@/stores/authStore';
import { Link, Stack } from 'expo-router';
import * as React from 'react';
import { Alert, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { doc, getDocs, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { refs } from '@/services/refs';
import { Sector, Task } from '@/services/types';

export default function AdminMenuScreen() {
  const activeHouseId = useAuthStore((s) => s.activeHouseId);
  const houses = useAuthStore((s) => s.houses);
  const activeHouse = houses.find((h) => h.id === activeHouseId);
  const inviteLink = activeHouse?.code ? `appLimpieza://join?code=${activeHouse.code}` : null;
  const [copied, setCopied] = React.useState(false);

  // async function listOldTasks() {
  //   const snap = await getDocs(query(refs.oldTasks()));
  //   const res = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Task) }));
  //   console.log("listOldTasks");
  //   console.log(res);
  //   return res
  // }

  // async function listOldSectors() {
  //   const snap = await getDocs(query(refs.oldSectors()));
  //   const res = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Sector) }));
  //   console.log("listOldSectors");
  //   console.log(res);
  //   return res
  // }

  // async function listTasks() {
  //   const snap = await getDocs(query(refs.tasks(activeHouse?.id)));
  //   const res = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Task) }));
  //   console.log("listTasks");
  //   console.log(res);
  //   return res
  // }

  // async function listSectors() {
  //   const snap = await getDocs(query(refs.sectors(activeHouse?.id)));
  //   const res = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Sector) }));
  //   console.log("listSectors");
  //   console.log(res);
  //   return res
  // }

  // async function migrarTareas() {
  //   // 1. Traer sectores viejos
  //   const oldSectorsSnap = await getDocs(query(refs.oldSectors()));
  //   const oldSectors = oldSectorsSnap.docs.map((d) => ({
  //     id: d.id,
  //     ...(d.data() as Sector),
  //   }));

  //   // 2. Crear sectores nuevos y guardar el mapa nombre -> nuevo ID
  //   const sectorNameToNewId: Record<string, string> = {};

  //   for (const oldSector of oldSectors) {
  //     const newSectorRef = doc(refs.sectors(activeHouseId!));
  //     await setDoc(newSectorRef, {
  //       name: oldSector.sector_name,
  //       description: oldSector.sector_description ?? '',
  //       createdAt: serverTimestamp(),
  //       updatedAt: serverTimestamp(),
  //     });
  //     sectorNameToNewId[oldSector.sector_name] = newSectorRef.id;
  //     console.log(`Sector migrado: ${oldSector.sector_name} -> ${newSectorRef.id}`);
  //   }

  //   // 3. Traer tareas viejas
  //   const oldTasksSnap = await getDocs(query(refs.oldTasks()));
  //   const oldTasks = oldTasksSnap.docs.map((d) => ({
  //     id: d.id,
  //     ...(d.data() as Task),
  //   }));

  //   // 4. Crear tareas nuevas
  //   for (const oldTask of oldTasks) {
  //     const sectorId = oldTask.task_sector
  //       ? sectorNameToNewId[oldTask.task_sector]
  //       : undefined;

  //     if (oldTask.task_sector && !sectorId) {
  //       console.warn(`Sector no encontrado para tarea "${oldTask.task_name}": "${oldTask.task_sector}"`);
  //     }

  //     const newTaskRef = doc(refs.tasks(activeHouseId!));
  //     await setDoc(newTaskRef, {
  //       name: oldTask.task_name,
  //       description: oldTask.task_description ?? '',
  //       frequency: 'weekly',
  //       defaultAssigned: oldTask.default_assigned ?? true,
  //       sectorId: sectorId ?? null,
  //       createdAt: serverTimestamp(),
  //       updatedAt: serverTimestamp(),
  //     });
  //     console.log(`Tarea migrada: ${oldTask.task_name}`);
  //   }

  //   console.log('Migración completa');
  //   Alert.alert('Migración completa', `${oldSectors.length} sectores y ${oldTasks.length} tareas migradas.`);
  // }

  return (
    <>
      <Stack.Screen options={{ title: 'Admin' }} />
      <View className="flex-1 gap-4 p-6">
        <Text className="text-muted-foreground">Panel admin</Text>

        <View className="gap-2">
          <Link href="/(app)/assign" asChild>
            <Button>
              <Text>Asignar tareas</Text>
            </Button>
          </Link>

          <Link href="/(app)/pass-week" asChild>
            <Button variant="secondary">
              <Text>Pasar semana</Text>
            </Button>
          </Link>

          <Link href="/(app)/sector-priority" asChild>
            <Button variant="secondary">
              <Text>Prioridad de sectores</Text>
            </Button>
          </Link>

          <Link href="/(app)/roles" asChild>
            <Button variant="secondary">
              <Text>Roles</Text>
            </Button>
          </Link>
          {/* <Button variant="secondary" onPress={() => {
            listOldSectors()
            listOldTasks()
          }}>
            <Text>ver tareas y sectores viejos</Text>
          </Button>

          <Button variant="secondary" onPress={() => {
            listTasks()
            listSectors()
          }}>
            <Text>ver tareas y sectores</Text>
          </Button>
          <Button
            variant="secondary"
            onPress={migrarTareas}
          >
            <Text>migrar tareas viejas a esta casa</Text>
          </Button> */}
        </View>

        {!!inviteLink && (
          <View className="gap-2 rounded-lg border border-border p-3">
            <Text className="font-medium">Invitar por link (oculto)</Text>
            <Text className="text-sm text-muted-foreground">{inviteLink}</Text>
            <Button
              variant="secondary"
              onPress={async () => {
                await Clipboard.setStringAsync(inviteLink);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}>
              <Text>{copied ? 'Copiado' : 'Copiar link'}</Text>
            </Button>
          </View>
        )}
      </View>
    </>
  );
}

