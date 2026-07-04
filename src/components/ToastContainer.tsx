import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';
import { useToast } from '../hooks/useToast';

const iconMap = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const colorMap = {
  success: 'bg-lime text-ink border-lime-dark',
  warning: 'bg-amber-400 text-ink border-amber-500',
  error: 'bg-red-400 text-white border-red-500',
};

function ToastItem({ id, message, type }: { id: string; message: string; type: 'success' | 'warning' | 'error' }) {
  const { removeToast } = useToast();
  const [visible, setVisible] = useState(false);
  const Icon = iconMap[type];

  useEffect(() => {
    // Trigger slide-in
    requestAnimationFrame(() => setVisible(true));
    // Start fade-out before removal
    const fadeTimer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(fadeTimer);
  }, []);

  return (
    <div
      className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-300 ${colorMap[type]}`}
      style={{
        transform: visible ? 'translateX(0)' : 'translateX(120%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease-out',
      }}
    >
      <Icon size={16} />
      <span className="font-sans font-semibold text-[12px] flex-1">{message}</span>
      <button
        onClick={() => removeToast(id)}
        className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors"
      >
        <X size={12} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useToast();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 max-w-[320px]">
      {toasts.map(toast => (
        <ToastItem key={toast.id} {...toast} />
      ))}
    </div>
  );
}
