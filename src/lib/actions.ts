/**
 * Pure demo-state transitions. Each function takes the current state plus
 * arguments and returns the next state along with a result the caller can
 * surface as a toast. Re-validates every rule at execution time so the UI
 * can never bypass the checks.
 */
import type {
  AuditEvent,
  AuditEntityType,
  Booking,
  BookingStatus,
  Condition,
  DemoState,
  Incident,
  IncidentCategory,
  IncidentSeverity,
  Resource,
  ResourceStatus,
  ResourceCategory,
} from '@/types';
import {
  canCancel,
  canReturn,
  effectiveStatus,
  evaluateApproval,
  evaluateExtension,
  evaluateRequest,
  getBooking,
  getResource,
  getUser,
  waitlistPosition,
  type BlockCode,
} from './rules';
import { buildSeedState } from '@/seed/seed';
import { fmtDateTime } from './utils';

export interface Transition {
  state: DemoState;
  ok: boolean;
  code?: BlockCode;
  reason?: string;
  /** Extra payload for the caller (e.g. resulting status text). */
  detail?: string;
}

/* ------------------------------------------------------------ audit utils */

function nextAuditId(state: DemoState): string {
  let n = state.audit.length + 1;
  let id = `aud-${String(n).padStart(3, '0')}`;
  const taken = new Set(state.audit.map((e) => e.id));
  while (taken.has(id)) {
    n += 1;
    id = `aud-${String(n).padStart(3, '0')}`;
  }
  return id;
}

function log(
  state: DemoState,
  actor: string,
  action: string,
  entityType: AuditEntityType,
  entityId: string,
  summary: string,
  details?: string,
): DemoState {
  const event: AuditEvent = {
    id: nextAuditId(state),
    at: new Date().toISOString(),
    actor,
    action,
    entityType,
    entityId,
    summary,
    details,
  };
  return { ...state, audit: [...state.audit, event] };
}

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function windowLabel(start: string, end: string): string {
  const h = (iso: string) => {
    const d = new Date(iso);
    const suffix = d.getHours() < 12 ? 'am' : 'pm';
    const h12 = d.getHours() % 12 === 0 ? 12 : d.getHours() % 12;
    const m = d.getMinutes();
    return `${h12}${m ? ':' + String(m).padStart(2, '0') : ''}${suffix}`;
  };
  const md = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleString('en', { month: 'short' })} ${d.getDate()}`;
  };
  return sameDay(start, end) ? `${md(start)}, ${h(start)} – ${h(end)}` : `${md(start)} ${h(start)} – ${md(end)} ${h(end)}`;
}

function sameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function withBooking(state: DemoState, id: string, patch: Partial<Booking>): DemoState {
  return { ...state, bookings: state.bookings.map((b) => (b.id === id ? { ...b, ...patch } : b)) };
}

/* ------------------------------------------------------------- requests */

export interface SubmitRequestInput {
  userId: string;
  resourceId: string;
  start: string;
  end: string;
  purpose: string;
  /** Borrower accepted the resource's safety instructions (required when it has any). */
  safetyAcknowledged?: boolean;
  now?: number;
}

export function submitRequest(state: DemoState, input: SubmitRequestInput): Transition {
  const now = input.now ?? Date.now();
  const resource = getResource(state, input.resourceId);
  const user = getUser(state, input.userId);
  if (!resource || !user) return { state, ok: false, code: 'invalid_time', reason: 'Unknown resource or user.' };

  if (resource.safetyInstructions?.length && !input.safetyAcknowledged) {
    return { state, ok: false, code: 'invalid_time', reason: 'Read and accept the safety instructions for this resource before requesting it.' };
  }

  const decision = evaluateRequest(state, user, resource, input.start, input.end, input.purpose, now);
  if (!decision.ok) {
    // Eligibility and fair-allocation failures are recorded, then refuse.
    const logged = log(
      state,
      user.id,
      'booking.blocked',
      'booking',
      resource.id,
      `Blocked a request by ${user.name} for ${resource.name}.`,
      `${decision.reason ?? 'Rule rejected the request.'} (Code: ${decision.code})`,
    );
    return { state: logged, ok: false, code: decision.code, reason: decision.reason };
  }

  const waitlisted = decision.code === 'conflict';
  const booking: Booking = {
    id: newId('bk'),
    resourceId: resource.id,
    userId: user.id,
    start: input.start,
    end: input.end,
    purpose: input.purpose.trim(),
    status: waitlisted ? 'waitlisted' : 'requested',
    requestedAt: new Date(now).toISOString(),
    safetyAcknowledgedAt: resource.safetyInstructions?.length ? new Date(now).toISOString() : undefined,
  };
  const safetyNote = booking.safetyAcknowledgedAt ? ' · Safety instructions accepted.' : '';

  let next: DemoState = { ...state, bookings: [...state.bookings, booking] };
  const label = resource.name;
  if (waitlisted) {
    const position = waitlistPosition(next, booking, now);
    next = log(
      next,
      user.id,
      'booking.waitlisted',
      'booking',
      booking.id,
      `${user.name}'s ${label} request entered the waitlist (position ${position}).`,
      `${decision.reason} Window: ${windowLabel(input.start, input.end)}. Purpose: ${booking.purpose}${safetyNote}`,
    );
    return { state: next, ok: true, detail: `waitlisted:${position}` };
  }
  next = log(
    next,
    user.id,
    'booking.requested',
    'booking',
    booking.id,
    `${user.name} requested ${label} for approval.`,
    `${windowLabel(input.start, input.end)} · Purpose: ${booking.purpose}${safetyNote}`,
  );
  return { state: next, ok: true, detail: 'requested' };
}

