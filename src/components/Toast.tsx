// src/components/Toast.tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { X, CheckCircle2, AlertCircle } from "lucide-react";

export type ToastType = "success" | "error";

export type ToastConfig = {
  type: ToastType;
  title?: string;
  message: string;
  /** Otomatik kapanma süresi (ms) – örn: 3500 */
  autoCloseMs?: number;
  /** Toast kendi kendine kapandığında çalışacak callback (örn: /users'a yönlendir) */
  onAutoClose?: () => void;
  /** Örn: "Geri al" */
  actionLabel?: string;
  /** Örn: undo işlemi */
  onAction?: () => void;
};

type ToastContextValue = {
  showToast: (config: ToastConfig) => void;
  hideToast: () => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastConfig | null>(null);
  const [visible, setVisible] = useState(false);

  const showToast = useCallback((config: ToastConfig) => {
    setToast(config);
    setVisible(true);
  }, []);

  const hideToast = useCallback(() => {
    setVisible(false);
  }, []);

  // Auto close + onAutoClose
  useEffect(() => {
    if (!toast || !visible || !toast.autoCloseMs) return;

    const timeout = setTimeout(() => {
      setVisible(false);
      // auto close anında callback çalışsın
      if (toast.onAutoClose) {
        toast.onAutoClose();
      }
    }, toast.autoCloseMs);

    // Toast manuel kapatılırsa / action'a basılırsa timeout iptal
    return () => clearTimeout(timeout);
  }, [toast, visible]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <Toast toast={toast} visible={visible} onClose={hideToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

type ToastInnerProps = {
  toast: ToastConfig | null;
  visible: boolean;
  onClose: () => void;
};

function Toast({ toast, visible, onClose }: ToastInnerProps) {
  if (!toast) return null;

  const isSuccess = toast.type === "success";

  return (
    <div
      className={`pointer-events-auto fixed bottom-5 right-5 z-50 transform transition-all duration-300 ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-4 opacity-0 pointer-events-none"
      }`}
    >
      <div
        className={`flex min-w-[260px] max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-xl ${
          isSuccess
            ? "border-emerald-500/40 bg-emerald-950/60 text-emerald-50"
            : "border-red-500/40 bg-red-950/60 text-red-50"
        }`}
      >
        {/* Icon */}
        <div className="mt-0.5">
          {isSuccess ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-400" />
          )}
        </div>

        {/* Text */}
        <div className="flex-1 space-y-1">
          {toast.title && (
            <p className="text-xs font-semibold leading-tight">
              {toast.title}
            </p>
          )}
          <p className="text-[11px] leading-snug text-slate-100">
            {toast.message}
          </p>

          {/* Opsiyonel action (ör: Geri al) */}
          {toast.actionLabel && toast.onAction && (
            <button
              type="button"
              onClick={() => {
                toast.onAction?.();
                onClose(); // action'a basınca toast kapanır, timeout da iptal olur
              }}
              className="mt-1 inline-flex items-center text-[11px] font-medium text-[#4FFFB0] hover:text-[#7bffd0]"
            >
              {toast.actionLabel}
            </button>
          )}
        </div>

        {/* Close butonu */}
        <button
          type="button"
          onClick={onClose}
          className="ml-2 mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/20 text-slate-100 hover:bg-black/30"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
