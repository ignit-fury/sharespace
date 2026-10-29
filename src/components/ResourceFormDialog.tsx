import { useState, type FormEvent } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input, Label, Select, Textarea } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useStore } from '@/store/store';
import type { Resource, ResourceCategory } from '@/types';

const CATEGORY_OPTIONS: ResourceCategory[] = ['Electronics', 'Photography', 'Fabrication', 'AV Equipment', 'Meeting Spaces', 'Computing'];

export interface ResourceFormState {
  id?: string;
  name: string;
  model?: string;
  category: ResourceCategory;
  icon: string;
  description: string;
  location: string;
  ownerId: string;
  costPerHour: string;
  status: 'available' | 'maintenance';
  maintenanceNote?: string;
  requiredTrainings: string[];
  maxDurationHours: string;
  dailyLimitHours: string;
  weeklyLimitHours: string;
  usageRules: string;
  safetyInstructions: string;
}

export function emptyResourceForm(ownerId: string): ResourceFormState {
  return {
    name: '',
    model: '',
    category: 'Electronics',
    icon: 'CircuitBoard',
    description: '',
    location: '',
    ownerId,
    costPerHour: '0',
    status: 'available',
    requiredTrainings: [],
    maxDurationHours: '8',
    dailyLimitHours: '8',
    weeklyLimitHours: '20',
    usageRules: '',
    safetyInstructions: '',
  };
}

export function resourceToForm(r: Resource): ResourceFormState {
  return {
    id: r.id,
    name: r.name,
    model: r.model ?? '',
    category: r.category,
    icon: r.icon,
    description: r.description,
    location: r.location,
    ownerId: r.ownerId,
    costPerHour: String(r.costPerHour),
    status: r.status,
    maintenanceNote: r.maintenanceNote ?? '',
    requiredTrainings: r.eligibility.requiredTrainings,
    maxDurationHours: String(r.limits.maxDurationHours),
    dailyLimitHours: r.limits.dailyLimitHours == null ? '' : String(r.limits.dailyLimitHours),
    weeklyLimitHours: r.limits.weeklyLimitHours == null ? '' : String(r.limits.weeklyLimitHours),
    usageRules: r.usageRules.join('\n'),
    safetyInstructions: (r.safetyInstructions ?? []).join('\n'),
  };
}

export function getResourceIconOptions(): string[] {
  return ['CircuitBoard', 'Camera', 'Boxes', 'Presentation', 'Projector', 'Thermometer', 'Zap', 'Laptop', 'FlaskConical', 'ScanEye'];
}