/* ----------------------------------------------------------- decisions */

export function approveBooking(state: DemoState, bookingId: string, actorId: string): Transition {
  const booking = getBooking(state, bookingId);
  if (!booking) return { state, ok: false, reason: 'Booking not found.' };
  const resource = getResource(state, booking.resourceId);
  const actor = getUser(state, actorId);
  if (!canDecide(resource.ownerId, actorId, actor.role)) {
    return { state, ok: false, reason: 'Only the resource owner or an administrator can decide this request.' };
  }
  const check = evaluateApproval(state, bookingId);
  if (!check.ok) return { state, ok: false, code: check.code, reason: check.reason };

  const user = getUser(state, booking.userId);
  let next = withBooking(state, bookingId, {
    status: 'approved',
    decidedAt: new Date().toISOString(),
    decidedBy: actorId,
  });
  next = log(
    next,
    actorId,
    'booking.approved',
    'booking',
    bookingId,
    `Approved ${user.name}'s ${resource.name} booking.`,
    `Availability and eligibility re-checked at decision time. Window: ${windowLabel(booking.start, booking.end)}.${booking.status === 'waitlisted' ? ' Promoted from the waitlist.' : ''}`,
  );
  return { state: next, ok: true };
}

export function rejectBooking(state: DemoState, bookingId: string, actorId: string, reason: string): Transition {
  const booking = getBooking(state, bookingId);
  if (!booking) return { state, ok: false, reason: 'Booking not found.' };
  const resource = getResource(state, booking.resourceId);
  const actor = getUser(state, actorId);
  if (!canDecide(resource.ownerId, actorId, actor.role)) {
    return { state, ok: false, reason: 'Only the resource owner or an administrator can decide this request.' };
  }
  if (booking.status !== 'requested' && booking.status !== 'waitlisted') {
    return { state, ok: false, reason: `Only requested or waitlisted bookings can be rejected (this one is ${booking.status}).` };
  }
  if (!reason.trim()) {
    return { state, ok: false, reason: 'A rejection reason is required — users must be able to see why.' };
  }
  const user = getUser(state, booking.userId);
  let next = withBooking(state, bookingId, {
    status: 'rejected',
    decidedAt: new Date().toISOString(),
    decidedBy: actorId,
    decisionReason: reason.trim(),
  });
  next = log(
    next,
    actorId,
    'booking.rejected',
    'booking',
    bookingId,
    `Rejected ${user.name}'s ${resource.name} request.`,
    `Reason: ${reason.trim()}`,
  );
  return { state: next, ok: true };
}

