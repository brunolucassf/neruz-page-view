import { create } from 'zustand';

export type ToastTone = 'success' | 'error' | 'neutral';

export type ToastAction = {
  label: string;
  onPress: () => void;
};

export type Toast = {
  id: number;
  tone: ToastTone;
  title: string;
  body?: string;
  actions?: ToastAction[];
  isLeaving?: boolean;
};

const MAX_TOASTS = 3;
const NEUTRAL_LIFETIME_MS = 5000;

type ToastState = {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => number;
  dismissToast: (id: number) => void;
  removeToast: (id: number) => void;
};

let nextToastId = 1;

export const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],

  showToast: (toast) => {
    const id = nextToastId++;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }].slice(-MAX_TOASTS) }));
    if (toast.tone === 'neutral') setTimeout(() => get().dismissToast(id), NEUTRAL_LIFETIME_MS);
    return id;
  },

  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.map((toast) =>
        toast.id === id ? { ...toast, isLeaving: true } : toast,
      ),
    })),

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

export const showToast = (toast: Omit<Toast, 'id'>) => useToasts.getState().showToast(toast);
