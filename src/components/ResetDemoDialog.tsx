import { CalendarDays, DatabaseZap, RotateCcw, ScrollText, ShieldAlert, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useStore } from '@/store/store';
import { fmtDateTime } from '@/lib/utils';

export function ResetDemoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state, actions } = useStore();
  const { toast } = useToast();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reset demo data?</DialogTitle>
          <DialogDescription>
            Reloads the fictional seed dataset — any bookings, incidents or training you added in this browser disappear. The
            audit trail restarts from the seed. This only affects the local demo; there is no server to touch.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          <li className="flex items-center gap-2">
            <DatabaseZap className="h-3.5 w-3.5 text-teal-700" /> {state.resources.length} resources re-created from seed
          </li>
          <li className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-teal-700" /> {state.bookings.length} synthetic bookings restored
          </li>
          <li className="flex items-center gap-2">
            <ShieldAlert className="h-3.5 w-3.5 text-teal-700" /> {state.incidents.length} incidents restored (1 resolved, 1 open)
          </li>
          <li className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-teal-700" /> Personas: Aanya Shah, Dr. Meera Patel, Campus Operations
          </li>
          <li className="flex items-center gap-2">
            <ScrollText className="h-3.5 w-3.5 text-teal-700" /> Current audit keeps {state.audit.length} events until reset
          </li>
        </ul>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep my data
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              actions.resetDemo();
              onOpenChange(false);
              toast('info', 'Demo data reset', `Fresh fictional dataset loaded at ${fmtDateTime(new Date().toISOString())}.`);
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Reset now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