export function ResourceFormDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: ResourceFormState;
}) {
  const { state, user, actions } = useStore();
  const { toast } = useToast();
  const [form, setForm] = useState<ResourceFormState>(initial);
  const [key, setKey] = useState('');
  // Re-seed local state when target changes
  const targetKey = `${initial.id ?? 'new'}-${open}`;
  if (key !== targetKey) {
    setKey(targetKey);
    setForm(initial);
  }

  // Admins pick any staff owner; keep the current owner listed too (e.g. a student lender) so editing never reassigns it.
  const owners = user.role !== 'admin' ? [user] : state.users.filter((u) => u.role === 'owner' || u.role === 'admin' || u.id === form.ownerId);
  const trainings = state.trainings;

  const set = <K extends keyof ResourceFormState>(field: K, value: ResourceFormState[K]) =>
    setForm((f) => ({ ...f, [field]: value }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = actions.saveResource({
      id: form.id,
      name: form.name,
      model: form.model,
      category: form.category,
      icon: form.icon,
      description: form.description,
      location: form.location,
      ownerId: form.ownerId,
      costPerHour: Number(form.costPerHour) || 0,
      status: form.status,
      maintenanceNote: form.maintenanceNote,
      requiredTrainings: form.requiredTrainings,
      maxDurationHours: Number(form.maxDurationHours) || 1,
      dailyLimitHours: form.dailyLimitHours ? Number(form.dailyLimitHours) : null,
      weeklyLimitHours: form.weeklyLimitHours ? Number(form.weeklyLimitHours) : null,
      usageRules: form.usageRules,
      safetyInstructions: form.safetyInstructions,
    });
    if (result.ok) {
      if (result.detail === 'pending') {
        toast('success', 'Request sent to Campus Operations', 'The resource will be published once they approve it.');
      } else {
        toast('success', form.id ? 'Resource updated' : 'Resource created', 'The audit log records this catalog change.');
      }
      onOpenChange(false);
    } else {
      toast('error', 'Could not save resource', result.reason);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{form.id ? 'Edit resource' : user.role !== 'admin' ? 'Request a new resource' : 'Register a resource'}</DialogTitle>
          <DialogDescription>
            {!form.id && user.role !== 'admin'
              ? 'Campus Operations reviews every new resource. It is published for booking only after they approve it.'
              : 'Catalog change — recorded in the audit log with actor and field list.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="res-name">Name *</Label>
              <Input id="res-name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Soldering Station" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="res-model">Model</Label>
              <Input id="res-model" value={form.model} onChange={(e) => set('model', e.target.value)} placeholder="Weller WE1010" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="res-cat">Category</Label>
              <Select id="res-cat" value={form.category} onChange={(e) => set('category', e.target.value as ResourceCategory)}>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="res-icon">Icon</Label>
              <Select id="res-icon" value={form.icon} onChange={(e) => set('icon', e.target.value)}>
                {getResourceIconOptions().map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="res-owner">Owner</Label>
              <Select id="res-owner" value={form.ownerId} onChange={(e) => set('ownerId', e.target.value)}>
                {owners.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="res-location">Location *</Label>
              <Input id="res-location" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="MKB-104" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="res-cost" hint="₹/hr — 0 = free">
                Cost
              </Label>
              <Input id="res-cost" type="number" min={0} step={5} value={form.costPerHour} onChange={(e) => set('costPerHour', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="res-status">Status</Label>
              <Select id="res-status" value={form.status} onChange={(e) => set('status', e.target.value as 'available' | 'maintenance')}>
                <option value="available">Available</option>
                <option value="maintenance">Under maintenance</option>
              </Select>
            </div>
          </div>
          {form.status === 'maintenance' ? (
            <div className="space-y-1">
              <Label htmlFor="res-note" hint="shown to users">
                Maintenance note
              </Label>
              <Input id="res-note" value={form.maintenanceNote} onChange={(e) => set('maintenanceNote', e.target.value)} placeholder="Back in service on Friday" />
            </div>
          ) : null}
          <div className="space-y-1">
            <Label htmlFor="res-desc">Description *</Label>
            <Textarea id="res-desc" value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="res-max" hint="hours">
                Max per booking
              </Label>
              <Input id="res-max" type="number" min={0.5} step={0.5} value={form.maxDurationHours} onChange={(e) => set('maxDurationHours', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="res-daily" hint="blank = none">
                Daily cap
              </Label>
              <Input id="res-daily" type="number" min={0} step={0.5} value={form.dailyLimitHours} onChange={(e) => set('dailyLimitHours', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="res-weekly" hint="blank = none">
                Weekly cap
              </Label>
              <Input id="res-weekly" type="number" min={0} step={0.5} value={form.weeklyLimitHours} onChange={(e) => set('weeklyLimitHours', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Required training</Label>
            <div className="flex flex-wrap gap-1.5">
              {trainings.map((t) => {
                const active = form.requiredTrainings.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      set('requiredTrainings', active ? form.requiredTrainings.filter((x) => x !== t.id) : [...form.requiredTrainings, t.id])
                    }
                    className={
                      'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ' +
                      (active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted/60')
                    }
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="res-rules" hint="one per line">
              Usage rules
            </Label>
            <Textarea id="res-rules" value={form.usageRules} onChange={(e) => set('usageRules', e.target.value)} placeholder={'Wear the ESD strap for board work.\nRun the fume extractor.'} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="res-safety" hint="one per line · leave empty for rooms and halls">
              Safety instructions (handle with care)
            </Label>
            <Textarea
              id="res-safety"
              value={form.safetyInstructions}
              onChange={(e) => set('safetyInstructions', e.target.value)}
              placeholder={'The tip reaches 350 °C — always use the holder.\nWear safety glasses.'}
            />
            <p className="text-[10px] text-muted-foreground">Borrowers must accept these before they can request the resource.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{form.id ? 'Save changes' : user.role !== 'admin' ? 'Send for approval' : 'Create resource'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