export function cancelBooking(state: DemoState, bookingId: string, actorId: string, reason?: string): Transition {
  const booking = getBooking(state, bookingId);
  if (!booking) return { state, ok: false, reason: 'Booking not found.' };
  const resource = getResource(state, booking.resourceId);
  const actor = getUser(state, actorId);
  const isSelf = booking.userId === actorId;
  if (!isSelf && !canDecide(resource.ownerId, actorId, actor.role)) {
    return { state, ok: false, reason: 'You can only cancel your own bookings.' };
  }
  if (!canCancel(booking)) {
    return { state, ok: false, reason: `A ${booking.status} booking cannot be cancelled${booking.status === 'checked_out' ? ' — return it instead' : ''}.` };
  }
  const user = getUser(state, booking.userId);
  let next = withBooking(state, bookingId, {
    status: 'cancelled',
    decidedAt: new Date().toISOString(),
    decidedBy: actorId,
    decisionReason: reason?.trim() || undefined,
  });
  next = log(
    next,
    actorId,
    'booking.cancelled',
    'booking',
    bookingId,
    `Cancelled ${user.name}'s ${resource.name} booking (${booking.status}).`,
    reason?.trim() ? `Reason: ${reason.trim()}` : 'Cancelled without an explanatory note.',
  );
  return { state: next, ok: true };
}

/* ------------------------------------------------------------ extensions */

export function requestExtension(state: DemoState, bookingId: string, actorId: string, newEnd: string, reason: string): Transition {
  const booking = getBooking(state, bookingId);
  if (!booking) return { state, ok: false, reason: 'Booking not found.' };
  if (booking.userId !== actorId) return { state, ok: false, reason: 'Only the borrower can ask for an extension.' };
  if (booking.extension?.status === 'pending') return { state, ok: false, reason: 'An extension request is already waiting for a decision.' };
  if (!reason.trim()) return { state, ok: false, reason: 'Say why you need more time.' };
  const check = evaluateExtension(state, bookingId, newEnd);
  if (!check.ok) return { state, ok: false, code: check.code, reason: check.reason };
  const resource = getResource(state, booking.resourceId);
  let next = withBooking(state, bookingId, {
    extension: { end: newEnd, reason: reason.trim(), requestedAt: new Date().toISOString(), status: 'pending' },
  });
  next = log(
    next,
    actorId,
    'booking.extension_requested',
    'booking',
    bookingId,
    `${getUser(state, actorId).name} asked to extend the ${resource.name} booking.`,
    `New window: ${windowLabel(booking.start, newEnd)}. Reason: ${reason.trim()}`,
  );
  return { state: next, ok: true };
}

export function reviewExtension(state: DemoState, bookingId: string, actorId: string, approve: boolean, reason = ''): Transition {
  const booking = getBooking(state, bookingId);
  if (!booking?.extension || booking.extension.status !== 'pending') {
    return { state, ok: false, reason: 'There is no pending extension on this booking.' };
  }
  const resource = getResource(state, booking.resourceId);
  const actor = getUser(state, actorId);
  if (!canDecide(resource.ownerId, actorId, actor.role)) {
    return { state, ok: false, reason: 'Only the resource owner or an administrator can decide an extension.' };
  }
  if (!approve && !reason.trim()) return { state, ok: false, reason: 'A written reason is required to refuse an extension.' };
  if (approve) {
    // Re-check at decision time: another booking may have been approved since the request.
    const check = evaluateExtension(state, bookingId, booking.extension.end);
    if (!check.ok) return { state, ok: false, code: check.code, reason: check.reason };
  }
  const borrower = getUser(state, booking.userId).name;
  let next = withBooking(state, bookingId, {
    end: approve ? booking.extension.end : booking.end,
    extension: { ...booking.extension, status: approve ? 'approved' : 'rejected', decidedBy: actorId, decisionReason: approve ? undefined : reason.trim() },
  });
  next = log(
    next,
    actorId,
    approve ? 'booking.extended' : 'booking.extension_rejected',
    'booking',
    bookingId,
    approve ? `Extended ${borrower}'s ${resource.name} booking.` : `Refused ${borrower}'s extension on the ${resource.name} booking.`,
    approve ? `New window: ${windowLabel(booking.start, booking.extension.end)}. Limits and conflicts re-checked.` : `Reason: ${reason.trim()}`,
  );
  return { state: next, ok: true };
}

/* -------------------------------------------------------- check-in & return */

export interface ConditionInput {
  condition: Condition;
  notes: string;
  photoDataUrl?: string;
}

