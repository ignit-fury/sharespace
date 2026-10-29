import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ScrollText, Search, Undo2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/form';
import { EmptyState } from '@/components/common';
import { useStore } from '@/store/store';
import { auditVisibleTo, pendingApprovalQueue } from '@/lib/derive';
import { getResource, getUser } from '@/lib/rules';
import { cn, fmtDateTime, timeAgo } from '@/lib/utils';

type Group = 'all' | 'booking' | 'resource' | 'incident' | 'training' | 'system';

const GROUPS: { value: Group; label: string }[] = [
  { value: 'all', label: 'Everything' },
  { value: 'booking', label: 'Bookings' },
  { value: 'resource', label: 'Catalog changes' },
  { value: 'incident', label: 'Incidents' },
  { value: 'training', label: 'Training' },
  { value: 'system', label: 'System' },
];

const ACTION_TONE: Record<string, string> = {
  'booking.blocked': 'bg-amber-50 text-amber-800',
  'booking.requested': 'bg-sky-50 text-sky-800',
  'booking.approved': 'bg-emerald-50 text-emerald-800',
  'booking.waitlisted': 'bg-violet-50 text-violet-800',
  'booking.returned': 'bg-teal-50 text-teal-800',
  'booking.checked_in': 'bg-teal-50 text-teal-800',
  'incident.reported': 'bg-red-50 text-red-800',
  'system.seeded': 'bg-slate-100 text-slate-600',
  'system.reset': 'bg-slate-100 text-slate-600',
};

export function AuditPage() {
  const { state, user } = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<Group>('all');
  const events = useMemo(() => auditVisibleTo(state, user).slice().reverse(), [state, user]);
  const queueLength = pendingApprovalQueue(state, user).length;

  const filtered = events.filter((e) => {
    if (group !== 'all' && e.entityType !== group) return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return `${e.summary} ${e.details ?? ''} ${e.action} ${e.id}`.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Audit log</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {events.length} events{user.role === 'student' ? ' visible for you (own activity, your bookings and system notices)' : ''} · append-only — no edit or delete controls exist by design.
          </p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[11px] text-muted-foreground">
          <Lock className="h-3 w-3" /> Immutable · auditable · human-readable
        </span>
      </header>

      <Card className="p-3">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search summaries, reasons, action codes, event IDs…"
              className="pl-8"
              aria-label="Search audit log"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {GROUPS.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setGroup(g.value)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                  group === g.value ? 'border-primary bg-primary/10 font-semibold text-primary' : 'border-border text-muted-foreground hover:bg-muted/50',
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={ScrollText} title="No events match" description="Try a different group or clear the search." />
      ) : (
        <Card className="p-4">
          <ol className="relative space-y-0 border-l border-border pl-5">
            {filtered.map((e) => (
              <li key={e.id} className="relative py-2.5">
                <span
                  className={cn(
                    'absolute -left-[26px] top-4 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card text-[9px] font-bold',
                    e.entityType === 'booking' && 'bg-accent text-accent-foreground',
                    e.entityType === 'incident' && 'text-red-700',
                  )}
                >
                  {e.entityType.slice(0, 1).toUpperCase()}
                </span>
                <p className="flex flex-wrap items-center gap-2">
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', ACTION_TONE[e.action] ?? 'bg-muted text-muted-foreground')}>
                    {e.action}
                  </span>
                  <span className="text-xs font-semibold text-foreground">{e.summary}</span>
                </p>
                {e.details ? <p className="mt-0.5 max-w-3xl text-[11px] leading-relaxed text-muted-foreground">{e.details}</p> : null}
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                  <span>{fmtDateTime(e.at)} · {timeAgo(e.at)}</span>
                  <span>actor: {e.actor === 'system' ? 'System' : `${getUser(state, e.actor).name} (${getUser(state, e.actor).role})`}</span>
                  <span><code>{e.id}</code></span>
                  {e.entityType === 'booking' || e.entityType === 'incident' ? (
                    <code className="rounded bg-muted px-1 py-0.5">{e.entityId}</code>
                  ) : e.entityType === 'resource' ? (
                    <span className="rounded bg-muted px-1 py-0.5">{getResource(state, e.entityId).name}</span>
                  ) : null}
                </p>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <p className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-3.5 py-2.5 text-[11px] text-muted-foreground">
        <span>
          Replay tip: reset the demo from any page to regenerate this trail with pristine seed data. Currently {queueLength} request{queueLength === 1 ? '' : 's'} await decisions.
        </span>
        <button type="button" className="font-medium text-primary underline-offset-2 hover:underline" onClick={() => navigate(-1)}>
          <Undo2 className="mr-1 inline h-3 w-3" /> Back
        </button>
      </p>
    </div>
  );
}
