/**
 * Centralized ShareSpace business rules.
 * Pure functions only — no React, no storage, no side effects.
 * The UI and the demo guide explain these rules in human terms; the functions
 * below are the single source of truth for every decision.
 */
import type { Booking, DisplayStatus, DemoState, Resource, Training, User } from '@/types';
import { MAX_LEAD_DAYS } from './config';

/** Statuses that physically occupy the resource — sufficient to block overlaps. */
const COMMITTED: Booking['status'][] = ['approved', 'checked_out'];

const MIN_DURATION_MINUTES = 15;

/* ---------------------------------------------------------------- lookups */

export function getUser(state: DemoState, id: string): User {
  return state.users.find((u) => u.id === id) ?? state.users[0];
}

export function getResource(state: DemoState, id: string): Resource {
  return state.resources.find((r) => r.id === id) ?? state.resources[0];
}

export function getBooking(state: DemoState, id: string): Booking | undefined {
  return state.bookings.find((b) => b.id === id);
}

export function getTraining(state: DemoState, id: string): Training | undefined {
  return state.trainings.find((t) => t.id === id);
}

export function trainingNames(state: DemoState, ids: string[]): string[] {
  return ids.map((id) => getTraining(state, id)?.name ?? id);
}

export function isPublished(resource: Resource): boolean {
  return (resource.publication ?? 'published') === 'published';
}

/* ----------------------------------------------------------- status maths */

/** Effective status: checked-out equipment past its window shows as overdue. */
export function effectiveStatus(booking: Booking, now = Date.now()): DisplayStatus {
  if (booking.status === 'checked_out' && Date.parse(booking.end) < now) return 'overdue';
  return booking.status;
}

export function isCommitted(booking: Booking, now = Date.now()): boolean {
  const eff = effectiveStatus(booking, now);
  return COMMITTED.includes(eff as Booking['status']);
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return Date.parse(aStart) < Date.parse(bEnd) && Date.parse(bStart) < Date.parse(aEnd);
}

export function overlapHours(aStart: string, aEnd: string, bStart: string, bEnd: string): number {
  const lo = Math.max(Date.parse(aStart), Date.parse(bStart));
  const hi = Math.min(Date.parse(aEnd), Date.parse(bEnd));
  return Math.max(0, (hi - lo) / 3_600_000);
}

export function durationHours(start: string, end: string): number {
  return (Date.parse(end) - Date.parse(start)) / 3_600_000;
}

export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/* -------------------------------------------------------------- eligibility */

export type BlockCode =
  | 'invalid_time'
  | 'past_time'
  | 'lead_time'
  | 'duration'
  | 'maintenance'
  | 'membership'
  | 'training'
  | 'daily_limit'
  | 'weekly_limit'
  | 'active_limit'
  | 'window_passed'
  | 'conflict'
  | 'unpublished'
  | 'own_resource';

export interface CheckResult {
  ok: boolean;
  code?: BlockCode;
  reason?: string;
}

const ok: CheckResult = { ok: true };

export function checkEligibility(
  user: User,
  resource: Resource,
  trainings: Training[],
  now = Date.now(),
): CheckResult {
  if (resource.ownerId === user.id) {
    return {
      ok: false,
      code: 'own_resource',
      reason: 'You own this resource, so you manage it rather than book it. Use the catalog entry and your bookings view instead.',
    };
  }
  if (!isPublished(resource)) {
    return {
      ok: false,
      code: 'unpublished',
      reason: 'This resource is waiting for Campus Operations to approve it. It cannot be booked until it is published.',
    };
  }
  if (resource.status === 'maintenance') {
    return {
      ok: false,
      code: 'maintenance',
      reason: `This resource is under maintenance${resource.maintenanceNote ? ` — ${resource.maintenanceNote}` : ''}. Requests are disabled until it is back in service.`,
    };
  }
  if (resource.eligibility.requiresMembership && !user.membershipVerified) {
    return {
      ok: false,
      code: 'membership',
      reason: 'Your campus membership is not verified. Access requires verified membership — contact Campus Operations.',
    };
  }
  if (!user.trainings.some((t) => t.trainingId === 'general-safety')) {
    return {
      ok: false,
      code: 'training',
      reason: 'General Safety Induction is required before booking any shared resource.',
    };
  }
  const missing = resource.eligibility.requiredTrainings.filter(
    (id) => !user.trainings.some((t) => t.trainingId === id),
  );
  if (missing.length > 0) {
    const names = missing
      .map((id) => trainings.find((t) => t.id === id)?.name ?? id)
      .join(', ');
    return {
      ok: false,
      code: 'training',
      reason: `This resource requires training you have not completed: ${names}. Complete the training module first — the demo module does not substitute real institutional verification.`,
    };
  }
  void now;
  return ok;
}