export function checkInBooking(
  state: DemoState,
  bookingId: string,
  actorId: string,
  input: ConditionInput,
): Transition {
  const booking = getBooking(state, bookingId);
  if (!booking) return { state, ok: false, reason: 'Booking not found.' };
  const resource = getResource(state, booking.resourceId);
  if (!canPerform(booking, actorId, resource.ownerId, actorId)) {
    return { state, ok: false, reason: 'Only the borrower, the resource owner, or an administrator can record this check-in.' };
  }
  if (booking.status !== 'approved') {
    return { state, ok: false, reason: `Check-in requires an approved booking (this one is ${booking.status}).` };
  }
  if (!input.notes.trim()) {
    return { state, ok: false, reason: 'Condition notes are required for check-in.' };
  }
  const nowIso = new Date().toISOString();
  const user = getUser(state, booking.userId);
  let next = withBooking(state, bookingId, {
    status: 'checked_out',
    checkIn: {
      at: nowIso,
      condition: input.condition,
      notes: input.notes.trim(),
      ...(input.photoDataUrl ? { photoDataUrl: input.photoDataUrl } : {}),
    },
    checkInBy: actorId,
  });
  next = log(
    next,
    actorId,
    'booking.checked_in',
    'booking',
    bookingId,
    `Checked in ${resource.name} to ${user.name}.`,
    `Actual time: ${fmtDateTime(nowIso)}. Initial condition: ${conditionLabel(input.condition)}${input.photoDataUrl ? ' · photo attached' : ''}. Notes: ${input.notes.trim()}`,
  );
  return { state: next, ok: true };
}

export function returnBooking(
  state: DemoState,
  bookingId: string,
  actorId: string,
  input: ConditionInput,
): Transition {
  const booking = getBooking(state, bookingId);
  if (!booking) return { state, ok: false, reason: 'Booking not found.' };
  const resource = getResource(state, booking.resourceId);
  if (!canPerform(booking, actorId, resource.ownerId, actorId)) {
    return { state, ok: false, reason: 'Only the borrower, the resource owner, or an administrator can record this return.' };
  }
  if (booking.status === 'returned') {
    return { state, ok: false, reason: 'This booking was already returned.' };
  }
  if (!canReturn(booking)) {
    return { state, ok: false, reason: `Return requires a checked-out booking (this one is ${booking.status}).` };
  }
  if (!input.notes.trim()) {
    return { state, ok: false, reason: 'Return notes are required.' };
  }
  const user = getUser(state, booking.userId);
  const early = Date.parse(booking.end) > Date.now();
  let next = withBooking(state, bookingId, {
    status: 'returned',
    returnReport: {
      at: new Date().toISOString(),
      condition: input.condition,
      notes: input.notes.trim(),
    },
    returnBy: actorId,
  });
  next = log(
    next,
    actorId,
    'booking.returned',
    'booking',
    bookingId,
    `${resource.name} returned by ${user.name}.${early ? ' (Returned early.)' : ''}`,
    `Final condition: ${conditionLabel(input.condition)}${booking.checkIn ? ` · Check-in condition was ${conditionLabel(booking.checkIn.condition)}` : ''}. Notes: ${input.notes.trim()}`,
  );
  return { state: next, ok: true };
}

/* ------------------------------------------------------------- incidents */

export interface ReportIncidentInput {
  bookingId?: string;
  resourceId?: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  description: string;
  actorId: string;
}

