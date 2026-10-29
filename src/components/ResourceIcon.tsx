import {
  Boxes,
  Camera,
  CircuitBoard,
  DoorClosed,
  FlaskConical,
  Laptop,
  Projector,
  Presentation,
  ScanEye,
  Thermometer,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORY_META } from '@/lib/config';
import type { Resource } from '@/types';

const ICONS: Record<string, LucideIcon> = {
  CircuitBoard,
  Camera,
  Boxes,
  Presentation,
  Projector,
  Thermometer,
  Zap,
  Laptop,
  FlaskConical,
  DoorClosed,
  ScanEye,
};

export function ResourceIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICONS[icon] ?? CircuitBoard;
  return <Icon className={className} />;
}

/** Banner tile for resource cards: category gradient + icon. */
export function ResourceBanner({ resource, className }: { resource: Resource; className?: string }) {
  const meta = CATEGORY_META[resource.category];
  return (
    <div className={cn('relative flex h-32 items-center justify-center bg-gradient-to-br', meta.swatch, className)}>
      <ResourceIcon icon={resource.icon} className="h-11 w-11 text-white/90" />
      {resource.status === 'maintenance' ? (
        <span className="absolute right-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-red-700">
          Maintenance
        </span>
      ) : null}
    </div>
  );
}
