/**
 * Read-model helpers: role-scoped views of the state used by pages.
 * Pure functions over DemoState so KPIs always derive from real data.
 */
import type { Booking, DemoState, Incident, Resource, User } from '@/types';
import { effectiveStatus, getResource, isCommitted, isPublished } from './rules';

export function belongsTo(user: User, b: Booking, state: DemoState): boolean {
  if (b.userId === user.id) return true;
  if (user.role === 'admin') return true;
  if (user.role === 'owner') return getResource(state, b.resourceId).ownerId === user.id;
  return false;
}

/** Bookings a persona can see: own, owned-resource, or all (admin). */
export function bookingsVisibleTo(state: DemoState, user: User): Booking[] {
  return state.bookings
    .filter((b) => belongsTo(user, b, state))
    .sort((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt));
}

export function pendingApprovalQueue(state: DemoState, user: User): Booking[] {
  return state.bookings
    .filter(
      (b) =>
        (b.status === 'requested' || b.status === 'waitlisted' || b.extension?.status === 'pending') &&
        (user.role === 'admin' || (user.role === 'owner' && getResource(state, b.resourceId).ownerId === user.id)),
    )
    .sort((a, b) => Date.parse(a.requestedAt) - Date.parse(b.requestedAt));
}

export function activeCheckouts(state: DemoState, user: User): Booking[] {
  return state.bookings.filter(
    (b) =>
      (b.status === 'checked_out' || effectiveStatus(b) === 'overdue') &&
      (user.role === 'admin' ||
        (user.role === 'owner' && getResource(state, b.resourceId).ownerId === user.id) ||
        b.userId === user.id),
  );
}

export function overdueBookings(state: DemoState, user: User): Booking[] {
  return activeCheckouts(state, user).filter((b) => effectiveStatus(b) === 'overdue');
}

export function incidentsVisibleTo(state: DemoState, user: User): Incident[] {
  const visibleResources = new Set(
    user.role === 'admin' ? state.resources.map((r) => r.id) : state.resources.filter((r) => r.ownerId === user.id).map((r) => r.id),
  );
  const myBookings = new Set(state.bookings.filter((b) => b.userId === user.id).map((b) => b.id));
  return state.incidents
    .filter((i) => visibleResources.has(i.resourceId) || myBookings.has(i.bookingId ?? ''))
    .sort((a, b) => Date.parse(b.reportedAt) - Date.parse(a.reportedAt));
}

export function openIncidents(state: DemoState, user: User): Incident[] {
  return incidentsVisibleTo(state, user).filter((i) => i.status !== 'resolved');
}

/** Upcoming bookings in the persona's scope, soonest first. */
export function upcomingBookings(state: DemoState, user: User, now = Date.now()): Booking[] {
  return state.bookings
    .filter(
      (b) =>
        (b.status === 'requested' || b.status === 'approved' || b.status === 'checked_out') &&
        Date.parse(b.end) >= now &&
        belongsTo(user, b, state),
    )
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
    .slice(0, 8);
}

/** Role-scoped audit slice: admins see everything; others see their own trail plus events on resources they own. */
export function auditVisibleTo(state: DemoState, user: User) {
  if (user.role === 'admin') return state.audit;
  const myResources = new Set(state.resources.filter((r) => r.ownerId === user.id).map((r) => r.id));
  const relevantBooking = (id: string) => {
    const b = state.bookings.find((x) => x.id === id);
    // Blocked attempts are logged against the resource id, since no booking was created.
    return b ? b.userId === user.id || myResources.has(b.resourceId) : myResources.has(id);
  };
  return state.audit.filter((e) => {
    if (e.actor === user.id || e.actor === 'system') return true;
    if (e.entityType === 'booking') return relevantBooking(e.entityId);
    if (e.entityType === 'resource') return myResources.has(e.entityId);
    if (e.entityType === 'incident') {
      const i = state.incidents.find((x) => x.id === e.entityId);
      return !!i && (i.reportedBy === user.id || myResources.has(i.resourceId) || (i.bookingId ? relevantBooking(i.bookingId) : false));
    }
    return false;
  });
}

/** Catalogue a persona sees: published resources, plus own submissions (owner) or every submission (admin). */
export function resourcesVisibleTo(state: DemoState, user: User): Resource[] {
  return state.resources.filter((r) => isPublished(r) || user.role === 'admin' || r.ownerId === user.id);
}

export function pendingResources(state: DemoState): Resource[] {
  return state.resources.filter((r) => r.publication === 'pending');
}

export function availableResourceCount(state: DemoState): number {
  const committedNow = new Set(
    state.bookings.filter((b) => isCommitted(b) && Date.parse(b.start) <= Date.now() && Date.parse(b.end) > Date.now()).map((b) => b.resourceId),
  );
  return state.resources.filter((r) => isPublished(r) && r.status === 'available' && !committedNow.has(r.id)).length;
}

export interface Kpis {
  availableResources: number;
  totalResources: number;
  pendingRequests: number;
  activeCheckouts: number;
  openIncidents: number;
  overdueReturns: number;
  waitlisted: number;
}

export function kpisForUser(state: DemoState, user: User): Kpis {
  return {
    availableResources: availableResourceCount(state),
    totalResources: state.resources.filter(isPublished).length,
    // Students have no approval queue; count their own requests awaiting a decision.
    pendingRequests:
      user.role === 'student'
        ? state.bookings.filter((b) => b.userId === user.id && b.status === 'requested').length
        : pendingApprovalQueue(state, user).length,
    activeCheckouts: activeCheckouts(state, user).filter((b) => effectiveStatus(b) === 'checked_out').length,
    openIncidents: openIncidents(state, user).filter((i) => i.status === 'open').length,
    overdueReturns: overdueBookings(state, user).length,
    waitlisted: state.bookings.filter(
      (b) => b.status === 'waitlisted' && (user.role === 'admin' || b.userId === user.id || (user.role === 'owner' && getResource(state, b.resourceId).ownerId === user.id)),
    ).length,
  };
}

