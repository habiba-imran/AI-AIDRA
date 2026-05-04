import { useEffect } from 'react';
import { X, AlertTriangle, AlertCircle, CheckCircle, Info } from 'lucide-react';
import type { Toast, ToastType } from '../types';

const toastConfig: Record<
  ToastType,
  {
    borderColor: string;
    bg: string;
    icon: typeof AlertTriangle;
    iconColor: string;
    textColor: string;
  }
> = {
  warning: {
    borderColor: 'border-l-amber-500',
    bg: 'bg-amber-500/10',
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
    textColor: 'text-amber-300',
  },
  danger: {
    borderColor: 'border-l-red-500',
    bg: 'bg-red-500/10',
    icon: AlertCircle,
    iconColor: 'text-red-400',
    textColor: 'text-red-300',
  },
  success: {
    borderColor: 'border-l-green-500',
    bg: 'bg-green-500/10',
    icon: CheckCircle,
    iconColor: 'text-green-400',
    textColor: 'text-green-300',
  },
  info: {
    borderColor: 'border-l-sky-500',
    bg: 'bg-sky-500/10',
    icon: Info,
    iconColor: 'text-sky-400',
    textColor: 'text-sky-300',
  },
};

interface NotificationToastsProps {
  toasts: Toast[];
  onDismissToast: (id: string) => void;
}

function ToastRow({
  toast,
  index,
  onDismissToast,
}: {
  toast: Toast;
  index: number;
  onDismissToast: (id: string) => void;
}) {
  useEffect(() => {
    const id = window.setTimeout(() => {
      onDismissToast(toast.id);
    }, 4000);
    return () => window.clearTimeout(id);
  }, [toast.id, onDismissToast]);

  const config = toastConfig[toast.type];
  const Icon = config.icon;
  return (
    <div
      className={`pointer-events-auto flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border-l-4 ${config.borderColor} ${config.bg} backdrop-blur-md animate-slide-in`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <Icon className={`w-4 h-4 ${config.iconColor} shrink-0`} />
      <span className={`text-[11px] ${config.textColor} font-medium`}>{toast.message}</span>
      <button type="button" onClick={() => onDismissToast(toast.id)} className="ml-2 text-[#64748b] hover:text-[#f1f5f9] transition-colors shrink-0 cursor-pointer">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function NotificationToasts({ toasts, onDismissToast }: NotificationToastsProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast, i) => (
        <ToastRow key={toast.id} toast={toast} index={i} onDismissToast={onDismissToast} />
      ))}
    </div>
  );
}
