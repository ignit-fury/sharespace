import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label, Select, Textarea } from '@/components/ui/form';
import { useToast } from '@/components/ui/toast';
import { useStore } from '@/store/store';
import { isPublished } from '@/lib/rules';
import type { IncidentCategory, IncidentSeverity } from '@/types';

const CATEGORY_LABEL: Record<IncidentCategory, string> = {
  damage: 'Damage',
  delay: 'Delay / return overdue',
  safety: 'Safety issue',
  dispute: 'Dispute between users',
};

const SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  low: 'Low — note for the record',
  medium: 'Medium — review before next use',
  high: 'High — resource paused pending review',
};

/**
 * Incident creation dialog. From the bookings dialog it comes pre-linked to a
 * booking; from the Incidents page it lets the user pick a booking/resource.
 */
export function IncidentReportDialog({
  open,
  onOpenChange,
  presetBookingId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  presetBookingId?: string;
}) {
  const { state, actions } = useStore();
  const { toast } = useToast();
  const [bookingId, setBookingId] = useState(presetBookingId ?? '');
  const [resourceId, setResourceId] = useState('');
  const [category, setCategory] = useState<IncidentCategory>('damage');
  const [severity, setSeverity] = useState<IncidentSeverity>('medium');
  const [description, setDescription] = useState('');

  // Picker options: bookings the current persona is party to.
  const chooserBookings = state.bookings.filter((b) => {
    if (presetBookingId) return b.id === presetBookingId;
    const ownerScope =
      state.resources.find((r) => r.id === b.resourceId)?.ownerId === state.currentUserId || state.currentUserId === 'usr-admin';
    return b.userId === state.currentUserId || ownerScope;
  });

  const submit = () => {
    if (!bookingId && !resourceId) {
      toast('error', 'Link the incident', 'Pick the booking (or, for admins, a resource) this incident concerns.');
      return;
    }
    const result = actions.reportIncident({
      bookingId: bookingId || undefined,
      resourceId: bookingId ? undefined : resourceId || undefined,
      category,
      severity,
      description,
    });
    if (result.ok) {
      toast('success', 'Incident reported', `Recorded as ${result.detail} — owners and admins will review it.`);
      onOpenChange(false);
      setDescription('');
      setCategory('damage');
      setSeverity('medium');
    } else {
      toast('error', 'Could not report incident', result.reason);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report an incident</DialogTitle>
          <DialogDescription>
            Damage, delays, safety issues or disputes. Reporting is non-punitive — a human reviews it and decides.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!presetBookingId ? (
            <div className="space-y-1">
              <Label htmlFor="inc-link">Related booking</Label>
              <Select id="inc-link" value={bookingId} onChange={(e) => setBookingId(e.target.value)}>
                <option value="">— none (resource-level report) —</option>
                {chooserBookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.id} · {state.resources.find((r) => r.id === b.resourceId)?.name}
                  </option>
                ))}
              </Select>
              {!bookingId ? (
                <div className="space-y-1 pt-1">
                  <Label htmlFor="inc-res">Related resource (admin/owner reports)</Label>
                  <Select id="inc-res" value={resourceId} onChange={(e) => setResourceId(e.target.value)}>
                    <option value="">— choose a resource —</option>
                    {state.resources.filter(isPublished).map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Linked to booking <code>{presetBookingId}</code>:{' '}
              {state.resources.find((r) => r.id === state.bookings.find((b) => b.id === presetBookingId)?.resourceId)?.name}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="inc-cat">Category</Label>
              <Select id="inc-cat" value={category} onChange={(e) => setCategory(e.target.value as IncidentCategory)}>
                {(Object.keys(CATEGORY_LABEL) as IncidentCategory[]).map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="inc-sev">Severity</Label>
              <Select id="inc-sev" value={severity} onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}>
                {(Object.keys(SEVERITY_LABEL) as IncidentSeverity[]).map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">{SEVERITY_LABEL[severity]}</p>
          <div className="space-y-1">
            <Label htmlFor="inc-desc">What happened? *</Label>
            <Textarea id="inc-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Describe the damage, delay, safety concern or dispute…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Submit report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function IncidentResolveDialog({
  open,
  onOpenChange,
  incidentId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  incidentId: string;
}) {
  const { actions } = useStore();
  const { toast } = useToast();
  const [note, setNote] = useState('');

  const submit = () => {
    const result = actions.resolveIncident(incidentId, note);
    if (result.ok) {
      toast('success', 'Incident resolved', 'The written resolution is stored on the incident and audit log.');
      onOpenChange(false);
      setNote('');
    } else {
      toast('error', 'Could not resolve incident', result.reason);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Resolve incident {incidentId}</DialogTitle>
          <DialogDescription>
            A written resolution note is required. Note: ShareSpace never applies automatic penalties — decisions stay with people.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Label htmlFor="inc-note">Resolution note *</Label>
          <Textarea id="inc-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="What was reviewed, what was decided, and who decided…" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Back
          </Button>
          <Button onClick={submit}>Mark resolved</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
