import type { ResourceCategory } from '@/types';

export const SEED_VERSION = 4;
export const STORAGE_KEY = 'sharespace-demo-state-v1';

/** Global fair-allocation rule: how many bookings a user may hold at once. */
export const MAX_ACTIVE_BOOKINGS_PER_USER = 3;

/** Booking must start within this many days ahead. */
export const MAX_LEAD_DAYS = 14;

/** Photo downscale settings so localStorage stays small. */
export const PHOTO_MAX_DIM = 900;
export const PHOTO_JPEG_QUALITY = 0.72;

export const CATEGORY_META: Record<ResourceCategory, { swatch: string; badge: string }> = {
  Electronics: { swatch: 'from-teal-600/90 to-teal-800', badge: 'bg-teal-50 text-teal-800 border-teal-200' },
  Photography: { swatch: 'from-orange-500/85 to-amber-700', badge: 'bg-amber-50 text-amber-800 border-amber-200' },
  Fabrication: { swatch: 'from-indigo-500/85 to-indigo-800', badge: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  'AV Equipment': { swatch: 'from-sky-500/85 to-sky-800', badge: 'bg-sky-50 text-sky-800 border-sky-200' },
  'Meeting Spaces': { swatch: 'from-emerald-500/85 to-emerald-700', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  Computing: { swatch: 'from-slate-600/90 to-slate-800', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export const TRAINING_NAME_BY_ID: Record<string, string> = {};
