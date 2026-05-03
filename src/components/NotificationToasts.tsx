import { X, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { toasts } from '../data/placeholder';

const toastConfig = {
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
};

export default function NotificationToasts() {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast, i) => {
        const config = toastConfig[toast.type];
        const Icon = config.icon;
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border-l-4 ${config.borderColor} ${config.bg} backdrop-blur-md animate-slide-in`}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <Icon className={`w-4 h-4 ${config.iconColor} shrink-0`} />
            <span className={`text-[11px] ${config.textColor} font-medium`}>{toast.message}</span>
            <button className="ml-2 text-[#64748b] hover:text-[#f1f5f9] transition-colors shrink-0 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
