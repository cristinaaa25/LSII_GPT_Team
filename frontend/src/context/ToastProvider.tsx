import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ToastContext, ToastVariant } from './ToastContext';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface Props {
  children: React.ReactNode;
  /** How long a toast stays visible, in milliseconds. */
  duration?: number;
}

export const ToastProvider: React.FC<Props> = ({ children, duration = 4000 }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'success') => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, variant }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration)
      );
    },
    [dismiss, duration]
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => activeTimers.forEach((timer) => clearTimeout(timer));
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pt-toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast show pt-toast pt-toast-${toast.variant} px-3 py-2`}
            role={toast.variant === 'error' ? 'alert' : 'status'}
            aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
            aria-atomic="true"
          >
            <span className="flex-grow-1">{toast.message}</span>
            <button
              type="button"
              className="btn-close"
              aria-label="Close notification"
              onClick={() => dismiss(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
