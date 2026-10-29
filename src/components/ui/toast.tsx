import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
}

interface ToastValue {
  toast: (kind: ToastKind, title: string, description?: string) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

const ICONS: Record<ToastKind, { icon: ReactNode; ring: string }> = {
  success: { icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />, ring: 'border-emerald-200' },
  error: { icon: <TriangleAlert className="h-4 w-4 text-red-600" />, ring: 'border-red-200' },
  info: { icon: <Info className="h-4 w-4 text-sky-700" />, ring: 'border-sky-200' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const toast = useCallback((kind: ToastKind, title: string, description?: string) => {
    const id = ++seq.current;
    setItems((prev) => [...prev, { id, kind, title, description }]);
    window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 6200);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[70] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-card p-3 shadow-pop animate-fade-in',
              ICONS[t.kind].ring,
            )}
            role="status"
          >
            <div className="mt-0.5">{ICONS[t.kind].icon}</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground">{t.title}</p>
              {t.description ? (
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{t.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
              className="rounded-sm p-0.5 text-muted-foreground/70 hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
