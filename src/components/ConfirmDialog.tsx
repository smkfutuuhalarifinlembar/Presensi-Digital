"use client";

import React, { useState, useCallback } from "react";
import { X, AlertTriangle } from "lucide-react";

export interface ConfirmDialogOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  showInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
}

export interface ConfirmDialogResult {
  confirmed: boolean;
  inputValue?: string;
}

type ConfirmFn = (options: ConfirmDialogOptions) => Promise<ConfirmDialogResult>;

interface ConfirmDialogState {
  id: string;
  options: ConfirmDialogOptions;
  resolve: (result: ConfirmDialogResult) => void;
}

export const confirmDialog: {
  confirm: (options: ConfirmDialogOptions) => Promise<ConfirmDialogResult>;
} = {
  confirm: async () => {
    throw new Error("ConfirmDialogProvider not initialized");
  },
};

let globalConfirmFn: ConfirmFn | null = null;

export function setConfirmDialog(fn: ConfirmFn) {
  confirmDialog.confirm = fn;
  globalConfirmFn = fn;
}

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [dialogs, setDialogs] = useState<ConfirmDialogState[]>([]);

  const confirm = useCallback((options: ConfirmDialogOptions): Promise<ConfirmDialogResult> => {
    return new Promise<ConfirmDialogResult>((resolve) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      setDialogs((prev) => [...prev, { id, options, resolve }]);
    });
  }, []);

  const closeDialog = useCallback((id: string, result: ConfirmDialogResult) => {
    setDialogs((prev) => {
      const dialog = prev.find((d) => d.id === id);
      if (dialog) {
        dialog.resolve(result);
      }
      return prev.filter((d) => d.id !== id);
    });
  }, []);

  const handleConfirm = (id: string) => {
    const dialog = dialogs.find((d) => d.id === id);
    if (!dialog) return;

    const inputValue = dialog.options.showInput
      ? (dialog.options as any)._inputValue
      : undefined;

    closeDialog(id, { confirmed: true, inputValue });
  };

  const handleCancel = (id: string) => {
    const dialog = dialogs.find((d) => d.id === id);
    if (!dialog) return;

    const inputValue = dialog.options.showInput
      ? (dialog.options as any)._inputValue
      : undefined;

    closeDialog(id, { confirmed: false, inputValue });
  };

  const updateInputValue = useCallback((id: string, value: string) => {
    setDialogs((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          return {
            ...d,
            options: { ...d.options, _inputValue: value },
          };
        }
        return d;
      })
    );
  }, []);

  const confirmImpl: ConfirmFn = useCallback((options) => confirm(options), [confirm]);

  React.useEffect(() => {
    setConfirmDialog(confirmImpl);
  });

  return (
    <>
      {children}
      {dialogs.map((dialog) => (
        <ConfirmDialog
          key={dialog.id}
          id={dialog.id}
          options={dialog.options}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          onInputChange={(value) => updateInputValue(dialog.id, value)}
          inputValue={(dialog.options as any)._inputValue}
        />
      ))}
    </>
  );
}

function ConfirmDialog({
  id,
  options,
  onConfirm,
  onCancel,
  onInputChange,
  inputValue,
}: {
  id: string;
  options: ConfirmDialogOptions;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  onInputChange: (value: string) => void;
  inputValue?: string;
}) {
  const { title, message, confirmLabel, cancelLabel, variant = "info", showInput, inputLabel, inputPlaceholder } = options;

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          icon: "text-rose-400",
          button: "bg-rose-600 hover:bg-rose-500 focus:ring-rose-500/50",
        };
      case "warning":
        return {
          icon: "text-amber-400",
          button: "bg-amber-600 hover:bg-amber-500 focus:ring-amber-500/50",
        };
      default:
        return {
          icon: "text-blue-400",
          button: "bg-blue-600 hover:bg-blue-500 focus:ring-blue-500/50",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl border bg-slate-900 shadow-2xl border-slate-800">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 p-2 rounded-xl bg-slate-800 ${styles.icon}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white text-lg mb-1">{title}</h3>
              {message && <p className="text-sm text-slate-300 mb-4">{message}</p>}

              {showInput && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    {inputLabel || "Konfirmasi"}
                  </label>
                  <input
                    type="text"
                    value={inputValue || ""}
                    onChange={(e) => onInputChange(e.target.value)}
                    placeholder={inputPlaceholder || ""}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-2 pt-4 border-t border-slate-800">
            <button
              onClick={() => onCancel(id)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500/50"
            >
              {cancelLabel || "Batal"}
            </button>
            <button
              onClick={() => onConfirm(id)}
              className={`px-4 py-2 rounded-lg text-sm font-bold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${styles.button}`}
            >
              {confirmLabel || "Konfirmasi"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
