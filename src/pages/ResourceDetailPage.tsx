import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock,
  GraduationCap,
  Info,
  ListChecks,
  MapPin,
  Pencil,
  ScrollText,
  ShieldCheck,
  TriangleAlert,
  Wallet,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/form';
import { ResourceBanner } from '@/components/ResourceIcon';
import { UserChip } from '@/components/common';
import { ResourceFormDialog, resourceToForm } from '@/components/ResourceFormDialog';
import { useStore } from '@/store/store';
import { useToast } from '@/components/ui/toast';
import { CATEGORY_META } from '@/lib/config';
import {
  checkEligibility,
  committedWindows,
  durationHours,
  findConflicts,
  getResource,
  isPublished,
  previewWaitlistPosition,
} from '@/lib/rules';
import { resourceAvailability } from '@/lib/derive';
import { cn, fmtCost, fmtHours, fmtRange } from '@/lib/utils';

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { state, user } = useStore();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);

  const resource = state.resources.find((r) => r.id === id);
  // Unpublished submissions are visible only to their owner and Campus Operations.
  if (!resource || (!isPublished(resource) && user.role !== 'admin' && resource.ownerId !== user.id)) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm font-semibold">Resource not found.</p>
        <Button variant="outline" size="sm" className="mt-3" asChild>
          <Link to="/explore">Back to Explore</Link>
        </Button>
      </Card>
    );
  }

  const meta = CATEGORY_META[resource.category];
  const availability = resourceAvailability(state, resource);
  const owner = state.users.find((u) => u.id === resource.ownerId)!;
  const isOwnResource = resource.ownerId === user.id;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-3.5 w-3.5" /> Explore
        </Button>
        {user.role === 'admin' || resource.ownerId === user.id ? (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5" /> Edit catalog entry
          </Button>
        ) : null}
      </div>

      <Card className="overflow-hidden">
        <ResourceBanner resource={resource} />
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium', meta.badge)}>{resource.category}</span>
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                availability.status === 'available' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                availability.status === 'in_use' && 'border-sky-200 bg-sky-50 text-sky-700',
                availability.status === 'maintenance' && 'border-red-200 bg-red-50 text-red-700',
              )}
            >
              {availability.label}
            </span>
            <BadgeTeal icon={<Wallet className="h-3 w-3" />}>{fmtCost(resource.costPerHour)}</BadgeTeal>
            <BadgeTeal icon={<Clock className="h-3 w-3" />}>≤ {resource.limits.maxDurationHours} h/booking</BadgeTeal>
          </div>
          <h1 className="mt-2 text-xl font-bold tracking-tight">{resource.name}</h1>
          {resource.model ? <p className="text-xs text-muted-foreground">{resource.model}</p> : null}
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-foreground/80">{resource.description}</p>
          <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <p className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-teal-700" /> {resource.location}
            </p>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-700" /> Owner: <UserChip user={owner} sub={owner.department} />
            </span>
          </div>
        </CardContent>
      </Card>

      {!isPublished(resource) ? <PublicationPanel resourceId={resource.id} /> : null}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          {resource.safetyInstructions?.length ? (
            <Card className="border-red-300 bg-red-50/70">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-800">
                  <TriangleAlert className="h-3.5 w-3.5" /> Handle with care — safety instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="mb-2 text-xs text-red-900">Misuse can damage this equipment or injure you. You must accept these instructions to request it.</p>
                <ul className="space-y-1">
                  {resource.safetyInstructions.map((rule, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-red-950">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-red-600" />
                      {rule}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <InfoRowCard
            icon={<ListChecks className="h-3.5 w-3.5 text-teal-700" />}
            title={resource.category === 'Meeting Spaces' ? 'Rules & decorum' : 'Usage rules'}
          >
            <ul className="space-y-1">
              {resource.usageRules.map((rule, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/80">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-teal-600" />
                  {rule}
                </li>
              ))}
            </ul>
          </InfoRowCard>

          {isOwnResource ? null : <EligibilityPanel resourceId={resource.id} />}

          <InfoRowCard icon={<CalendarClock className="h-3.5 w-3.5 text-teal-700" />} title="Committed schedule (next 7 days)">
            <CommittedSchedule resourceId={resource.id} />
          </InfoRowCard>

          <InfoRowCard icon={<ScrollText className="h-3.5 w-3.5 text-teal-700" />} title="Fair-allocation limits">
            <dl className="grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
              <div className="rounded-md border border-border bg-muted/30 px-2.5 py-2">
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Active bookings (campus-wide)</dt>
                <dd className="mt-0.5 font-semibold">{state.maxActiveBookingsPerUser} max per person</dd>
              </div>
              <div className="rounded-md border border-border bg-muted/30 px-2.5 py-2">
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Daily cap (this resource)</dt>
                <dd className="mt-0.5 font-semibold">{resource.limits.dailyLimitHours != null ? `${resource.limits.dailyLimitHours} h per user` : 'No daily cap'}</dd>
              </div>
              <div className="rounded-md border border-border bg-muted/30 px-2.5 py-2">
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Weekly cap (this resource)</dt>
                <dd className="mt-0.5 font-semibold">{resource.limits.weeklyLimitHours != null ? `${resource.limits.weeklyLimitHours} h per rolling week` : 'No weekly cap'}</dd>
              </div>
              <div className="rounded-md border border-border bg-muted/30 px-2.5 py-2">
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Waitlist rule</dt>
                <dd className="mt-0.5 font-semibold">FIFO · lower recent usage wins ties</dd>
              </div>
            </dl>
          </InfoRowCard>
        </div>

        <div className="lg:col-span-2">
          {isOwnResource ? <OwnerPanel resourceId={resource.id} onEdit={() => setEditOpen(true)} /> : <BookingCard resourceId={resource.id} />}
        </div>
      </div>

      {user.role === 'admin' || resource.ownerId === user.id ? (
        <ResourceFormDialog key={resource.id} open={editOpen} onOpenChange={setEditOpen} initial={resourceToForm(resource)} />
      ) : null}
    </div>
  );
}

function BadgeTeal({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-800">
      {icon ?? null}
      {children}
    </span>
  );
}

function PublicationPanel({ resourceId }: { resourceId: string }) {
  const { state, user, actions } = useStore();
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const resource = getResource(state, resourceId);
  const pending = resource.publication === 'pending';

  const decide = (approve: boolean) => {
    const result = actions.reviewResource(resourceId, approve, reason);
    if (result.ok) {
      toast('success', approve ? 'Resource published' : 'Resource rejected', approve ? 'It is now open for booking.' : 'The owner can edit it and resubmit.');
      setReason('');
    } else {
      toast('error', 'Could not record decision', result.reason);
    }
  };

  return (
    <Card className={cn('p-4 text-xs', pending ? 'border-amber-300 bg-amber-50/70 text-amber-950' : 'border-red-200 bg-red-50/70 text-red-900')}>
      <p className="flex items-center gap-1.5 font-semibold">
        <Info className="h-3.5 w-3.5" />
        {pending ? 'Awaiting Campus Operations approval' : 'Rejected by Campus Operations'}
      </p>
      <p className="mt-1">
        {pending
          ? 'This resource is not published yet. Students cannot see or book it until Campus Operations approves it.'
          : `Reason: ${resource.publicationNote ?? 'not given'}. Edit the catalog entry to resubmit it for approval.`}
      </p>
      {pending && user.role === 'admin' ? (
        <div className="mt-3 space-y-2">
          <Label htmlFor="pub-reason">Reason (required to reject)</Label>
          <Textarea id="pub-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Duplicate of an existing kit; storage location not confirmed." />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="gap-1.5 text-xs" onClick={() => decide(true)}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Approve and publish
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 border-red-300 text-xs text-red-700" onClick={() => decide(false)}>
              <XCircle className="h-3.5 w-3.5" /> Reject
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

/** Shown to a resource's owner instead of the booking form: owners manage, they do not book. */
function OwnerPanel({ resourceId, onEdit }: { resourceId: string; onEdit: () => void }) {
  const { state } = useStore();
  const now = Date.now();
  const bookings = state.bookings.filter((b) => b.resourceId === resourceId);
  const waiting = bookings.filter((b) => b.status === 'requested' || b.status === 'waitlisted' || b.extension?.status === 'pending').length;
  const active = bookings.filter((b) => b.status === 'checked_out' || (b.status === 'approved' && Date.parse(b.end) > now)).length;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <ShieldCheck className="h-4 w-4 text-teal-700" /> You own this resource
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0 text-xs">
        <p className="text-muted-foreground">Owners manage their listings rather than book them. Review requests and keep the details up to date here.</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border border-border bg-muted/30 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Awaiting your decision</p>
            <p className="mt-0.5 text-lg font-semibold">{waiting}</p>
          </div>
          <div className="rounded-md border border-border bg-muted/30 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Upcoming or out now</p>
            <p className="mt-0.5 text-lg font-semibold">{active}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" asChild>
            <Link to="/bookings?tab=queue">Approval queue</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/bookings?tab=managed">All bookings on my resources</Link>
          </Button>
          <Button size="sm" variant="ghost" className="gap-1.5" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" /> Edit details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRowCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

/* ---------------------------------------------------------------- panels */

function CommittedSchedule({ resourceId }: { resourceId: string }) {
  const { state } = useStore();
  const from = new Date().toISOString();
  const to = new Date(Date.now() + 7 * 86_400_000).toISOString();
  const windows = committedWindows(state, resourceId, from, to);
  if (windows.length === 0) {
    return <p className="text-xs text-muted-foreground">No committed bookings in the next 7 days.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {windows.map((b) => (
        <li key={b.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-2">
          <span className="text-xs font-medium text-foreground">{fmtRange(b.start, b.end)}</span>
          <span className="text-[10px] text-muted-foreground">
            {state.users.find((u) => u.id === b.userId)?.name} · booking <code className="text-[10px]">{b.id}</code>
          </span>
        </li>
      ))}
      <li className="text-[10px] text-muted-foreground">Overlapping requests are waitlisted, not rejected.</li>
    </ul>
  );
}

function EligibilityPanel({ resourceId }: { resourceId: string }) {
  const { state, user } = useStore();
  const resource = getResource(state, resourceId);
  const result = checkEligibility(user, resource, state.trainings);
  const required = ['general-safety', ...resource.eligibility.requiredTrainings];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <GraduationCap className="h-3.5 w-3.5 text-teal-700" />
          Eligibility for {user.name}
          <span className={cn('ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold', result.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
            {result.ok ? 'Eligible to request' : 'Blocked'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 pt-0">
        <p className={cn('flex items-center gap-1.5 text-xs', user.membershipVerified ? 'text-emerald-700' : 'text-red-700')}>
          {user.membershipVerified ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
          Verified campus membership ({user.department})
        </p>
        {required.map((id) => {
          const training = state.trainings.find((t) => t.id === id);
          const done = user.trainings.some((t) => t.trainingId === id);
          if (!training) return null;
          return (
            <p key={id} className={cn('flex items-center gap-1.5 text-xs', done ? 'text-emerald-700' : 'text-amber-700')}>
              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5" />}
              {training.name}
              <span className="text-[10px] text-muted-foreground">— {done ? 'completed' : 'required ' + (id === 'general-safety' ? 'for all bookings' : 'for this resource')} · complete it in Training</span>
            </p>
          );
        })}
        {!result.ok ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-900">
            {result.reason}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------- booking form */

function BookingCard({ resourceId }: { resourceId: string }) {
  const { state, user, actions } = useStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const resource = getResource(state, resourceId);
  const eligibility = checkEligibility(user, resource, state.trainings);

  const [proposalStart, setProposalStart] = useState<string | null>(null);
  const [proposalEnd, setProposalEnd] = useState<string | null>(null);
  const [purpose, setPurpose] = useState('');
  const [safetyOk, setSafetyOk] = useState(false);
  const needsSafety = Boolean(resource.safetyInstructions?.length);

  const start = proposalStart ?? toLocalInputValue(withTomorrow10());
  const end = proposalEnd ?? toLocalInputValue(withTomorrow12());

  // Live conflict preview driven by real state.
  const conflicts = useMemo(
    () => findConflicts(state, resourceId, toIso(start), toIso(end)),
    [state, resourceId, start, end],
  );
  const duration = Math.max(0, durationHours(toIso(start), toIso(end)));

  const waitlistNote = conflicts.length > 0 && eligibility.ok
    ? `This slot overlaps ${conflicts.length} approved booking${conflicts.length > 1 ? 's' : ''} — submitting puts you on the waitlist at position ${previewWaitlistPosition(state, resourceId)}.`
    : null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = actions.submitRequest({ resourceId, start: toIso(start), end: toIso(end), purpose, safetyAcknowledged: safetyOk });
    if (result.ok) {
      if (result.detail?.startsWith('waitlisted')) {
        toast('info', 'You are on the waitlist', `Your request was placed at position ${result.detail.split(':')[1]} — an eligible request overlapping an approved booking. Track it under Bookings.`);
      } else {
        toast('success', 'Request submitted', 'The resource owner now reviews it. Follow the status under Bookings.');
      }
      navigate('/bookings');
    } else {
      toast('error', 'Request blocked', result.reason);
    }
  };

  if (resource.status === 'maintenance' || !eligibility.ok) {
    return (
      <Card className="border-amber-300 bg-amber-50/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-xs text-amber-900">
            <TriangleAlert className="h-3.5 w-3.5" /> Booking unavailable
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs leading-relaxed text-amber-900">{eligibility.reason ?? 'Requests are disabled.'}</p>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" asChild className="text-xs">
              <Link to="/training">Open Training & profiles</Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="text-xs">
              <Link to="/bookings">My bookings</Link>
            </Button>
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-amber-800/80">
            Demo guard: the failed attempt is written to the audit log; no booking is created.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm">Request a booking</CardTitle>
        <p className="text-[11px] text-muted-foreground">Validated against conflicts, rules and limits at submit time.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-2.5">
          <div className="space-y-1">
            <Label htmlFor="bk-start">Start</Label>
            <Input
              id="bk-start"
              type="datetime-local"
              value={start}
              onChange={(e) => {
                setProposalStart(e.target.value);
                const s = Date.parse(e.target.value);
                if (Number.isFinite(s) && Date.parse(end) <= s) {
                  setProposalEnd(toLocalInputValue(new Date(s + 2 * 3_600_000)));
                }
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bk-end">End</Label>
            <Input id="bk-end" type="datetime-local" value={end} onChange={(e) => setProposalEnd(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="bk-purpose">Purpose of use *</Label>
          <Textarea
            id="bk-purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="What will you use the resource for? The owner reads this before approving."
            rows={2}
          />
        </div>

        <div className="space-y-1.5 rounded-md border border-border bg-muted/30 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
          <p className="flex items-center justify-between gap-2">
            <span>Duration</span>
            <span className={cn('font-semibold', duration > resource.limits.maxDurationHours && 'text-red-700')}>{fmtHours(duration)} / {resource.limits.maxDurationHours} h max</span>
          </p>
          <p className="flex items-center justify-between gap-2">
            <span>Estimated cost</span>
            <span className="font-semibold">{resource.costPerHour === 0 ? 'Free' : `₹${Math.round(resource.costPerHour * duration)}`}</span>
          </p>
          <p className="flex items-center justify-between gap-2">
            <span>Window status</span>
            <span className={cn('font-semibold', conflicts.length ? 'text-amber-700' : 'text-emerald-700')}>
              {conflicts.length ? `${conflicts.length} approved conflict${conflicts.length > 1 ? 's' : ''}` : 'Clear of committed bookings'}
            </span>
          </p>
        </div>
        {waitlistNote ? (
          <p className="flex items-start gap-1.5 rounded-md border border-violet-200 bg-violet-50 px-2.5 py-2 text-[11px] leading-relaxed text-violet-900">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {waitlistNote}
          </p>
        ) : null}
        {needsSafety ? (
          <label className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-2.5 py-2 text-[11px] leading-relaxed text-red-900">
            <input type="checkbox" className="mt-0.5 h-3.5 w-3.5 accent-red-700" checked={safetyOk} onChange={(e) => setSafetyOk(e.target.checked)} />
            I have read the safety instructions for this resource and will follow them. I am responsible for any damage caused by not following them.
          </label>
        ) : null}
        <Button className="w-full" onClick={onSubmit} disabled={needsSafety && !safetyOk}>
          Submit request
        </Button>
        <p className="text-center text-[10px] text-muted-foreground">
          Submitting as {user.name} (demo persona) — the owner must still approve; approval re-checks everything.
        </p>
      </CardContent>
    </Card>
  );
}

/* helpers */
function toIso(local: string): string {
  return new Date(local).toISOString();
}

function withTomorrow10(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d;
}

function withTomorrow12(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(12, 0, 0, 0);
  return d;
}
