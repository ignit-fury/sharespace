import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function mins(date: Date) {
  const m = date.getMinutes();
  return m === 0 ? '' : ':' + String(m).padStart(2, '0');
}

function clock(date: Date) {
  const h24 = date.getHours();
  const suffix = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}${mins(date)} ${suffix}`;
}

function stamp(ms: number) {
  const d = new Date(ms);
  return { d, day: d.getDate(), mon: MONTHS[d.getMonth()], dow: DAYS[d.getDay()], sameYear: d.getFullYear() === new Date().getFullYear() };
}

/** "Sat, Nov 1 · 10:00 AM" — compact, for tables and rows. */
export function fmtDateTime(iso: string): string {
  const { d, dow, mon, day } = stamp(Date.parse(iso));
  return `${dow}, ${mon} ${day} · ${clock(d)}`;
}

/** "Nov 1, 10:00 AM – 12:30 PM" or multi-day ranges with both dates. */
export function fmtRange(startIso: string, endIso: string): string {
  const s = stamp(Date.parse(startIso));
  const e = stamp(Date.parse(endIso));
  const sameDay = s.day === e.day && s.mon === e.mon;
  if (sameDay) return `${s.mon} ${s.day}, ${clock(s.d)} – ${clock(e.d)}`;
  return `${s.mon} ${s.day}, ${clock(s.d)} – ${e.mon} ${e.day}, ${clock(e.d)}`;
}

/** "28 Oct 2026" for audit rows. */
export function fmtDate(iso: string): string {
  const { mon, day, sameYear } = stamp(Date.parse(iso));
  const year = sameYear ? '' : `, ${new Date(iso).getFullYear()}`;
  return `${mon} ${day}${year}`;
}

/** "2 h ago" / "in 3 h" / "12 Oct" style relative stamp. */
export function timeAgo(iso: string, now = Date.now()): string {
  const diff = Date.parse(iso) - now;
  const abs = Math.abs(diff);
  const future = diff > 0;
  const mins = Math.round(abs / 60000);
  const hours = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);
  let text: string;
  if (mins < 1) return 'just now';
  if (mins < 60) text = `${mins} min`;
  else if (hours < 24) text = `${hours} h`;
  else if (days < 7) text = `${days} d`;
  else {
    const { mon, day } = stamp(Date.parse(iso));
    return `${mon} ${day}`;
  }
  return future ? `in ${text}` : `${text} ago`;
}

export function fmtHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded} h`;
}

export function fmtCost(perHour: number): string {
  if (perHour === 0) return 'Free';
  return `₹${perHour}/hr`;
}

/** "Sat · Nov 1" for calendar-ish lists. */
export function fmtShortDay(iso: string): string {
  const { dow, mon, day } = stamp(Date.parse(iso));
  return `${dow} · ${mon} ${day}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}
