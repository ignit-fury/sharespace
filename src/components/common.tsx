import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { initials } from '@/lib/utils';
import type { User } from '@/types';

/** Colored initials avatar; role tints the ring. */
export function UserAvatar({ user, size = 'md', className }: { user: User; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeCls = size === 'sm' ? 'h-6 w-6 text-[10px]' : size === 'lg' ? 'h-10 w-10 text-sm' : 'h-8 w-8 text-xs';
  const ring =
    user.role === 'admin' ? 'bg-indigo-100 text-indigo-800' : user.role === 'owner' ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800';
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', sizeCls, ring, className)}>
      {initials(user.name)}
    </span>
  );
}

export function UserChip({ user, sub }: { user: User; sub?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <UserAvatar user={user} size="sm" />
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-xs font-medium text-foreground">{user.name}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{sub ?? user.title}</span>
      </span>
    </span>
  );
}

export function EmptyState({ icon: Icon, title, description, children }: { icon: LucideIcon; title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'default',
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  hint?: string;
  tone?: 'default' | 'alert';
  onClick?: () => void;
}) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      className={cn(onClick && 'cursor-pointer rounded-lg transition-shadow hover:shadow-pop')}
    >
      <Card className={cn('h-full p-4', onClick && 'h-full')}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <span
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md',
              tone === 'alert' ? 'bg-red-50 text-red-700' : 'bg-accent text-accent-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        </div>
        <p className={cn('mt-1.5 text-2xl font-semibold tracking-tight', tone === 'alert' && value !== 0 ? 'text-red-700' : 'text-foreground')}>
          {value}
        </p>
        {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
      </Card>
    </div>
  );
}
