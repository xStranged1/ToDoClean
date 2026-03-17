import { create } from 'zustand';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';

import { auth } from '@/services/firebase';
import { listHousesForUser, type HouseSummary } from '@/services/houses';
import { getHouseUser } from '@/services/users';
import type { HouseRole } from '@/services/types';

type AuthState = {
  user: FirebaseUser | null;
  houses: Array<HouseSummary & { code?: string }>;
  activeHouseId: string | null;
  activeHouseRole: HouseRole | null;
  isBootstrapping: boolean;
  pendingJoinCode: string | null;

  bootstrap: () => () => void;
  setActiveHouseId: (houseId: string | null) => void;
  setPendingJoinCode: (code: string | null) => void;
  refreshHouses: () => Promise<void>;
  refreshActiveHouseRole: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
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

  bootstrap: () => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      set({ user, isBootstrapping: false });
      if (!user) {
        set({ houses: [], activeHouseId: null, activeHouseRole: null });
        return;
      }
      const houses = await listHousesForUser(user.uid);
      set({
        houses,
        activeHouseId: houses[0]?.id ?? null,
      });
      await get().refreshActiveHouseRole();
    });

    return unsubscribe;
  },
}));

