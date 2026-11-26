import { createContext } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastContextType {
  /** Shows a short message in the bottom-right corner; it closes itself after a few seconds. */
  showToast: (message: string, variant?: ToastVariant) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);
