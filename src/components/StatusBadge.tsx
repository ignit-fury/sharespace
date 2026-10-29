import {
  AlarmClock,
  Ban,
  CheckCircle2,
  ClipboardList,
  Hourglass,
  PackageCheck,
  PackageOpen,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { DisplayStatus } from '@/types';
import { cn } from '@/lib/utils';

interface StatusMeta {
  label: string;
  icon: LucideIcon;
  className: string;
}

const STATUS_META: Record<DisplayStatus, StatusMeta> = {
  requested: {
    label: 'Requested',
    icon: ClipboardList,
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle2,
    className: 'bg-teal-50 text-teal-800 border-teal-200',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    className: 'bg-red-50 text-red-700 border-red-200',
  },
  waitlisted: {
    label: 'Waitlisted',
    icon: Hourglass,
    className: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  cancelled: {
    label: 'Cancelled',
    icon: Ban,
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  checked_out: {
    label: 'Checked out',
    icon: PackageOpen,
    className: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  overdue: {
    label: 'Overdue',
    icon: AlarmClock,
    className: 'bg-red-100 text-red-800 border-red-300 font-semibold',
  },
  returned: {
    label: 'Returned',
    icon: PackageCheck,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
};

export function StatusBadge({ status, className }: { status: DisplayStatus; className?: string }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none',
        meta.className,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

const CONDITION_META = {
  good: { label: 'Good', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  minor_wear: { label: 'Minor wear', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  damaged: { label: 'Damaged', className: 'bg-red-50 text-red-700 border-red-200' },
} as const;

export function ConditionBadge({ condition }: { condition: 'good' | 'minor_wear' | 'damaged' }) {
  const meta = CONDITION_META[condition];
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none', meta.className)}>
      {meta.label}
    </span>
  );
}