/** Resource availability text shown on cards. */
export type AvailabilityKind = 'available' | 'in_use' | 'maintenance';

export function resourceAvailability(state: DemoState, resource: Resource): { status: AvailabilityKind; label: string } {
  if (resource.status === 'maintenance') return { status: 'maintenance', label: 'Under maintenance' };
  const current = state.bookings.find(
    (b) => b.resourceId === resource.id && isCommitted(b) && Date.parse(b.start) <= Date.now() && Date.parse(b.end) > Date.now(),
  );
  if (current) return { status: 'in_use', label: `In use until ${fmtTime(current.end)}` };
  return { status: 'available', label: 'Available' };
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const suffix = d.getHours() < 12 ? 'AM' : 'PM';
  const h12 = d.getHours() % 12 === 0 ? 12 : d.getHours() % 12;
  return `${h12}:${String(d.getMinutes()).padStart(2, '0')} ${suffix}`;
}

/* ---------------------------------------------------------- notifications */

export interface Notice {
  id: string;
  at: string;
  text: string;
  tone: 'info' | 'success' | 'warning' | 'alert';
  link: string;
  unread: boolean;
}

// Audit actions worth telling the borrower about, and those worth telling the owner/admin about.
const FOR_BORROWER: Record<string, Notice['tone']> = {
  'booking.approved': 'success',
  'booking.rejected': 'alert',
  'booking.waitlisted': 'warning',
  'booking.cancelled': 'warning',
  'booking.extended': 'success',
  'booking.extension_rejected': 'alert',
  'incident.resolved': 'info',
};
const FOR_MANAGER: Record<string, Notice['tone']> = {
  'booking.requested': 'info',
  'booking.waitlisted': 'info',
  'booking.cancelled': 'warning',
  'booking.extension_requested': 'warning',
  'incident.reported': 'alert',
  'resource.submitted': 'info',
};
const FOR_RESOURCE_OWNER: Record<string, Notice['tone']> = {
  'resource.published': 'success',
  'resource.rejected': 'alert',
};

/**
 * Notifications are derived, not stored: audit events about the user's bookings or
 * resources made by someone else, plus live reminders (starting soon, overdue).
 */
export function notificationsFor(state: DemoState, user: User, now = Date.now()): Notice[] {
  const seenAt = Date.parse(state.notificationsSeenAt?.[user.id] ?? new Date(now - 2 * 86_400_000).toISOString());
  const manages = (resourceId: string) => user.role === 'admin' || getResource(state, resourceId).ownerId === user.id;
  const notices: Notice[] = [];

  for (const e of state.audit) {
    if (e.actor === user.id || e.actor === 'system') continue;
    let tone: Notice['tone'] | undefined;
    let link = '/bookings';
    if (e.entityType === 'booking') {
      const b = state.bookings.find((x) => x.id === e.entityId);
      if (!b) continue;
      link = `/bookings?booking=${b.id}`;
      if (b.userId === user.id) tone = FOR_BORROWER[e.action];
      else if (manages(b.resourceId)) tone = FOR_MANAGER[e.action];
    } else if (e.entityType === 'incident') {
      const i = state.incidents.find((x) => x.id === e.entityId);
      if (!i) continue;
      const mine = i.reportedBy === user.id || state.bookings.some((b) => b.id === i.bookingId && b.userId === user.id);
      tone = mine ? FOR_BORROWER[e.action] : manages(i.resourceId) ? FOR_MANAGER[e.action] : undefined;
      link = '/incidents';
    } else if (e.entityType === 'resource') {
      const r = state.resources.find((x) => x.id === e.entityId);
      if (!r) continue;
      tone = r.ownerId === user.id ? FOR_RESOURCE_OWNER[e.action] : user.role === 'admin' ? FOR_MANAGER[e.action] : undefined;
      link = `/resources/${r.id}`;
    }
    if (tone) notices.push({ id: e.id, at: e.at, text: e.summary, tone, link, unread: Date.parse(e.at) > seenAt });
  }

  // Live reminders stay listed until the situation is settled; each is dated from when it became true,
  // so "Mark all read" clears it like any other notice.
  for (const b of state.bookings) {
    const name = getResource(state, b.resourceId).name;
    if (b.userId === user.id && b.status === 'approved' && Date.parse(b.start) > now && Date.parse(b.start) - now < 86_400_000) {
      const at = Date.parse(b.start) - 86_400_000;
      notices.push({ id: `remind-${b.id}`, at: new Date(at).toISOString(), text: `Reminder: your ${name} booking starts within 24 hours. Check in at handover.`, tone: 'info', link: `/bookings?booking=${b.id}`, unread: at > seenAt });
    }
    if (effectiveStatus(b, now) === 'overdue' && (b.userId === user.id || manages(b.resourceId))) {
      const who = b.userId === user.id ? 'Your' : `${state.users.find((u) => u.id === b.userId)?.name ?? 'A'}'s`;
      const at = Date.parse(b.end);
      notices.push({ id: `overdue-${b.id}`, at: b.end, text: `Overdue: ${who} ${name} was due back ${new Date(b.end).toLocaleString()}.`, tone: 'alert', link: `/bookings?booking=${b.id}`, unread: at > seenAt });
    }
  }

  return notices.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 30);
}
