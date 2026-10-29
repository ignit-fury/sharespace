import { useState } from 'react';
import { BookOpenCheck, ClipboardCheck, ShieldAlert, ShieldCheck, TriangleAlert, Wrench } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState, UserChip } from '@/components/common';
import { IncidentReportDialog, IncidentResolveDialog } from '@/components/IncidentDialogs';
import { BookingDetailDialog } from '@/components/BookingDetailDialog';
import { useStore } from '@/store/store';
import { useToast } from '@/components/ui/toast';
import { getResource, getUser } from '@/lib/rules';
import { incidentsVisibleTo } from '@/lib/derive';
import { cn, fmtDateTime } from '@/lib/utils';
import type { IncidentCategory, IncidentSeverity } from '@/types';

const CATEGORY_META: Record<IncidentCategory, { label: string; icon: typeof Wrench }> = {
  damage: { label: 'Damage', icon: Wrench },
  delay: { label: 'Delay', icon: TriangleAlert },
  safety: { label: 'Safety', icon: ShieldAlert },
  dispute: { label: 'Dispute', icon: ClipboardCheck },
};

const SEVERITY_CLS: Record<IncidentSeverity, string> = {
  low: 'bg-slate-100 text-slate-600 border-slate-200',
  medium: 'bg-amber-50 text-amber-800 border-amber-200',
  high: 'bg-red-50 text-red-700 border-red-200 font-semibold',
};

type Scope = 'all' | 'open' | 'resolved';

export function IncidentsPage() {
  const { state, user, actions } = useStore();
  const { toast } = useToast();
  const [scope, setScope] = useState<Scope>('open');
  const [reportOpen, setReportOpen] = useState(false);
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [openBookingId, setOpenBookingId] = useState<string | null>(null);

  const incidents = incidentsVisibleTo(state, user).filter((i) =>
    scope === 'all' ? true : scope === 'open' ? i.status !== 'resolved' : i.status === 'resolved',
  );
  const canModerate = user.role === 'admin' || user.role === 'owner';

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Incidents</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Damage, delays, safety issues and disputes. No automatic penalties — every outcome is a written, human decision.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-md border border-border bg-card p-0.5 shadow-sm">
            {(
              [
                ['open', 'Open'],
                ['resolved', 'Resolved'],
                ['all', 'All'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setScope(value)}
                className={cn('rounded-sm px-3 py-1.5 text-xs font-medium transition-colors', scope === value ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                {label}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => setReportOpen(true)}>
            <ShieldAlert className="h-4 w-4" /> Report incident
          </Button>
        </div>
      </header>

      {incidents.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Nothing here" description={scope === 'open' ? 'No open incidents in your scope. Reported issues land here for review.' : 'No resolved incidents match this filter.'} />
      ) : (
        <div className="grid gap-3">
          {incidents.map((i) => {
            const meta = CATEGORY_META[i.category];
            const resource = getResource(state, i.resourceId);
            const reporter = getUser(state, i.reportedBy);
            const mineToHandle = canModerate;
            return (
              <Card key={i.id} className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-semibold text-foreground/80">
                    <meta.icon className="mr-1 inline h-3 w-3" />
                    {meta.label}
                  </span>
                  <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium', SEVERITY_CLS[i.severity])}>
                    {i.severity} severity
                  </span>
                  {i.status === 'open' ? (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">Open</span>
                  ) : i.status === 'under_review' ? (
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-800">Under review</span>
                  ) : (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Resolved</span>
                  )}
                  <code className="text-[10px] text-muted-foreground">{i.id}</code>
                </div>

                <p className="mt-2 text-sm leading-relaxed text-foreground/90">{i.description}</p>

                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
                  <span>
                    Resource: <span className="font-medium text-foreground">{resource.name}</span>
                  </span>
                  {i.bookingId ? (
                    <button type="button" className="font-medium text-primary underline-offset-2 hover:underline" onClick={() => setOpenBookingId(i.bookingId!)}>
                      Booking {i.bookingId}
                    </button>
                  ) : null}
                  <span className="flex items-center gap-1.5">
                    Reported by <UserChip user={reporter} sub={`${resource.location}`} />
                  </span>
                  <span>{fmtDateTime(i.reportedAt)}</span>
                </div>

                {i.status === 'resolved' && i.resolutionNote ? (
                  <p className="mt-2.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-relaxed text-emerald-900">
                    <span className="font-semibold">Resolution:</span> {i.resolutionNote}
                    <span className="mt-0.5 block text-[10px] text-emerald-800/80">
                      {i.resolvedBy ? `Decided by ${getUser(state, i.resolvedBy).name}` : ''}{i.resolvedAt ? ` · ${fmtDateTime(i.resolvedAt)}` : ''}
                    </span>
                  </p>
                ) : null}

                {mineToHandle && i.status !== 'resolved' ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {i.status === 'open' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          const result = actions.reviewIncident(i.id);
                          if (result.ok) toast('info', 'Incident under review', `${i.id} is now marked under review.`);
                          else toast('error', 'Could not update', result.reason);
                        }}
                      >
                        <ClipboardCheck className="h-4 w-4" /> Start review
                      </Button>
                    ) : (
                      <span className="text-[11px] text-sky-800">Under review</span>
                    )}
                    <Button size="sm" className="text-xs" onClick={() => setResolveId(i.id)}>
                      <BookOpenCheck className="h-4 w-4" /> Resolve with note
                    </Button>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      <IncidentReportDialog open={reportOpen} onOpenChange={setReportOpen} />
      <IncidentResolveDialog open={resolveId != null} onOpenChange={(open) => { if (!open) setResolveId(null); }} incidentId={resolveId ?? ''} />
      <BookingDetailDialog bookingId={openBookingId} open={openBookingId != null} onOpenChange={(open) => { if (!open) setOpenBookingId(null); }} />
    </div>
  );
}
