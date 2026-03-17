import { create } from 'zustand';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';

import { auth } from '@/services/firebase';
import { listHousesForUser, type HouseSummary } from '@/services/houses';

type AuthState = {
  user: FirebaseUser | null;
  houses: HouseSummary[];
  activeHouseId: string | null;
  isBootstrapping: boolean;

  bootstrap: () => () => void;
  setActiveHouseId: (houseId: string | null) => void;
  refreshHouses: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  houses: [],
  activeHouseId: null,
  isBootstrapping: true,

  setActiveHouseId: (houseId) => set({ activeHouseId: houseId }),

  refreshHouses: async () => {
    const user = get().user;
    if (!user) {
      set({ houses: [], activeHouseId: null });
      return;
    }
    const houses = await listHousesForUser(user.uid);
    set((s) => ({
      houses,
      activeHouseId: s.activeHouseId ?? houses[0]?.id ?? null,
    }));
  },

  bootstrap: () => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      set({ user, isBootstrapping: false });
      if (!user) {
        set({ houses: [], activeHouseId: null });
        return;
      }
      const houses = await listHousesForUser(user.uid);
      set({
        houses,
        activeHouseId: houses[0]?.id ?? null,
      });
    });

    return unsubscribe;
  },
}));

