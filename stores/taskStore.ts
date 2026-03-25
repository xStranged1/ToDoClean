import { create } from 'zustand';

type TaskStatus = 'pending' | 'completed' | 'verified';

type TaskOverride = {
    status: TaskStatus;
};

type TaskStoreState = {
    overrides: Record<string, TaskOverride>; // key: `${assignmentId}-${taskId}`
    setOverride: (key: string, status: TaskStatus) => void;
    clearOverride: (key: string) => void;
    clearAll: () => void;
};

export const useTaskStore = create<TaskStoreState>((set) => ({
    overrides: {},
    setOverride: (key, status) =>
        set((s) => ({ overrides: { ...s.overrides, [key]: { status } } })),
    clearOverride: (key) =>
        set((s) => {
            const next = { ...s.overrides };
            delete next[key];
            return { overrides: next };
        }),
    clearAll: () => set({ overrides: {} }),
}));