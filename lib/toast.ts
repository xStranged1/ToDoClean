import { createRef } from 'react';
import type { ToastRef } from 'react-native-toast-notifications';

export const toastRef = createRef<ToastRef>();

const DEFAULT_DURATION = 3000;

export const showSuccessToast = (title: string, message?: string, duration = DEFAULT_DURATION) => {
  toastRef.current?.show({ title, text: message ?? '' }, { type: 'success' as any, duration });
};

export const showErrorToast = (title: string, message?: string, duration = DEFAULT_DURATION) => {
  // En la lib, el "tipo de error" suele ser `danger`.
  toastRef.current?.show({ title, text: message ?? '' }, { type: 'danger' as any, duration });
};

export const showWarningToast = (title: string, message?: string, duration = DEFAULT_DURATION) => {
  toastRef.current?.show({ title, text: message ?? '' }, { type: 'warning' as any, duration });
};

