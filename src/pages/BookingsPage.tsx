import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, Inbox, ListFilter, PackageCheck, Warehouse } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState, UserChip } from '@/components/common';
import { StatusBadge } from '@/components/StatusBadge';
import { BookingDetailDialog } from '@/components/BookingDetailDialog';
import { useStore } from '@/store/store';
import { effectiveStatus, getResource, getUser, waitlistPosition } from '@/lib/rules';
import { bookingsVisibleTo, pendingApprovalQueue } from '@/lib/derive';
import { cn, fmtRange, timeAgo } from '@/lib/utils';
import type { DisplayStatus } from '@/types';

type Tab = 'mine' | 'queue' | 'managed';
type StatusFilter = DisplayStatus | 'all';

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'requested', label: 'Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'waitlisted', label: 'Waitlisted' },
  { value: 'checked_out', label: 'Checked out' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'returned', label: 'Returned' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function BookingsPage() {
  const { state, user } = useStore();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<StatusFilter>('all');
  // ?booking=<id> (from a notification) opens that booking directly.
  const openId = params.get('booking');
  const setOpenId = (id: string | null) =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      if (id) next.set('booking', id);
      else next.delete('booking');
      return next;
    });

  const rawTab = params.get('tab');
  const tab: Tab = user.role !== 'student' && (rawTab === 'queue' || rawTab === 'managed') ? rawTab : 'mine';
  const setTab = (t: Tab) => setParams(t === 'mine' ? {} : { tab: t });

  const mine = useMemo(() => bookingsVisibleTo(state, user).filter((b) => b.userId === user.id), [state, user]);
  const queue = useMemo(() => pendingApprovalQueue(state, user), [state, user]);
  const managed = useMemo(() => bookingsVisibleTo(state, user).filter((b) => b.userId !== user.id), [state, user]);

  const rows = (tab === 'mine' ? mine : tab === 'queue' ? queue : managed).filter((b) => {
    if (filter === 'all') return true;
    return effectiveStatus(b) === filter;
  });

  const canSeeQueueTab = user.role !== 'student';

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Bookings</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Full lifecycle: request → decision → check-in → return. Rejections and waitlisting come with visible reasons.
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-border bg-card p-0.5 shadow-sm">
          <button
            type="button"
            className={cn('rounded-sm px-3 py-1.5 text-xs font-medium transition-colors', tab === 'mine' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground')}
            onClick={() => setTab('mine')}
          >
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" /> {user.role === 'student' ? 'My bookings' : 'Bookings I am in'}
            </span>
          </button>
          {canSeeQueueTab ? (
            <button
              type="button"
              className={cn('rounded-sm px-3 py-1.5 text-xs font-medium transition-colors', tab === 'queue' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground')}
              onClick={() => setTab('queue')}
            >
              <span className="flex items-center gap-1.5">
                <Inbox className="h-3.5 w-3.5" /> Approval queue
                {queue.length > 0 ? <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{queue.length}</span> : null}
              </span>
            </button>
          ) : null}
          {canSeeQueueTab ? (
            <button
              type="button"
              className={cn('rounded-sm px-3 py-1.5 text-xs font-medium transition-colors', tab === 'managed' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground')}
              onClick={() => setTab('managed')}
            >
              <span className="flex items-center gap-1.5">
                <Warehouse className="h-3.5 w-3.5" /> {user.role === 'admin' ? 'All bookings' : 'On my resources'}
              </span>
            </button>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-1 overflow-x-auto pb-0.5">
          <ListFilter className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                'shrink-0 rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                filter === f.value ? 'border-primary bg-primary/10 font-semibold text-primary' : 'border-border text-muted-foreground hover:bg-muted/50',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={tab === 'queue' ? Inbox : PackageCheck}
          title={tab === 'queue' ? 'No requests awaiting a decision in this filter' : 'No bookings in this filter'}
          description={
            tab === 'queue'
              ? 'Requests, waitlisted entries and extension requests for resources you own appear here. Approving re-checks availability and eligibility.'
              : 'Make a request from Explore, or clear the status filter to see everything.'
          }
        />
      ) : (
        <Card className="divide-y divide-border/70">
          {rows.map((b) => {
            const resource = getResource(state, b.resourceId);
            const borrower = getUser(state, b.userId);
            const eff = effectiveStatus(b);
            const wl = b.status === 'waitlisted' ? waitlistPosition(state, b) : null;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setOpenId(b.id)}
                className="block w-full px-4 py-3 text-left transition-colors hover:bg-muted/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-xs font-semibold">
                      {resource.name}
                      <code className="text-[10px] font-normal text-muted-foreground">{b.id}</code>
                      {wl ? <Badge variant="destructive" className="text-[10px]">Queue #{wl}</Badge> : null}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {fmtRange(b.start, b.end)} · requested {timeAgo(b.requestedAt)}
                      {tab !== 'mine' ? ` · by ${borrower.name}` : ''}
                      {b.extension?.status === 'pending' ? ' · extension requested' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <UserChip user={borrower} sub={tab !== 'mine' ? borrower.department : b.purpose.slice(0, 40) + '…'} />
                    <StatusBadge status={eff} />
                  </div>
                </div>
                {tab === 'queue' || (b.decisionReason && (b.status === 'rejected' || b.status === 'cancelled')) ? (
                  <p className="mt-1.5 truncate text-[11px] italic text-muted-foreground">
                    {b.status === 'rejected' || b.status === 'cancelled' ? `Reason: ${b.decisionReason ?? '—'}` : `Purpose: ${b.purpose}`}
                  </p>
                ) : null}
              </button>
            );
          })}
        </Card>
      )}

      <BookingDetailDialog
        bookingId={openId}
        open={openId !== null}
        onOpenChange={(open) => {
          if (!open) setOpenId(null);
        }}
      />
    </div>
  );
}
