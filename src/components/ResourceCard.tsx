import { Link } from 'react-router-dom';
import { MapPin, Clock, GraduationCap, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResourceBanner, ResourceIcon } from '@/components/ResourceIcon';
import { UserAvatar } from '@/components/common';
import { CATEGORY_META } from '@/lib/config';
import { resourceAvailability } from '@/lib/derive';
import { useStore } from '@/store/store';
import type { Resource } from '@/types';
import { cn, fmtCost } from '@/lib/utils';

export function ResourceCard({ resource }: { resource: Resource }) {
  const { state, user } = useStore();
  const availability = resourceAvailability(state, resource);
  const owner = state.users.find((u) => u.id === resource.ownerId)!;
  const missing = resource.eligibility.requiredTrainings.filter((id) => !user.trainings.some((t) => t.trainingId === id));
  const meta = CATEGORY_META[resource.category];

  return (
    <Link to={`/resources/${resource.id}`} className="block transition-shadow hover:shadow-pop rounded-lg">
      <Card className="flex h-full flex-col overflow-hidden">
        <ResourceBanner resource={resource} />
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-center gap-2">
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
            {resource.publication === 'pending' ? (
              <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">Awaiting approval</span>
            ) : resource.publication === 'rejected' ? (
              <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">Rejected</span>
            ) : null}
          </div>
          <h3 className="mt-2 text-sm font-semibold leading-snug text-foreground">{resource.name}</h3>
          {resource.model ? <p className="text-xs text-muted-foreground">{resource.model}</p> : null}
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{resource.description}</p>
          <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{resource.location}</span>
            </p>
            <p className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 shrink-0" /> ≤ {resource.limits.maxDurationHours} h per booking
            </p>
            <p className="flex items-center gap-1.5">
              <GraduationCap className="h-3 w-3 shrink-0" />
              {resource.ownerId === user.id ? (
                'Your listing — you manage it'
              ) : missing.length > 0 ? (
                <span className="font-medium text-amber-700">Training required — tap to see</span>
              ) : (
                'You are trained for this'
              )}
            </p>
          </div>
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/70 pt-3">
            <div className="flex items-center gap-2">
              <UserAvatar user={owner} size="sm" />
              <span className="text-[11px] leading-tight">
                <span className="block font-medium text-foreground">{owner.name}</span>
                <span className="block text-[10px] text-muted-foreground">Owner</span>
              </span>
            </div>
            <Badge variant="secondary" className="shrink-0 gap-1">
              <Wallet className="h-3 w-3" /> {fmtCost(resource.costPerHour)}
            </Badge>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export { ResourceIcon };
