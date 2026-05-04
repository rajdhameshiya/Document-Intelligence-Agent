import { AlertTriangle, CheckCircle, X, XCircle } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { cn } from '../utils/cn';

const TOAST_CONFIG = {
  success: { icon: CheckCircle, bg: 'bg-green-50 border-green-200', text: 'text-green-800' },
  error: { icon: XCircle, bg: 'bg-red-50 border-red-200', text: 'text-red-800' },
  warning: { icon: AlertTriangle, bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-800' }
};

export function ToastContainer() {
  const { toasts, removeToast } = useAppStore();
  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((toast) => {
        const config = TOAST_CONFIG[toast.type];
        const Icon = config.icon;
        return (
          <div key={toast.id} className={cn('flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg', config.bg)}>
            <Icon className={cn('h-4 w-4 shrink-0', config.text)} />
            <span className={cn('flex-1 text-sm font-medium', config.text)}>{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} aria-label="Dismiss toast">
              <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
