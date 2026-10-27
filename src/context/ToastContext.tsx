"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  dismissible?: boolean;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
  toast: (message: string, type?: ToastType, options?: Partial<Omit<Toast, "id" | "message" | "type">>) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

   const addToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substring(2, 11);
      const newToast: Toast = {
        id,
        title: toast.title || undefined,
        duration: toast.duration ?? 5000,
        dismissible: toast.dismissible ?? true,
        type: toast.type,
        message: toast.message,
      };
      setToasts((prev) => [...prev, newToast]);

      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, newToast.duration);
      }

      return id;
    },
    []
  );

   const toast = useCallback(
    (message: string, type: ToastType = "info", options?: Omit<Partial<Toast>, "id" | "type" | "message">) => {
      return addToast({
        type,
        message,
        ...options,
      });
    },
    [addToast]
  );  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, toast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  const getIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.616-2.707l-6.616 6.616a2 2 0 01-2.828 0L6.384 8.384a2 2 0 00-2.828 0v4.616a2 2 0 00.657 1.465l5.616 5.616a2 2 0 002.828 0l6.616-6.616a2 2 0 00-1.616-3.465z" />
          </svg>
        );
      case "error":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "warning":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-.01-6a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m0-4h.01M12 11a1 1 0 100 2 1 1 0 000-2z" />
          </svg>
        );
    }
  };

  const getTypeStyles = (type: ToastType) => {
    switch (type) {
      case "success":
        return "bg-emerald-900/90 border-emerald-500/50 text-emerald-100";
      case "error":
        return "bg-rose-900/90 border-rose-500/50 text-rose-100";
      case "warning":
        return "bg-amber-900/90 border-amber-500/50 text-amber-100";
      default:
        return "bg-blue-900/90 border-blue-500/50 text-blue-100";
    }
  };

  const getProgressColor = (type: ToastType) => {
    switch (type) {
      case "success":
        return "bg-emerald-400";
      case "error":
        return "bg-rose-400";
      case "warning":
        return "bg-amber-400";
      default:
        return "bg-blue-400";
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          removeToast={removeToast}
          getIcon={getIcon}
          getTypeStyles={getTypeStyles}
          getProgressColor={getProgressColor}
        />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  removeToast: (id: string) => void;
  getIcon: (type: ToastType) => React.ReactNode;
  getTypeStyles: (type: ToastType) => string;
  getProgressColor: (type: ToastType) => string;
}

function ToastItem({ toast, removeToast, getIcon, getTypeStyles, getProgressColor }: ToastItemProps) {
  const [progress, setProgress] = useState(100);

  React.useEffect(() => {
    if (!toast.duration || toast.duration <= 0) return;

    const interval = 50;
    const step = (interval / toast.duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev - step;
        if (next <= 0) {
          clearInterval(timer);
          return 0;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [toast.duration]);

  return (
    <div
      className={`relative rounded-xl border shadow-xl p-4 transition-all duration-200 animate-in slide-in-from-right-full ${getTypeStyles(toast.type)}`}
    >
      <div className={`absolute bottom-0 left-0 h-1 ${getProgressColor(toast.type)} transition-all duration-75`} style={{ width: `${progress}%` }} />
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{getIcon(toast.type)}</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{toast.message}</p>
          {toast.title && <p className="text-xs opacity-80 mt-0.5">{toast.title}</p>}
        </div>
        {toast.dismissible && (
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 ml-2 opacity-60 hover:opacity-100 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
