---
name: refactor-app-limpieza
overview: ""
todos:
  - id: todo-1773683879363-ygoq0x1vs
    content: ""
    status: pending
---

# Plan refactor app de limpieza

### 1. Arquitectura general del nuevo proyecto

- **Base tecnológica**
  - Mantener Expo y React Native pero migrar todo a TypeScript.
  - Integrar [`reactnativereusables`](reactnativereusables)(components.json, `components/ui`) para UI (inputs, botones, listas, diálogos, etc.), reutilizando el setup ya iniciado en [`app/_layout.tsx`](d:/programacion/appLimpieza/app/_layout.tsx) y [`components/ui/*`](d:/programacion/appLimpieza/components/ui).
  - Mantener Firebase (Auth + Firestore) pero mover toda la lógica a `/services` y tiparla bien.

- **Estructura de carpetas propuesta**
  - `app/` – Navegación por rutas (App Router de Expo) y pantallas.
  - `components/` – Componentes UI compartidos (basados en ReactNativeReusables) y componentes de dominio (ej. `UserCard`, `TaskCard`).
  - `services/` – Lógica por dominio (sin UI):
    - `services/firebase.ts` – inicialización de `app`, `auth`, `db`.
    - `services/users.ts` – CRUD de usuarios, membresías en casas.
    - `services/houses.ts` – CRUD de casas y configuración.
    - `services/sectors.ts` – CRUD de sectores por casa.
    - `services/tasks.ts` – CRUD de tareas por casa/sector.
    - `services/assignments.ts` – asignación de tareas, estados e historial.
  - `stores/` – Zustand stores solo cuando haya estado compartido entre varias pantallas (ej. usuario autenticado, casa actual, filtros de tareas).
  - `lib/` – utilidades genéricas (`lib/utils.ts`, formateos, helpers de fechas, etc.).

### 2. Nuevo modelo de datos multi-casa en Firestore

Actualmente el legacy usa colecciones como `user`, `tasks`, `sectors`, `assigned_tasks` sin separar por casa. Vamos a rediseñarlo así:

- **Colecciones principales**
  - `houses` (colección raíz)
    - Documento `houseId`:
      - `name: string`
      - `ownerUid: string`
      - `memberUids: string[]` (o subcolección `members` con roles)
      - `createdAt`, `updatedAt`
  - Subcolecciones por casa:
    - `houses/{houseId}/users` – Perfil de usuario dentro de esa casa (rol, permisos, estado en casa).
    - `houses/{houseId}/sectors` – Sectores de esa casa.
    - `houses/{houseId}/tasks` – Tareas base por sector.
    - `houses/{houseId}/assignments` – Asignaciones de tareas por usuario y período.

- **Modelo de usuario y membresías**
  - `users` (colección global, opcional pero recomendable): datos de la cuenta general (email, displayName, photoURL).
  - `houses/{houseId}/users/{userId}`:
    - `uid: string`
    - `displayName: string`
    - `role: 'owner' | 'admin' | 'member'`
    - `inHome: boolean` (equivalente a `in_home` legacy para esa casa)
    - `canControl: boolean` (si controla a otros / administra tareas)

- **Modelo de sectores y tareas base**
  - `houses/{houseId}/sectors/{sectorId}`:
    - `name: string`
    - `description?: string`
  - `houses/{houseId}/tasks/{taskId}`:
    - `name: string`
    - `sectorId: string`
    - `frequency: 'daily' | 'weekly' | 'monthly' | 'custom'` (sustituye `task_frec` numérico poco claro)
    - `defaultAssigned: boolean` (similar a legacy, para autoasignaciones)

- **Modelo mejorado de asignaciones e historial**
  - En lugar de un único doc en `assigned_tasks` por usuario, usaremos asignaciones versionadas por período (ej. semana):
  - `houses/{houseId}/assignments/{assignmentId}`:
    - `userId: string`
    - `periodType: 'week' | 'day'` (podemos empezar con 'week').
    - `periodStart: Timestamp` (lunes de la semana, por ejemplo).
    - `periodEnd: Timestamp`.
    - `tasks: { taskId: string; sectorId: string; name: string; }[]` (snapshot de tareas asignadas).
    - `statusByTask: { [taskId: string]: 'pending' | 'inProgress' | 'completed' | 'verified' }`.
    - `createdBy: string` (uid que asignó).
    - `createdAt: Timestamp`.

