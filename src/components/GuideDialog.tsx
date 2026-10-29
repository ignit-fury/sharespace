import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/store';

const STEPS: { title: string; body: string; hint: string }[] = [
  {
    title: 'Find a resource',
    body: 'Open Explore and pick “Soldering Station · Weller WE1010” as the demo target. Search, category and training filters actually work.',
    hint: 'Explore',
  },
  {
    title: 'Observe the eligibility block',
    body: 'Open the resource and read the eligibility panel: Aanya has verified membership and general safety, but no Electronics Lab Training yet. Try to submit a request — it is blocked with an explanation instead of creating a booking.',
    hint: 'Resource page',
  },
  {
    title: 'Complete the training',
    body: 'Go to Training & profiles, start “Electronics Lab Training” and finish the short simulated module. The completion is logged to the audit trail with a disclosure that it is not real institutional verification.',
    hint: 'Training',
  },
  {
    title: 'Submit a request',
    body: 'Back on the resource page, the blocked panel is gone. Choose a window (default tomorrow), write a purpose, and submit. If the slot overlaps an approved booking you land on the transparent waitlist instead.',
    hint: 'Resource page',
  },
  {
    title: 'Approve it as the owner',
    body: 'Switch the demo persona to Dr. Meera Patel. In Bookings → Approval queue, open the request (owners and students can also offer their own resources; Campus Operations must approve each listing before anyone can book it). Approval re-checks eligibility and availability at that moment; two approved bookings can never overlap. Rejections need a written reason.',
    hint: 'Bookings',
  },
  {
    title: 'Check in and return',
    body: 'Switch back to Aanya (or stay as the owner). In the approved booking, record check-in: actual time, initial condition, notes and an optional photo. Need more time? "Request extension" goes to the owner, who approves or refuses with a reason. Later, complete the return form with the final condition. The bell (top right) notifies each person about approvals, extensions, reminders and overdue returns.',
    hint: 'Bookings',
  },
  {
    title: 'Report and resolve an incident',
    body: 'From any booking, report damage, delay, safety or dispute with a severity. As the owner or Campus Operations, move it under review and resolve it with a written note. No automatic penalties — humans decide.',
    hint: 'Incidents',
  },
  {
    title: 'Review the audit log',
    body: 'Every step above — blocks, requests, decisions, waitlisting, condition reports, training — is in the Audit log with ID, actor, timestamp, subject and reasons. Entries cannot be edited or deleted from the UI.',
    hint: 'Audit log',
  },
];

export function GuideDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state } = useStore();
  const seeded = `Stored locally: ${state.resources.length} resources · ${state.bookings.length} bookings · ${state.incidents.length} incidents · ${state.audit.length} audit events.`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Guide — how ShareSpace works in 8 steps</DialogTitle>
          <DialogDescription>
            ShareSpace is running in demo mode with fictional data for Parul University. Nothing here is real
            institutional verification. {seeded}
          </DialogDescription>
        </DialogHeader>
        <ol className="space-y-2.5">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3 rounded-md border border-border bg-muted/30 p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  {s.title}
                  <Badge variant="outline" className="font-normal text-[10px] text-muted-foreground">
                    {s.hint}
                  </Badge>
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="rounded-md border border-border bg-card p-3 text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Fair allocation, in plain words:</span> verified membership +
          required training + a max of {state.maxActiveBookingsPerUser} active bookings + per-resource daily/weekly hour caps +
          one approved booking at a time per slot. Conflicts become a FIFO waitlist with recent-usage as the tie-breaker.
        </div>
        <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
          Start the walkthrough
        </Button>
      </DialogContent>
    </Dialog>
  );
}
