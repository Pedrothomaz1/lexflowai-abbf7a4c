import { toast } from "sonner";

interface ToastOptions {
  description?: string;
  action?: { label: string; onClick: () => void };
  duration?: number;
}

export const toastSuccess = (title: string, opts: ToastOptions = {}) =>
  toast.success(title, opts);

export const toastError = (title: string, opts: ToastOptions = {}) =>
  toast.error(title, { duration: 6000, ...opts });

export const toastWarning = (title: string, opts: ToastOptions = {}) =>
  toast.warning(title, opts);

export const toastInfo = (title: string, opts: ToastOptions = {}) =>
  toast(title, opts);