export function reportIncident(state: DemoState, input: ReportIncidentInput): Transition {
  const actor = getUser(state, input.actorId);
  const booking = input.bookingId ? getBooking(state, input.bookingId) : undefined;
  const resourceId = booking?.resourceId ?? input.resourceId;
  if (!resourceId) return { state, ok: false, reason: 'Pick the resource or booking this incident is about.' };
  const resource = getResource(state, resourceId);
  if (!resource) return { state, ok: false, reason: 'Unknown resource.' };
  if (!booking && actor.role === 'student' && resource.ownerId !== actor.id) {
    const userBookings = state.bookings.filter((b) => b.userId === actor.id && b.resourceId === resource.id);
    if (userBookings.length === 0) {
      return { state, ok: false, reason: 'Incidents must be linked to a booking, the resource, or your recent usage of it.' };
    }
  }
  if (!input.description.trim()) {
    return { state, ok: false, reason: 'Describe what happened — the description is required.' };
  }
  const relatedLabel = booking ? ` on booking ${booking.id}` : '';
  const incident: Incident = {
    id: newId('inc'),
    ...(booking ? { bookingId: booking.id } : {}),
    resourceId: resource.id,
    category: input.category,
    severity: input.severity,
    description: input.description.trim(),
    reportedBy: actor.id,
    reportedAt: new Date().toISOString(),
    status: 'open',
  };
  let next: DemoState = { ...state, incidents: [...state.incidents, incident] };
  next = log(
    next,
    actor.id,
    'incident.reported',
    'incident',
    incident.id,
    `${actor.name} reported a ${input.severity}-severity ${input.category} incident${relatedLabel}.`,
    input.description.trim(),
  );
  return { state: next, ok: true, detail: incident.id };
}

export function reviewIncident(state: DemoState, incidentId: string, actorId: string): Transition {
  const incident = state.incidents.find((i) => i.id === incidentId);
  if (!incident) return { state, ok: false, reason: 'Incident not found.' };
  if (!canModerate(state, incident.resourceId, actorId)) {
    return { state, ok: false, reason: 'Only the resource owner or an administrator can review an incident.' };
  }
  if (incident.status !== 'open') {
    return { state, ok: false, reason: 'Only open incidents can move into review.' };
  }
  let next: DemoState = {
    ...state,
    incidents: state.incidents.map((i) => (i.id === incidentId ? { ...i, status: 'under_review' } : i)),
  };
  next = log(next, actorId, 'incident.review', 'incident', incidentId, `Started reviewing incident ${incidentId}.`);
  return { state: next, ok: true };
}

export function resolveIncident(state: DemoState, incidentId: string, actorId: string, note: string): Transition {
  const incident = state.incidents.find((i) => i.id === incidentId);
  if (!incident) return { state, ok: false, reason: 'Incident not found.' };
  if (!canModerate(state, incident.resourceId, actorId)) {
    return { state, ok: false, reason: 'Only the resource owner or an administrator can resolve an incident.' };
  }
  if (incident.status === 'resolved') {
    return { state, ok: false, reason: 'This incident is already resolved.' };
  }
  if (!note.trim()) {
    return { state, ok: false, reason: 'A written resolution note is required.' };
  }
  let next: DemoState = {
    ...state,
    incidents: state.incidents.map((i) =>
      i.id === incidentId
        ? {
            ...i,
            status: 'resolved' as const,
            resolutionNote: note.trim(),
            resolvedBy: actorId,
            resolvedAt: new Date().toISOString(),
          }
        : i,
    ),
  };
  next = log(
    next,
    actorId,
    'incident.resolved',
    'incident',
    incidentId,
    `Resolved incident ${incidentId}.`,
    note.trim(),
  );
  return { state: next, ok: true };
}

/* --------------------------------------------------------------- training */

export function completeTraining(state: DemoState, userId: string, trainingId: string): Transition {
  const user = getUser(state, userId);
  const training = state.trainings.find((t) => t.id === trainingId);
  if (!training) return { state, ok: false, reason: 'Unknown training module.' };
  if (user.trainings.some((t) => t.trainingId === trainingId)) {
    return { state, ok: false, reason: `${training.name} is already on this profile.` };
  }
  const registered: DemoState = {
    ...state,
    users: state.users.map((u) =>
      u.id === userId
        ? {
            ...u,
            trainings: [
              ...u.trainings,
              { trainingId, completedAt: new Date().toISOString(), simulated: true },
            ],
          }
        : u,
    ),
  };
  const next = log(
    registered,
    userId,
    'training.completed',
    'training',
    trainingId,
    `${user.name} completed ${training.name}.`,
    'Simulated demo module — this does not constitute real institutional verification.',
  );
  return { state: next, ok: true };
}

/* ------------------------------------------------------------- resources */

export interface ResourceInput {
  id?: string;
  name: string;
  model?: string;
  category: ResourceCategory;
  icon: string;
  description: string;
  location: string;
  ownerId: string;
  costPerHour: number;
  status: ResourceStatus;
  maintenanceNote?: string;
  requiredTrainings: string[];
  maxDurationHours: number;
  dailyLimitHours: number | null;
  weeklyLimitHours: number | null;
  usageRules: string;
  safetyInstructions: string;
}

