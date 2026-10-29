import { useMemo, useState } from 'react';
import { Compass, Search, Settings2 } from 'lucide-react';
import { Input, Select } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ResourceCard } from '@/components/ResourceCard';
import { ResourceFormDialog, emptyResourceForm, type ResourceFormState } from '@/components/ResourceFormDialog';
import { EmptyState } from '@/components/common';
import { useStore } from '@/store/store';
import { CATEGORY_META } from '@/lib/config';
import { resourcesVisibleTo } from '@/lib/derive';
import { cn } from '@/lib/utils';
import type { ResourceCategory } from '@/types';

const CATEGORY_ORDER: ResourceCategory[] = ['Electronics', 'Photography', 'Fabrication', 'AV Equipment', 'Meeting Spaces', 'Computing'];

type AvailabilityFilter = 'all' | 'available' | 'in_use' | 'maintenance';
type TrainingFilter = 'all' | 'clear' | 'need';

export function ExplorePage() {
  const { state, user } = useStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | ResourceCategory>('all');
  const [location, setLocation] = useState('all');
  const [availability, setAvailability] = useState<AvailabilityFilter>('all');
  const [training, setTraining] = useState<TrainingFilter>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<ResourceFormState>(() => emptyResourceForm('usr-meera'));

  const visible = useMemo(() => resourcesVisibleTo(state, user), [state, user]);
  const locations = useMemo(() => Array.from(new Set(visible.map((r) => r.location))).sort(), [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return visible.filter((r) => {
      if (category !== 'all' && r.category !== category) return false;
      if (location !== 'all' && r.location !== location) return false;
      if (availability !== 'all' && r.status !== availability) return false;
      if (training !== 'all') {
        const missing = r.eligibility.requiredTrainings.some((id) => !user.trainings.some((t) => t.trainingId === id));
        if (training === 'clear' && missing) return false;
        if (training === 'need' && !missing) return false;
      }
      if (!q) return true;
      const haystack = `${r.name} ${r.model ?? ''} ${r.description} ${r.location} ${r.category}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [visible, query, category, location, availability, training, user.trainings]);

  // Anyone can offer a resource; non-admin listings go to Campus Operations for approval.
  const canAdd = true;
  // Owners manage their own listings; the main grid shows only what they can book.
  const myListings = filtered.filter((r) => r.ownerId === user.id);
  const bookable = filtered.filter((r) => r.ownerId !== user.id);
  const pending = visible.filter((r) => r.publication === 'pending');

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Explore shared resources</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {filtered.length} of {visible.length} resources at Parul University · search, filters and
            training gates are live.
          </p>
        </div>
        {canAdd ? (
          <Button
            size="sm"
            onClick={() => {
              setFormInitial(emptyResourceForm(user.role !== 'admin' ? user.id : state.users.find((u) => u.role === 'owner')?.id ?? 'usr-meera'));
              setFormOpen(true);
            }}
          >
            <Settings2 className="h-4 w-4" /> {user.role === 'admin' ? 'New resource' : user.role === 'student' ? 'Share a resource' : 'Request new resource'}
          </Button>
        ) : null}
      </header>

      <Card className="p-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, model, description, location…"
              className="pl-8"
              aria-label="Search resources"
            />
          </div>
          <Select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} aria-label="Category filter">
            <option value="all">All categories</option>
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select value={location} onChange={(e) => setLocation(e.target.value)} aria-label="Location filter">
            <option value="all">All locations</option>
            {locations.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Select value={availability} onChange={(e) => setAvailability(e.target.value as AvailabilityFilter)} aria-label="Availability filter">
              <option value="all">Any status</option>
              <option value="available">Available</option>
              <option value="in_use">In use</option>
              <option value="maintenance">Maintenance</option>
            </Select>
            <Select value={training} onChange={(e) => setTraining(e.target.value as TrainingFilter)} aria-label="Training filter">
              <option value="all">Any training</option>
              <option value="clear">Ready for me</option>
              <option value="need">Need training</option>
            </Select>
          </div>
        </div>
        {(query || category !== 'all' || location !== 'all' || availability !== 'all' || training !== 'all') ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">Filters active:</span>
            {query ? <FilterChip label={`“${query}”`} onClear={() => setQuery('')} /> : null}
            {category !== 'all' ? <FilterChip label={category} onClear={() => setCategory('all')} /> : null}
            {location !== 'all' ? <FilterChip label={location} onClear={() => setLocation('all')} /> : null}
            {availability !== 'all' ? <FilterChip label={availability} onClear={() => setAvailability('all')} /> : null}
            {training !== 'all' ? <FilterChip label={training === 'clear' ? 'Ready for me' : 'Need training'} onClear={() => setTraining('all')} /> : null}
          </div>
        ) : null}
      </Card>

      {pending.length > 0 ? (
        <Card className="border-amber-300 bg-amber-50/70 p-3 text-xs text-amber-900">
          <span className="font-semibold">{pending.length} resource{pending.length > 1 ? 's' : ''} awaiting Campus Operations approval:</span>{' '}
          {pending.map((r) => r.name).join(', ')}.{' '}
          {user.role === 'admin' ? 'Open one to approve or reject it.' : 'Students cannot see or book it until it is approved.'}
        </Card>
      ) : null}

      {myListings.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">My listings <span className="font-normal text-muted-foreground">· resources you own and manage</span></h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {myListings.map((r) => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </div>
          <h2 className="pt-3 text-sm font-semibold">Available to book <span className="font-normal text-muted-foreground">· resources from other owners</span></h2>
        </section>
      ) : null}

      {bookable.length === 0 ? (
        <EmptyState icon={Compass} title="No resources match those filters" description="Try clearing the search or widening the category. Demo catalogue covers eight shared resources." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {bookable.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </div>
      )}

      <p className="text-center text-[11px] text-muted-foreground">
        Availability is live: a resource is “in use” whenever an approved/checked-out booking covers now.
      </p>

      <ResourceFormDialog open={formOpen} onOpenChange={setFormOpen} initial={formInitial} />
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <Badge variant="secondary" className="gap-1 pr-1">
      {label}
      <button type="button" onClick={onClear} className={cn('rounded-full px-1 text-[10px] text-muted-foreground hover:bg-border/60 hover:text-foreground')} aria-label={`Clear ${label}`}>
        ×
      </button>
    </Badge>
  );
}

export { CATEGORY_META };