/* ------------------------------------------------------------ fair allocation */

/** Committed bookings of one user for one resource that overlap a window. */
function committedOverlappingWindow(
  bookings: Booking[],
  userId: string,
  resourceId: string,
  winStart: number,
  winEnd: number,
  now: number,
): Booking[] {
  return bookings.filter(
    (b) =>
      b.userId === userId &&
      b.resourceId === resourceId &&
      isCommitted(b, now) &&
      overlaps(new Date(winStart).toISOString(), new Date(winEnd).toISOString(), b.start, b.end),
  );
}

/** Hours already booked inside a window, counted only where they overlap it. */
function hoursInWindow(
  bookings: Booking[],
  userId: string,
  resourceId: string,
  winStart: number,
  winEnd: number,
  now: number,
): number {
  const ws = new Date(winStart).toISOString();
  const we = new Date(winEnd).toISOString();
  return committedOverlappingWindow(bookings, userId, resourceId, winStart, winEnd, now).reduce(
    (sum, b) => sum + overlapHours(ws, we, b.start, b.end),
    0,
  );
}

/** Hours used across all resources in the trailing 7 days (committed + returned). */
export function recentUsageHours(state: DemoState, userId: string, now = Date.now()): number {
  const winStart = new Date(now - 7 * 86_400_000).toISOString();
  const winEnd = new Date(now).toISOString();
  return state.bookings
    .filter(
      (b) =>
        b.userId === userId &&
        (b.status === 'returned' || isCommitted(b, now)) &&
        overlaps(winStart, winEnd, b.start, b.end),
    )
    .reduce((sum, b) => sum + overlapHours(winStart, winEnd, b.start, b.end), 0);
}

/** Bookings holding one of the user's concurrent slots: requested + committed. */
export function activeBookingCount(state: DemoState, userId: string, now = Date.now()): number {
  return state.bookings.filter(
    (b) =>
      b.userId === userId &&
      (b.status === 'requested' || isCommitted(b, now)),
  ).length;
}

/**
 * Fair-allocation limit check for a prospective booking.
 * Existing hours are counted where they overlap the limit window, so multi-day
 * bookings behave predictably, and it is easy to explain on screen.
 */
