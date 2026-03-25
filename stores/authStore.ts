import { create } from 'zustand';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';

import { auth } from '@/services/firebase';
import { listHousesForUser, type HouseSummary } from '@/services/houses';
import { getHouseUser, getMyUserByUid } from '@/services/users';
import type { AppUser, HouseRole } from '@/services/types';

type AuthState = {
  user: FirebaseUser | null;
  myUser: AppUser | null; // 👈 agregar esto
  houses: Array<HouseSummary & { code?: string }>;
  activeHouseId: string | null;
  activeHouseRole: HouseRole | null;
  isBootstrapping: boolean;
  pendingJoinCode: string | null;

  bootstrap: () => () => void;
  setActiveHouseId: (houseId: string | null) => void;
  setPendingJoinCode: (code: string | null) => void;
  refreshMyUser: () => Promise<void>;
  refreshHouses: () => Promise<void>;
  refreshActiveHouseRole: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  myUser: null,
  houses: [],
  activeHouseId: null,
  activeHouseRole: null,
  isBootstrapping: true,
  pendingJoinCode: null,

  setActiveHouseId: (houseId) => {
    set({ activeHouseId: houseId });
    // fire and forget
    void get().refreshActiveHouseRole();
  },

  setPendingJoinCode: (code) => set({ pendingJoinCode: code }),

  refreshHouses: async () => {
    const user = get().user;
    if (!user) {
      set({ houses: [], activeHouseId: null, activeHouseRole: null });
      return;
    }
    const houses = await listHousesForUser(user.uid);
    set((s) => ({
      houses,
      activeHouseId: s.activeHouseId ?? houses[0]?.id ?? null,
    }));
    await get().refreshActiveHouseRole();
  },

  refreshActiveHouseRole: async () => {
    const user = get().user;
    const houseId = get().activeHouseId;
    if (!user || !houseId) {
      set({ activeHouseRole: null });
      return;
    }
    const houseUser = await getHouseUser(houseId, user.uid);
    set({ activeHouseRole: houseUser?.role ?? null });
  },
  refreshMyUser: async () => {
    const user = get().user;
    if (!user) {
      set({ myUser: null });
      return;
    }
    const myUser = await getMyUserByUid(user.uid);
    set({ myUser });
  },
  bootstrap: () => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      set({ user, isBootstrapping: false });

      if (!user) {
        set({
          myUser: null,
          houses: [],
          activeHouseId: null,
          activeHouseRole: null,
        });
        return;
      }

      try {
        const [houses, myUser] = await Promise.all([
          listHousesForUser(user.uid),
          getMyUserByUid(user.uid),
        ]);

        set({
          houses,
          myUser,
          activeHouseId: houses[0]?.id ?? null,
        });

        // no lo meto en el Promise.all porque depende de activeHouseId
        await get().refreshActiveHouseRole();
      } catch (err) {
        console.error('Bootstrap error:', err);
      }
    });

    return unsubscribe;
  },
}));