- **Estados de tareas (sustituir `marked_tasks` / `control_marked_tasks`)**
  - Damos semántica clara a los estados que ya usás visualmente (círculos amarillo/azul/verde):
    - `pending` → asignada pero nadie marcó nada.
    - `inProgress` → el usuario marcó alguna subtarea / parcial.
    - `completed` → el usuario marcó todas las tareas.
    - `verified` → el admin/control verificó que la tarea está OK (equivalente a `finished`).
  - El `UserScreen` nuevo se basa en estos estados para mostrar el círculo de color.

- **Diagrama de alto nivel (Firestore)**
```mermaid
flowchart TD
  users[users]
  houses[houses]
  houseUsers[houses/{houseId}/users]
  sectors[houses/{houseId}/sectors]
  tasks[houses/{houseId}/tasks]
  assignments[houses/{houseId}/assignments]

  users --> houses
  houses --> houseUsers
  houses --> sectors
  houses --> tasks
  houses --> assignments
  houseUsers --> assignments
  tasks --> assignments
```


### 3. Servicios por dominio (`/services`)

- **`services/firebase.ts`**
  - Encapsular `initializeApp`, `getFirestore`, `getAuth` usando la config actual (`firebase-config.js` legacy) pero en TS.
  - Exportar `firebaseApp`, `db`, `auth` reusables.

- **`services/users.ts`**
  - Funciones clave:
    - `createUserAccount(email, password, displayName)` – alta en Auth + doc en `users`.
    - `inviteUserToHouse(houseId, email)` – crea membresía o invitación.
    - `setUserInHome(houseId, userId, inHome)` – equivalente a `changeOnHome` legacy (`updateDoc` pero scoping por casa).
    - `listUsersForHouse(houseId)` – para la pantalla tipo `UserScreen`.

- **`services/houses.ts`**
  - Funciones clave:
    - `createHouse(name, ownerUid)`.
    - `listHousesForUser(uid)`.
    - `setActiveHouse(houseId)` (combinado con store de Zustand, ver sección 4).

- **`services/sectors.ts`**
  - Basado en legacy `addSector.js` y uso de `sectors` en pantallas de asignación.
  - Funciones clave:
    - `createSector(houseId, data)`.
    - `listSectors(houseId)`.

- **`services/tasks.ts`**
  - Basado en legacy `addTaskScreen.js`, `TasksScreen.js` y consultas a `tasks` por `task_sector`.
  - Funciones clave:
    - `createTask(houseId, sectorId, data)`.
    - `listTasksBySector(houseId, sectorIds[])` – reemplaza lógica de `ejecuteQuery` repetida.
    - `setTaskDefaultAssigned(houseId, taskId, defaultAssigned)` – reemplaza `putAllTasksDefaultActive` / `changeDefault`.

- **`services/assignments.ts`**
  - Reemplaza la lógica dispersa de `AssignTaskScreen`, `TasksScreen`, `UserScreen` y `HistorialScreen`.
  - Funciones clave:
    - `assignTasksToUser(houseId, userId, tasksWithMetadata, period)` – crea documento en `assignments` con snapshot de tareas.
    - `getAssignmentsForUser(houseId, userId, period?)` – para ver tareas activas.
    - `updateTaskStatus(houseId, assignmentId, taskId, newStatus)` – reemplaza arrays `marked_tasks` y `control_marked_tasks`.
    - `getAssignmentsForHouse(houseId, period?)` – equivalente a vista admin de todas las tareas de todos los usuarios.
    - `getWeeklyHistory(houseId, userId)` – para historial de semanas pasadas.

### 4. Estado global con Zustand (solo donde aporte valor)

- **Stores propuestos**
  - `stores/authStore.ts`:
    - `user: FirebaseUser | null`.
    - `houses: HouseSummary[]`.
    - `activeHouseId: string | null`.
    - Métodos: `setUser`, `loadUserHouses`, `setActiveHouse`.
  - `stores/tasksStore.ts` (opcional, si hay mucho sharing entre pantallas):
    - Estado de filtros (sector seleccionado, período semanal actual, etc.).
    - Cache ligera de tareas/sectors para no reconsultar todo en cada pantalla.

- **Regla de uso**
  - Si el estado solo vive en una pantalla (ej. inputs de un formulario), mantenerlo en `useState` local.
  - Si lo comparten varias pantallas (ej. `activeHouse`, usuario logueado, filtros globales de semana), usar Zustand.

