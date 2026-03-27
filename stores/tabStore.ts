import { create } from 'zustand';

type TabTitleState = {
    actualTabTitle: string;
    prevTabTitle: string;
    setActualTabTitle: (key: string) => void;
    setPrevTabTitle: (key: string) => void;
};

export const useTabStore = create<TabTitleState>((set) => ({
    actualTabTitle: 'Limpieza',
    prevTabTitle: 'Limpieza',
    setActualTabTitle: (key) => set({ actualTabTitle: key }),
    setPrevTabTitle: (key) => set({ prevTabTitle: key }),
}));