export function checkLimits(
  state: DemoState,
  user: User,
  resource: Resource,
  start: string,
  end: string,
  now = Date.now(),
): CheckResult {
  const requested = durationHours(start, end);

  if (resource.limits.dailyLimitHours != null) {
    const winStart = startOfDay(Date.parse(start));
    const winEnd = winStart + 86_400_000;
    const existing = hoursInWindow(state.bookings, user.id, resource.id, winStart, winEnd, now);
    const projected = existing + requested;
    if (projected > resource.limits.dailyLimitHours + 1e-9) {
      return {
        ok: false,
        code: 'daily_limit',
        reason: `Daily usage limit exceeded: this request would bring you to ${projected.toFixed(1)} h in the calendar day, above the ${resource.limits.dailyLimitHours} h/day limit for this resource.`,
      };
    }
  }

  if (resource.limits.weeklyLimitHours != null) {
    const dayStart = startOfDay(Date.parse(start));
    const winStart = dayStart - 6 * 86_400_000;
    const winEnd = dayStart + 86_400_000;
    const existing = hoursInWindow(state.bookings, user.id, resource.id, winStart, winEnd, now);
    const projected = existing + requested;
    if (projected > resource.limits.weeklyLimitHours + 1e-9) {
      return {
        ok: false,
        code: 'weekly_limit',
        reason: `Weekly usage limit exceeded: you already have ${existing.toFixed(1)} h booked in the 7 days up to this request; the resource allows ${resource.limits.weeklyLimitHours} h per rolling week.`,
      };
    }
  }

  const active = activeBookingCount(state, user.id, now);
  if (active >= state.maxActiveBookingsPerUser) {
    return {
      ok: false,
      code: 'active_limit',
      reason: `Active booking limit reached: you already have ${active} active bookings (the campus limit is ${state.maxActiveBookingsPerUser}). Wait for one to be returned, cancelled, or settled before making a new request.`,
    };
  }

  return ok;
}

/* ------------------------------------------------------------ conflicts */