### 5. Navegación y pantallas (inspirado en legacy, pero limpio)

- **App shell y routing**
  - Usar Expo Router con estructura en `app/`:
    - `app/(auth)/login.tsx`, `app/(auth)/register.tsx`.
    - `app/(app)/index.tsx` – home / dashboard de la casa actual.
    - `app/(app)/users.tsx` – equivalente al `UserScreen` (usuarios en casa / fuera de casa).
    - `app/(app)/sectors.tsx` – administración de sectores.
    - `app/(app)/tasks.tsx` – mantenimiento de tareas base (como `TasksScreen` pero más claro).
    - `app/(app)/assign.tsx` – asignar tareas a usuarios (reemplaza `AssignTaskScreen`).
    - `app/(app)/history.tsx` – historial de tareas (equivalente a `HistorialScreen` pero basado en `assignments`).

- **Uso de ReactNativeReusables**
  - Reemplazar componentes legacy (`Button`, `TextInput`, `Header`, etc.) por componentes de `components/ui` basados en ReactNativeReusables para conseguir una UI moderna y consistente.
  - Crear algunos componentes de dominio reusables:
    - `UserRow` / `UserCard` (muestra nombre, estado, sectores, corona, etc.).
    - `TaskItem` (con checkbox/estado, nombre, sector, frecuencia).

### 6. Flujo de asignación de tareas y estados

- **Asignar tareas (pantalla admin)**
  - Seleccionar usuario(s) de la casa.
  - Seleccionar sector(es) → `listTasksBySector` carga las tareas base.
  - Seleccionar tareas concretas mediante checklist (UI inspirada en `AssignTaskScreen` pero simplificada).
  - Seleccionar período (por ejemplo, semana actual, o un rango de fechas simple).
  - Llamar a `assignTasksToUser`, que:
    - Genera un `assignmentId` único.
    - Guarda snapshot de tareas en `assignments`.
    - Inicializa `statusByTask[taskId] = 'pending'`.

- **Ejecución de tareas (pantalla usuario)**
  - Usuario ve su lista de tareas activas de la semana (`getAssignmentsForUser(houseId, userId, currentWeek)`).
  - Marca tareas como hechas, lo que cambia `statusByTask[taskId] `a `'completed'`.
  - La pantalla puede mostrar progreso (porcentaje completado) usando conteo de estados.

- **Control / verificación (pantalla admin)**
  - Admin ve tareas por usuario desde `getAssignmentsForHouse`.
  - Puede revisar y marcar como `'verified'` algunas o todas las tareas.
  - Opcional: botón "Marcar todo verificado" para un usuario/semanal, que ajusta todos los `statusByTask` a `'verified'`.

- **Historial**
  - Pantalla de historial consulta `assignments` filtrando por `userId` y rango de `periodStart`.
  - Muestra para cada semana: cantidad de tareas, completadas, verificadas, y sectores.

### 7. Migración conceptual desde el legacy

- **Qué conservamos**
  - Conceptos: usuarios, sectores, tareas base por sector, asignación, estados visuales (amarillo/azul/verde), `in_home`.
  - Lógica de negocio central (asignar tareas a usuarios y mostrar estados) pero encapsulada en `services`.

- **Qué cambiamos/mejoramos**
  - Eliminamos todo lo de stock (pantallas `stock/*`, `StockScreen.js`, colecciones de stock en Firestore).
  - Pasamos de arrays paralelos (`marked_tasks`, `control_marked_tasks`) a un `statusByTask` por `taskId`, mucho más simple de mantener.
  - Pasamos de una sola asignación viva por usuario a múltiples asignaciones versionadas por período, lo que permite historial real.
  - Añadimos soporte multi-casa, con usuarios que pueden pertenecer a varias casas y elegir en cuál están.

### 8. Orden de implementación sugerido

- **Fase 1 – Infraestructura y modelo**
  - Configurar `services/firebase.ts` y tipos base de datos (TS types/interfaces).
  - Implementar `services/houses.ts` y `services/users.ts` básicos.
  - Implementar `stores/authStore.ts` con `activeHouse`.

- **Fase 2 – Dominios principales**
  - Implementar `services/sectors.ts` y `services/tasks.ts` con Firestore tipado.

-