export function saveResource(state: DemoState, actorId: string, input: ResourceInput): Transition {
  const actor = getUser(state, actorId);
  // Everyone except Campus Operations submits listings for approval and may only edit their own.
  if (actor.role !== 'admin') {
    const existing = input.id ? state.resources.find((r) => r.id === input.id) : undefined;
    if (existing && existing.ownerId !== actor.id) {
      return { state, ok: false, reason: 'Owners can only edit resources they own.' };
    }
    // Owners always register and keep resources under their own name.
    input = { ...input, ownerId: actor.id };
  }
  if (!input.name.trim() || !input.description.trim() || !input.location.trim()) {
    return { state, ok: false, reason: 'Name, description and location are required.' };
  }
  const actorLabel = `${actor.name} (${actor.role})`;
  if (input.id) {
    const existing = state.resources.find((r) => r.id === input.id);
    if (!existing) return { state, ok: false, reason: 'Resource not found.' };
    const updated: Resource = {
      ...existing,
      name: input.name.trim(),
      model: input.model?.trim() || existing.model,
      category: input.category,
      icon: input.icon,
      description: input.description.trim(),
      location: input.location.trim(),
      ownerId: input.ownerId,
      costPerHour: input.costPerHour,
      status: input.status,
      maintenanceNote: input.status === 'maintenance' ? input.maintenanceNote?.trim() || 'Under maintenance.' : undefined,
      eligibility: { ...existing.eligibility, requiredTrainings: input.requiredTrainings },
      usageRules: splitLines(input.usageRules),
      safetyInstructions: splitLines(input.safetyInstructions),
      limits: {
        maxDurationHours: input.maxDurationHours,
        dailyLimitHours: input.dailyLimitHours,
        weeklyLimitHours: input.weeklyLimitHours,
      },
      updatedAt: new Date().toISOString(),
    };
    // A rejected submission goes back to Campus Operations once the owner edits it.
    const resubmitted = actor.role !== 'admin' && existing.publication === 'rejected';
    if (resubmitted) {
      updated.publication = 'pending';
      updated.publicationNote = undefined;
    }
    let next: DemoState = {
      ...state,
      resources: state.resources.map((r) => (r.id === existing.id ? updated : r)),
    };
    if (resubmitted) {
      next = log(next, actorId, 'resource.submitted', 'resource', existing.id, `${actorLabel} resubmitted “${updated.name}” for Campus Operations approval.`);
    }
    next = log(
      next,
      actorId,
      'resource.updated',
      'resource',
      existing.id,
      `${actorLabel} updated “${updated.name}”.`,
      diffSummary(existing, updated),
    );
    return { state: next, ok: true };
  }
  const resource: Resource = {
    id: newId('res'),
    name: input.name.trim(),
    model: input.model?.trim(),
    category: input.category,
    icon: input.icon,
    description: input.description.trim(),
    location: input.location.trim(),
    ownerId: input.ownerId,
    costPerHour: input.costPerHour,
    status: input.status,
    maintenanceNote: input.status === 'maintenance' ? input.maintenanceNote?.trim() || 'Under maintenance.' : undefined,
    eligibility: { requiresMembership: true, requiredTrainings: input.requiredTrainings },
    usageRules: splitLines(input.usageRules),
    safetyInstructions: splitLines(input.safetyInstructions),
    limits: {
      maxDurationHours: input.maxDurationHours,
      dailyLimitHours: input.dailyLimitHours,
      weeklyLimitHours: input.weeklyLimitHours,
    },
    // Owners submit a request; only Campus Operations publishes straight away.
    publication: actor.role === 'admin' ? 'published' : 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  let next: DemoState = { ...state, resources: [...state.resources, resource] };
  next = log(
    next,
    actorId,
    actor.role === 'admin' ? 'resource.created' : 'resource.submitted',
    'resource',
    resource.id,
    actor.role === 'admin'
      ? `${actorLabel} registered “${resource.name}” to the shared catalogue.`
      : `${actorLabel} requested Campus Operations to publish “${resource.name}”.`,
    `${resource.category} · ${resource.location}`,
  );
  return { state: next, ok: true, detail: actor.role === 'admin' ? undefined : 'pending' };
}

/** Campus Operations approves (publishes) or rejects an owner's resource submission. */
export function reviewResource(state: DemoState, resourceId: string, actorId: string, approve: boolean, reason = ''): Transition {
  const actor = getUser(state, actorId);
  if (actor.role !== 'admin') {
    return { state, ok: false, reason: 'Only Campus Operations can approve new resources.' };
  }
  const existing = state.resources.find((r) => r.id === resourceId);
  if (!existing) return { state, ok: false, reason: 'Resource not found.' };
  if (existing.publication !== 'pending') {
    return { state, ok: false, reason: 'This resource is not waiting for approval.' };
  }
  if (!approve && !reason.trim()) {
    return { state, ok: false, reason: 'A written reason is required to reject a resource.' };
  }
  const updated: Resource = {
    ...existing,
    publication: approve ? 'published' : 'rejected',
    publicationNote: approve ? undefined : reason.trim(),
    updatedAt: new Date().toISOString(),
  };
  let next: DemoState = { ...state, resources: state.resources.map((r) => (r.id === resourceId ? updated : r)) };
  const ownerName = getUser(state, existing.ownerId).name;
  next = log(
    next,
    actorId,
    approve ? 'resource.published' : 'resource.rejected',
    'resource',
    resourceId,
    approve
      ? `Approved and published “${existing.name}” from ${ownerName}.`
      : `Rejected “${existing.name}” from ${ownerName}.`,
    approve ? undefined : `Reason: ${reason.trim()}`,
  );
  return { state: next, ok: true };
}

/* ----------------------------------------------------------------- reset */

export function resetDemoState(state: DemoState): Transition {
  const fresh = buildSeedState();
  const next: DemoState = log(
    fresh,
    'system',
    'system.reset',
    'system',
    'demo',
    'Demo data reset — fresh fictional dataset loaded.',
    `Previous demo state had ${state.bookings.length} bookings, ${state.incidents.length} incidents and ${state.audit.length} audit events.`,
  );
  return { state: next, ok: true, detail: 'reset' };
}

/* ---------------------------------------------------------------- helpers */

function canDecide(ownerId: string, actorId: string, role: string): boolean {
  return role === 'admin' || actorId === ownerId;
}

function canPerform(booking: Booking, userId: string, ownerId: string, role: string): boolean {
  return booking.userId === userId || role === 'admin' || userId === ownerId;
}

function canModerate(state: DemoState, resourceId: string, actorId: string): boolean {
  const resource = getResource(state, resourceId);
  const actor = getUser(state, actorId);
  return actor.role === 'admin' || actorId === resource.ownerId;
}

export function conditionLabel(condition: Condition): string {
  return condition === 'good' ? 'Good' : condition === 'minor_wear' ? 'Minor wear' : 'Damaged';
}

function splitLines(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.replace(/^[-•]\s*/, '').trim())
    .filter(Boolean);
}