/** Committed bookings for the resource that overlap the prospective window. */
export function findConflicts(
  state: DemoState,
  resourceId: string,
  start: string,
  end: string,
  now = Date.now(),
): Booking[] {
  return state.bookings
    .filter((b) => b.resourceId === resourceId && isCommitted(b, now))
    .filter((b) => overlaps(start, end, b.start, b.end))
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

/** Committed windows for display ("busy" list) between two instants. */
export function committedWindows(
  state: DemoState,
  resourceId: string,
  fromIso: string,
  toIso: string,
): Booking[] {
  return state.bookings
    .filter((b) => b.resourceId === resourceId && isCommitted(b))
    .filter((b) => overlaps(fromIso, toIso, b.start, b.end))
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

/* --------------------------------------------------------- request pipeline */

export interface ParsedRequest {
  ok: boolean;
  code?: BlockCode;
  reason?: string;
}

/** Time-range validation shared by the form and the server-side logic. */
export function validateWindow(
  resource: Resource,
  start: string,
  end: string,
  now = Date.now(),
): ParsedRequest {
  if (!start || !end) return { ok: false, code: 'invalid_time', reason: 'Pick both a start and an end time.' };
  const s = Date.parse(start);
  const e = Date.parse(end);
  if (Number.isNaN(s) || Number.isNaN(e)) return { ok: false, code: 'invalid_time', reason: 'Those dates could not be parsed — please re-enter them.' };
  if (e <= s) return { ok: false, code: 'invalid_time', reason: 'The end time must be after the start time.' };
  if (e - s < MIN_DURATION_MINUTES * 60_000)
    return { ok: false, code: 'invalid_time', reason: `Bookings must be at least ${MIN_DURATION_MINUTES} minutes long.` };
  if (s < now - 60_000)
    return { ok: false, code: 'past_time', reason: 'The start time is in the past — pick a future slot.' };
  if (s > now + MAX_LEAD_DAYS * 86_400_000)
    return { ok: false, code: 'lead_time', reason: `Bookings open at most ${MAX_LEAD_DAYS} days ahead.` };
  if (durationHours(start, end) > resource.limits.maxDurationHours)
    return {
      ok: false,
      code: 'duration',
      reason: `The maximum continuous booking for this resource is ${resource.limits.maxDurationHours} h.`,
    };
  return { ok: true };
}

/**
 * Full request evaluation used when a student submits a booking:
 * hard validation → maintenance → eligibility → fair-allocation limits →
 * conflict detection. Conflicts do not block: eligible users are placed on a
 * transparent waitlist. Everything else blocks with an explanation.
 */
export function evaluateRequest(
  state: DemoState,
  user: User,
  resource: Resource,
  start: string,
  end: string,
  purpose: string,
  now = Date.now(),
): CheckResult {
  const windowCheck = validateWindow(resource, start, end, now);
  if (!windowCheck.ok) return windowCheck;

  if (!purpose.trim())
    return { ok: false, code: 'invalid_time', reason: 'Describe the purpose of use — it is required for approval.' };

  const eligible = checkEligibility(user, resource, state.trainings, now);
  if (!eligible.ok) return eligible;

  const limits = checkLimits(state, user, resource, start, end, now);
  if (!limits.ok) return limits;

  const conflicts = findConflicts(state, resource.id, start, end, now);
  if (conflicts.length > 0) {
    const first = conflicts[0];
    return {
      ok: true,
      code: 'conflict',
      reason: `Conflict — this window overlaps an already-approved booking (${first.id}). You are eligible, so your request joins the transparent waitlist.`,
    };
  }
  return ok;
}

/* ------------------------------------------------------------- waitlist */

export interface WaitlistEntry {
  booking: Booking;
  position: number;
  recentUsageHours: number;
}

/**
 * Transparent waitlist for a resource: FIFO by request time, with lower
 * recent usage as a documented tie-breaker. Positions displayed to users
 * come from this single ordering.
 */
export function waitlistQueue(state: DemoState, resourceId: string, now = Date.now()): WaitlistEntry[] {
  const entries = state.bookings
    .filter((b) => b.resourceId === resourceId && b.status === 'waitlisted')
    .map((booking) => ({ booking, usage: recentUsageHours(state, booking.userId, now) }))
    .sort((a, b) => {
      const t = Date.parse(a.booking.requestedAt) - Date.parse(b.booking.requestedAt);
      if (t !== 0) return t;
      if (a.usage !== b.usage) return a.usage - b.usage;
      return a.booking.id.localeCompare(b.booking.id);
    });
  return entries.map((e, i) => ({
    booking: e.booking,
    position: i + 1,
    recentUsageHours: e.usage,
  }));
}

export function waitlistPosition(state: DemoState, booking: Booking, now = Date.now()): number | undefined {
  const q = waitlistQueue(state, booking.resourceId, now);
  return q.find((e) => e.booking.id === booking.id)?.position;
}

/**
 * Rank a NEW request would take if it conflicted right now (for previews).
 * A new request is always newest, so it slots behind the current queue
 * unless the usage tie-breaker reorders same-instant entries.
 */
export function previewWaitlistPosition(state: DemoState, resourceId: string): number {
  const queue = waitlistQueue(state, resourceId);
  return queue.length + 1;
}

/* ------------------------------------------------------------ re-approval */

/**
 * Owner-side re-check before approving an existing request.
 * Availability and eligibility are recomputed at decision time so two
 * approved bookings can never overlap the same resource.
 */
export function evaluateApproval(state: DemoState, bookingId: string, now = Date.now()): CheckResult {
  const booking = getBooking(state, bookingId);
  if (!booking) return { ok: false, code: 'invalid_time', reason: 'Booking not found.' };
  if (booking.status !== 'requested' && booking.status !== 'waitlisted') {
    return { ok: false, code: 'invalid_time', reason: `Only requested or waitlisted bookings can be approved (this one is ${booking.status}).` };
  }
  const resource = getResource(state, booking.resourceId);
  const user = getUser(state, booking.userId);

  if (Date.parse(booking.end) < now) {
    return { ok: false, code: 'window_passed', reason: 'The booking window has already passed — ask the requester to submit a new request.' };
  }

  const eligibility = checkEligibility(user, resource, state.trainings, now);
  if (!eligibility.ok) return eligibility;

  const limits = checkLimits(state, user, resource, booking.start, booking.end, now);
  if (!limits.ok) return limits;

  const conflicts = findConflicts(state, booking.resourceId, booking.start, booking.end, now);
  if (conflicts.length > 0) {
    const first = conflicts[0];
    return {
      ok: false,
      code: 'conflict',
      reason: `Approving would double-book the resource: booking ${first.id} is already approved${first.id === booking.id ? '' : ''} for an overlapping window (${fmtShort(first.start)} – ${fmtShort(first.end)}). Try approving a different window or leave this request on the waitlist.`,
    };
  }
  return ok;
}

/* ------------------------------------------------------------ transitions */

/** Can this booking's end move to newEnd? Same limits and conflict rules as a fresh request. */
export function evaluateExtension(state: DemoState, bookingId: string, newEnd: string, now = Date.now()): CheckResult {
  const booking = getBooking(state, bookingId);
  if (!booking) return { ok: false, code: 'invalid_time', reason: 'Booking not found.' };
  if (booking.status !== 'approved' && booking.status !== 'checked_out') {
    return { ok: false, code: 'invalid_time', reason: 'Only approved or checked-out bookings can be extended.' };
  }
  const end = Date.parse(newEnd);
  if (Number.isNaN(end) || end <= Date.parse(booking.end)) {
    return { ok: false, code: 'invalid_time', reason: 'The new end time must be later than the current end time.' };
  }
  if (end <= now) return { ok: false, code: 'past_time', reason: 'The new end time is already in the past.' };
  const resource = getResource(state, booking.resourceId);
  const total = durationHours(booking.start, newEnd);
  if (total > resource.limits.maxDurationHours + 1e-9) {
    return {
      ok: false,
      code: 'duration',
      reason: `Extension too long: the booking would last ${total.toFixed(1)} h, above the ${resource.limits.maxDurationHours} h maximum for this resource.`,
    };
  }
  // Judge the extended window as if this booking were a new request, so it is not counted twice.
  const others = { ...state, bookings: state.bookings.filter((b) => b.id !== booking.id) };
  const limits = checkLimits(others, getUser(state, booking.userId), resource, booking.start, newEnd, now);
  if (!limits.ok) return limits;
  const conflict = findConflicts(others, resource.id, booking.end, newEnd, now)[0];
  if (conflict) {
    return {
      ok: false,
      code: 'conflict',
      reason: `Extension would overlap booking ${conflict.id}, already approved from ${fmtShort(conflict.start)}. Return on time or pick an earlier end.`,
    };
  }
  return ok;
}

export function canCheckIn(booking: Booking): boolean {
  return booking.status === 'approved';
}

export function canReturn(booking: Booking): boolean {
  return booking.status === 'checked_out'; // overdue (effective) still returnable
}

export function canCancel(booking: Booking): boolean {
  return booking.status === 'requested' || booking.status === 'waitlisted' || booking.status === 'approved';
}

/* ------------------------------------------------------------ misc helpers */

function fmtShort(iso: string): string {
  const d = new Date(iso);
  const hh = () => {
    const suffix = d.getHours() < 12 ? 'am' : 'pm';
    const h12 = d.getHours() % 12 === 0 ? 12 : d.getHours() % 12;
    const m = d.getMinutes();
    return `${h12}${m ? ':' + String(m).padStart(2, '0') : ''}${suffix}`;
  };
  return `${d.toLocaleString('en', { month: 'short' })} ${d.getDate()}, ${hh()}`;
}

export function bookingLabel(state: DemoState, booking: Booking): string {
  const resource = getResource(state, booking.resourceId);
  return `${resource.name} — ${fmtRangeLabel(booking)}`;
}

function fmtRangeLabel(b: { start: string; end: string }): string {
  const s = new Date(b.start);
  const e = new Date(b.end);
  const sameDay = s.toDateString() === e.toDateString();
  const h = (d: Date) => {
    const m = d.getMinutes();
    const suffix = d.getHours() < 12 ? 'am' : 'pm';
    const h12 = d.getHours() % 12 === 0 ? 12 : d.getHours() % 12;
    return `${h12}${m ? ':' + String(m).padStart(2, '0') : ''}${suffix}`;
  };
  const md = (d: Date) => `${d.toLocaleString('en', { month: 'short' })} ${d.getDate()}`;
  return sameDay ? `${md(s)}, ${h(s)} – ${h(e)}` : `${md(s)} ${h(s)} – ${md(e)} ${h(e)}`;
}
