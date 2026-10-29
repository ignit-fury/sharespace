import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  CheckCircle2,
  Clock,
  Download,
  History,
  ShieldAlert,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/form';
import { useToast } from '@/components/ui/toast';
import { useStore } from '@/store/store';
import {
  fmtDateTime,
  fmtRange,
  timeAgo,
} from '@/lib/utils';
import {
  canCancel,
  canCheckIn,
  effectiveStatus,
  evaluateApproval,
  getResource,
  getUser,
  isCommitted,
  waitlistPosition,
} from '@/lib/rules';
import { conditionLabel } from '@/lib/actions';
import { fileToScaledDataUrl } from '@/lib/photo';
import { ConditionBadge, StatusBadge } from '@/components/StatusBadge';
import { IncidentReportDialog } from '@/components/IncidentDialogs';
import type { Condition } from '@/types';
import { cn } from '@/lib/utils';

export function BookingDetailDialog({
  bookingId,
  open,
  onOpenChange,
}: {
  bookingId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { state, user } = useStore();
  if (!bookingId) return null;
  const booking = state.bookings.find((b) => b.id === bookingId);
  if (!booking) return null;
  const resource = getResource(state, booking.resourceId);
  const borrower = getUser(state, booking.userId);
  const eff = effectiveStatus(booking);
  const status = eff;
  const wl = booking.status === 'waitlisted' ? waitlistPosition(state, booking) : undefined;
  const timeline = state.audit.filter((e) => e.entityType === 'booking' && e.entityId === booking.id).slice().reverse();
  const linkedIncidents = state.incidents.filter((i) => i.bookingId === booking.id);
  const canDecide = user.role === 'admin' || user.id === resource.ownerId;
  const isSelf = booking.userId === user.id;
  const approvalPreview = canDecide && (booking.status === 'requested' || booking.status === 'waitlisted') ? evaluateApproval(state, booking.id) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
            {resource.name}
            <StatusBadge status={status} />
          </DialogTitle>
          <DialogDescription>
            Booking {booking.id} · borrower <span className="font-medium text-foreground">{borrower.name}</span>
            {wl ? ` · waitlist position ${wl}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 text-xs sm:grid-cols-2">
          <div className="rounded-md border border-border bg-muted/30 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Reserved window</p>
            <p className="mt-0.5 font-semibold">{fmtRange(booking.start, booking.end)}</p>
          </div>
          <div className="rounded-md border border-border bg-muted/30 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Requested</p>
            <p className="mt-0.5 font-semibold">{fmtDateTime(booking.requestedAt)} ({timeAgo(booking.requestedAt)})</p>
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/30 px-2.5 py-2 text-xs">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Purpose</p>
          <p className="mt-0.5 leading-relaxed">{booking.purpose}</p>
        </div>

        {booking.status === 'rejected' || booking.status === 'cancelled' ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-xs leading-relaxed text-red-800">
            <span className="font-semibold">{booking.status === 'rejected' ? 'Rejected' : 'Cancelled'}:</span> {booking.decisionReason || 'No reason recorded.'}
          </p>
        ) : null}
        {booking.status === 'approved' || isCommitted(booking) ? (
          <p className="flex items-center gap-1.5 rounded-md border border-teal-200 bg-teal-50 px-2.5 py-2 text-xs text-teal-900">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            Approved {booking.decidedBy ? `by ${getUser(state, booking.decidedBy).name}` : ''}{booking.decidedAt ? ` · ${fmtDateTime(booking.decidedAt)}` : ''} — eligibility and availability were re-checked at decision time.
          </p>
        ) : null}
        {eff === 'overdue' ? (
          <p className="rounded-md border border-red-300 bg-red-100 px-2.5 py-2 text-xs font-medium text-red-800">
            Overdue: the return window passed on {fmtDateTime(booking.end)}. Record the return as soon as the item comes back, and consider a delay incident.
          </p>
        ) : null}

        {booking.safetyAcknowledgedAt ? (
          <p className="flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-2 text-xs text-muted-foreground">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-red-700" />
            {borrower.name} accepted the safety instructions on {fmtDateTime(booking.safetyAcknowledgedAt)}.
          </p>
        ) : null}

        <ExtensionSection bookingId={booking.id} canDecide={canDecide} />

        <ConditionRecordsSection bookingId={booking.id} />

        <div className="flex flex-wrap gap-2">
          {canDecide && (booking.status === 'requested' || booking.status === 'waitlisted') ? (
            <>
              <ApproveButton bookingId={booking.id} preview={approvalPreview} />
              <RejectFlow bookingId={booking.id} onDone={() => onOpenChange(false)} />
            </>
          ) : null}
          {canCheckIn(booking) && (isSelf || canDecide) ? <CheckInFlow bookingId={booking.id} /> : null}
          {booking.status === 'checked_out' && (isSelf || canDecide) ? <ReturnFlow bookingId={booking.id} /> : null}
          {isSelf && (booking.status === 'approved' || booking.status === 'checked_out') && booking.extension?.status !== 'pending' ? (
            <ExtensionRequestFlow bookingId={booking.id} />
          ) : null}
          {(canCancel(booking) && (isSelf || canDecide)) ? <CancelFlow bookingId={booking.id} /> : null}
          <ReportIncidentFlow bookingId={booking.id} />
        </div>

        {linkedIncidents.length > 0 ? (
          <div className="space-y-1" id="detail-incidents">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Linked incidents</p>
            {linkedIncidents.map((i) => (
              <p key={i.id} className="rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-[11px] text-foreground/80">
                <span className="font-semibold">{i.id}</span> · {i.category} · {i.severity} severity ·{' '}
                {i.status.replace('_', ' ')} — {i.description}
              </p>
            ))}
          </div>
        ) : null}

        <BookingTimeline bookingId={booking.id} events={timeline} />
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------- action flows */

function ApproveButton({ bookingId, preview }: { bookingId: string; preview: { ok: boolean; reason?: string } | null }) {
  const { actions } = useStore();
  const { toast } = useToast();
  const warning = preview && !preview.ok ? preview.reason : null;

  const approve = () => {
    const result = actions.approveBooking(bookingId);
    if (result.ok) {
      toast('success', 'Booking approved', 'Availability and eligibility were re-checked at approval time.');
    } else {
      toast('error', 'Approval refused', result.reason);
    }
  };

  return (
    <>
      <Button size="sm" onClick={approve}>
        <CheckCircle2 className="h-4 w-4" /> Approve
      </Button>
      {warning ? (
        <p className="w-full rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-900">
          Heads-up: {warning}
        </p>
      ) : null}
    </>
  );
}

function RejectFlow({ bookingId, onDone }: { bookingId: string; onDone?: () => void }) {
  const { actions } = useStore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  return (
    <>
      <Button variant="outline" size="sm" className="text-red-700 hover:text-red-800" onClick={() => setOpen(true)}>
        <XCircle className="h-4 w-4" /> Reject
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject request {bookingId}</DialogTitle>
            <DialogDescription>A written reason is required — the requester sees it verbatim.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="rej-reason">Reason *</Label>
            <Textarea id="rej-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="e.g. equipment reserved for the evaluation workshop that day" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Back
            </Button>
            <Button
              className="bg-red-700 hover:bg-red-800"
              onClick={() => {
                const result = actions.rejectBooking(bookingId, reason);
                if (result.ok) {
                  toast('success', 'Request rejected', 'The requester sees your written reason.');
                  setOpen(false);
                  setReason('');
                  onDone?.();
                } else {
                  toast('error', 'Could not reject', result.reason);
                }
              }}
            >
              Confirm rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CancelFlow({ bookingId }: { bookingId: string }) {
  const { actions } = useStore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" /> Cancel
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel booking {bookingId}</DialogTitle>
            <DialogDescription>Optional: add a note explaining the cancellation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="cnl-reason">Note (optional)</Label>
            <Textarea id="cnl-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Keep booking
            </Button>
            <Button
              className="bg-red-700 hover:bg-red-800"
              onClick={() => {
                const result = actions.cancelBooking(bookingId, reason || undefined);
                if (result.ok) {
                  toast('success', 'Booking cancelled', reason ? 'Your note is recorded in the audit log.' : undefined);
                  setOpen(false);
                  setReason('');
                } else {
                  toast('error', 'Could not cancel', result.reason);
                }
              }}
            >
              Cancel booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ------------------------------------------------------------ extensions */

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ExtensionRequestFlow({ bookingId }: { bookingId: string }) {
  const { state, actions } = useStore();
  const { toast } = useToast();
  const booking = state.bookings.find((b) => b.id === bookingId);
  const [open, setOpen] = useState(false);
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  if (!booking) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          // Suggest one more hour, measured from now if the booking already ran over.
          const base = Math.max(Date.parse(booking.end), Date.now());
          setEnd(toLocalInput(new Date(base + 3_600_000).toISOString()));
          setOpen(true);
        }}
      >
        <Clock className="h-4 w-4" /> Request extension
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Request more time</DialogTitle>
            <DialogDescription>
              Current end: {fmtDateTime(booking.end)}. The owner decides; the same hour limits and conflict checks apply as for a new booking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="ext-end">New end time *</Label>
              <Input id="ext-end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ext-reason">Why do you need more time? *</Label>
              <Textarea id="ext-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="e.g. Final test run took longer than planned." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Back
            </Button>
            <Button
              onClick={() => {
                const result = actions.requestExtension(bookingId, new Date(end).toISOString(), reason);
                if (result.ok) {
                  toast('success', 'Extension requested', 'The owner has been notified and will decide.');
                  setOpen(false);
                  setReason('');
                } else {
                  toast('error', 'Extension not possible', result.reason);
                }
              }}
            >
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ExtensionSection({ bookingId, canDecide }: { bookingId: string; canDecide: boolean }) {
  const { state, actions } = useStore();
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const booking = state.bookings.find((b) => b.id === bookingId);
  const ext = booking?.extension;
  if (!booking || !ext) return null;

  if (ext.status !== 'pending') {
    return (
      <p
        className={cn(
          'rounded-md border px-2.5 py-2 text-xs',
          ext.status === 'approved' ? 'border-teal-200 bg-teal-50 text-teal-900' : 'border-red-200 bg-red-50 text-red-800',
        )}
      >
        <span className="font-semibold">Extension {ext.status === 'approved' ? 'approved' : 'refused'}</span>
        {ext.decidedBy ? ` by ${getUser(state, ext.decidedBy).name}` : ''}
        {ext.status === 'approved' ? ` · new end ${fmtDateTime(ext.end)}` : ` · ${ext.decisionReason}`}
      </p>
    );
  }

  const decide = (approve: boolean) => {
    const result = actions.reviewExtension(bookingId, approve, reason);
    if (result.ok) {
      toast('success', approve ? 'Extension approved' : 'Extension refused', approve ? 'The booking end time has moved.' : 'The borrower sees your reason.');
      setReason('');
    } else {
      toast('error', 'Could not decide', result.reason);
    }
  };

  return (
    <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs text-amber-950">
      <p>
        <span className="font-semibold">Extension requested</span> until {fmtDateTime(ext.end)} · “{ext.reason}”
      </p>
      {canDecide ? (
        <>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Reason (required to refuse)" aria-label="Extension decision reason" />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => decide(true)}>
              <CheckCircle2 className="h-4 w-4" /> Approve extension
            </Button>
            <Button size="sm" variant="outline" className="text-red-700" onClick={() => decide(false)}>
              <XCircle className="h-4 w-4" /> Refuse
            </Button>
          </div>
        </>
      ) : (
        <p className="text-[11px] text-amber-900/80">Waiting for the owner. Your current end time still applies until they approve.</p>
      )}
    </div>
  );
}

/* --------------------------------------------------- check-in / return */

function useConditionForm() {
  const [condition, setCondition] = useState<Condition>('good');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const canSubmit = notes.trim().length > 0;
  return { condition, setCondition, notes, setNotes, photo, setPhoto, canSubmit };
}

function ConditionPicker({
  condition,
  setCondition,
  photo,
  setPhoto,
}: {
  condition: Condition;
  setCondition: (c: Condition) => void;
  photo?: string;
  setPhoto: (p?: string) => void;
}) {
  const options: { value: Condition; label: string; hint: string }[] = [
    { value: 'good', label: 'Good', hint: 'Works as expected' },
    { value: 'minor_wear', label: 'Minor wear', hint: 'Cosmetic marks, still fine' },
    { value: 'damaged', label: 'Damaged', hint: 'Needs repair before next use' },
  ];
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setCondition(o.value)}
            className={cn(
              'rounded-md border px-2 py-2 text-center text-[11px] transition-colors',
              condition === o.value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted/50',
            )}
          >
            <span className="block font-semibold">{o.label}</span>
            <span className="block text-[9px] leading-tight opacity-80">{o.hint}</span>
          </button>
        ))}
      </div>
      {!photo ? (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border px-3 py-3 text-[11px] text-muted-foreground hover:bg-muted/40">
          <Camera className="h-3.5 w-3.5" /> Attach photo (optional — stays in this browser)
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const dataUrl = await fileToScaledDataUrl(f);
              setPhoto(dataUrl);
            }}
          />
        </label>
      ) : (
        <div className="flex items-center gap-2">
          <img src={photo} alt="Condition preview" className="h-20 w-20 rounded-md border border-border object-cover" />
          <div className="text-[11px] leading-tight text-muted-foreground">
            <p className="font-medium text-foreground">Preview attached</p>
            <p>Stored downscaled in the local demo store.</p>
            <Button variant="ghost" size="sm" className="mt-0.5 h-7 gap-1 text-[11px]" onClick={() => setPhoto(undefined)}>
              Remove
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckInFlow({ bookingId }: { bookingId: string }) {
  const { actions } = useStore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const form = useConditionForm();

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" /> Check in
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Check-in · handover</DialogTitle>
            <DialogDescription>
              Records the actual handover time and the item's initial condition. In production this happens at pickup; in the demo
              you can simulate it now.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Initial condition *</Label>
              <ConditionPicker condition={form.condition} setCondition={form.setCondition} photo={form.photo} setPhoto={form.setPhoto} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ci-notes">Condition notes *</Label>
              <Textarea id="ci-notes" value={form.notes} onChange={(e) => form.setNotes(e.target.value)} rows={2} placeholder="e.g. Full kit counted at the desk; lenses clear." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Back
            </Button>
            <Button
              disabled={!form.canSubmit}
              onClick={() => {
                const result = actions.checkIn(bookingId, { condition: form.condition, notes: form.notes, photoDataUrl: form.photo });
                if (result.ok) {
                  toast('success', 'Check-in recorded', 'The booking is now checked out automatically.');
                  setOpen(false);
                } else {
                  toast('error', 'Could not check in', result.reason);
                }
              }}
            >
              Confirm check-in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ReturnFlow({ bookingId }: { bookingId: string }) {
  const { state, actions } = useStore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const form = useConditionForm();
  const booking = state.bookings.find((b) => b.id === bookingId);
  const initial = booking?.checkIn;

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Download className="h-4 w-4" /> Return
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record return</DialogTitle>
            <DialogDescription>
              Marks the item back with the owner. Final condition is required. Overdue? The gap is tracked in the audit trail — no automatic penalty.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {initial ? (
              <p className="rounded-md border border-border bg-muted/30 px-2.5 py-2 text-[11px] text-muted-foreground">
                Check-in condition: {conditionLabel(initial.condition)} — {initial.notes}
              </p>
            ) : null}
            <div className="space-y-1">
              <Label>Final condition *</Label>
              <ConditionPicker condition={form.condition} setCondition={form.setCondition} photo={form.photo} setPhoto={form.setPhoto} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rt-notes">Return notes *</Label>
              <Textarea id="rt-notes" value={form.notes} onChange={(e) => form.setNotes(e.target.value)} rows={2} placeholder="e.g. Tips tinned; bench cleaned; station returned to slot 3." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Back
            </Button>
            <Button
              disabled={!form.canSubmit}
              onClick={() => {
                const result = actions.returnBooking(bookingId, { condition: form.condition, notes: form.notes, photoDataUrl: form.photo });
                if (result.ok) {
                  toast('success', 'Return recorded', 'Thanks — the item is available for the next borrower.');
                  setOpen(false);
                } else {
                  toast('error', 'Could not record return', result.reason);
                }
              }}
            >
              Confirm return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ReportIncidentFlow({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <ShieldAlert className="h-4 w-4" /> Report incident
      </Button>
      <IncidentReportDialog open={open} onOpenChange={setOpen} presetBookingId={bookingId} />
    </>
  );
}

/* -------------------------------------------------------- records / timeline */

function ConditionRecordsSection({ bookingId }: { bookingId: string }) {
  const { state } = useStore();
  const booking = state.bookings.find((b) => b.id === bookingId);
  if (!booking) return null;
  const records: { at: string; by?: string; condition: Condition; notes: string; photo?: string; label: string }[] = [];
  if (booking.checkIn) {
    records.push({ at: booking.checkIn.at, by: booking.checkInBy, condition: booking.checkIn.condition, notes: booking.checkIn.notes, photo: booking.checkIn.photoDataUrl, label: 'Check-in condition' });
  }
  if (booking.returnReport) {
    records.push({ at: booking.returnReport.at, by: booking.returnBy, condition: booking.returnReport.condition, notes: booking.returnReport.notes, photo: booking.returnReport.photoDataUrl, label: 'Final condition' });
  }
  if (records.length === 0) return null;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {records.map((r) => (
        <div key={r.label} className="rounded-md border border-border bg-muted/30 p-2.5">
          <p className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
            {r.label}
            <ConditionBadge condition={r.condition} />
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-foreground/85">{r.notes}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {fmtDateTime(r.at)} · by {r.by ? getUser(state, r.by).name : '—'}
          </p>
          {r.photo ? <img src={r.photo} alt="Condition" className="mt-1.5 h-24 w-24 rounded-md border border-border object-cover" /> : null}
        </div>
      ))}
    </div>
  );
}

function BookingTimeline({ bookingId, events }: { bookingId: string; events: { id: string; at: string; action: string; actor: string; summary: string; details?: string }[] }) {
  const { state } = useStore();
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <History className="h-3.5 w-3.5" /> Booking history
      </p>
      {events.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">No events yet.</p>
      ) : (
        <ol className="space-y-1.5 border-l border-border pl-3">
          {events.map((e) => (
            <li key={e.id} className="relative text-[11px] leading-relaxed">
              <span className="absolute -left-[17px] top-1 h-2 w-2 rounded-full border-2 border-card bg-teal-600" />
              <p className="text-foreground/90">{e.summary}</p>
              <p className="text-[10px] text-muted-foreground">
                {fmtDateTime(e.at)} · {getUser(state, e.actor).name}{e.details ? ` · ${e.details}` : ''}
              </p>
            </li>
          ))}
        </ol>
      )}
      <p className="pt-1 text-[10px] text-muted-foreground">
        Full trail with reasons in the <Link to="/audit" className="font-medium text-primary underline-offset-2 hover:underline">Audit log</Link> — booking {bookingId}, immutable by design.
      </p>
    </div>
  );
}