function diffSummary(existing: Resource, updated: Resource): string {
  const changes: string[] = [];
  if (existing.name !== updated.name) changes.push('name');
  if (existing.description !== updated.description) changes.push('description');
  if (existing.location !== updated.location) changes.push('location');
  if (existing.ownerId !== updated.ownerId) changes.push('owner');
  if (existing.costPerHour !== updated.costPerHour) changes.push('cost');
  if (existing.status !== updated.status) changes.push(`status → ${updated.status}`);
  if (JSON.stringify(existing.eligibility) !== JSON.stringify(updated.eligibility)) changes.push('eligibility');
  if (JSON.stringify(existing.limits) !== JSON.stringify(updated.limits)) changes.push('limits');
  if (JSON.stringify(existing.usageRules) !== JSON.stringify(updated.usageRules)) changes.push('usage rules');
  if (JSON.stringify(existing.safetyInstructions ?? []) !== JSON.stringify(updated.safetyInstructions ?? [])) changes.push('safety instructions');
  return changes.length ? `Changed: ${changes.join(', ')}.` : 'Saved without field changes.';
}

/** Display status that upgrades overdue checkouts. */
export function displayStatus(booking: Booking, now = Date.now()): BookingStatus | 'overdue' {
  return effectiveStatus(booking, now);
}
