/**
 * ShareSpace domain types.
 * All persisted data is seeded locally in demo mode; types are storage-agnostic
 * so the same shape can be served from Supabase later.
 */

export type Role = 'student' | 'owner' | 'admin';

export interface Training {
  id: string;
  /** Display name, e.g. "Electronics Lab Training". */
  name: string;
  /** Short summary shown on cards and requirement badges. */
  summary: string;
  /** Demo module steps a user reads before "completing" the training. */
  module: { heading: string; points: string[] }[];
}

export interface TrainingRecord {
  trainingId: string;
  completedAt: string;
  /** Always true for demo completions; recorded for future real integrations. */
  simulated: boolean;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  /** Sub-title shown in the profile menu, e.g. "Third-year, Electronics". */
  title: string;
  department: string;
  membershipVerified: boolean;
  trainings: TrainingRecord[];
  /** Fictional users that render in data but are not selectable in the demo switcher. */
  selectable: boolean;
}

export type ResourceCategory =
  | 'Electronics'
  | 'Photography'
  | 'Fabrication'
  | 'AV Equipment'
  | 'Meeting Spaces'
  | 'Computing';

export type ResourceStatus = 'available' | 'maintenance';

export interface Resource {
  id: string;
  name: string;
  model?: string;
  category: ResourceCategory;
  icon: string;
  description: string;
  location: string;
  ownerId: string;
  /** Hourly usage fee in INR; 0 means free of charge. */
  costPerHour: number;
  status: ResourceStatus;
  maintenanceNote?: string;
  /** Owner submissions wait for Campus Operations; missing means published (seed data). */
  publication?: 'pending' | 'published' | 'rejected';
  /** Campus Operations' reason when a submission is rejected. */
  publicationNote?: string;
  eligibility: {
    requiresMembership: boolean;
    /** Training ids from the catalog that must be completed first. */
    requiredTrainings: string[];
  };
  usageRules: string[];
  /** Strict handling instructions for equipment that can be damaged or cause injury; borrowers must accept them to request. */
  safetyInstructions?: string[];
  /** Steps the borrower checks before handing the item back. */
  returnChecklist?: string[];
  /** Rules were drafted by the AI assistant; Campus Operations must review them before publication. */
  aiDrafted?: boolean;
  /** Fair-allocation limits, per user for this resource. */
  limits: {
    maxDurationHours: number;
    dailyLimitHours: number | null;
    weeklyLimitHours: number | null;
  };
  createdAt: string;
  updatedAt: string;
}

export type BookingStatus =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'waitlisted'
  | 'cancelled'
  | 'checked_out'
  | 'returned';

export type DisplayStatus = BookingStatus | 'overdue';

export type Condition = 'good' | 'minor_wear' | 'damaged';

export interface ConditionReport {
  at: string;
  condition: Condition;
  notes: string;
  /** Optional client-side photo, downscaled to a small JPEG data URL. */
  photoDataUrl?: string;
}

export interface Booking {
  id: string;
  resourceId: string;
  userId: string;
  start: string;
  end: string;
  purpose: string;
  status: BookingStatus;
  requestedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  /** Required for rejections; optional for cancellations. */
  decisionReason?: string;
  checkIn?: ConditionReport;
  checkInBy?: string;
  returnReport?: ConditionReport;
  returnBy?: string;
  /** When the borrower accepted the resource's safety instructions. */
  safetyAcknowledgedAt?: string;
  /** Latest request to push the end time back; the owner or an admin decides. */
  extension?: {
    end: string;
    reason: string;
    requestedAt: string;
    status: 'pending' | 'approved' | 'rejected';
    decidedBy?: string;
    decisionReason?: string;
  };
}

export type IncidentCategory = 'damage' | 'delay' | 'safety' | 'dispute';
export type IncidentSeverity = 'low' | 'medium' | 'high';
export type IncidentStatus = 'open' | 'under_review' | 'resolved';

export interface Incident {
  id: string;
  bookingId?: string;
  resourceId: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  description: string;
  reportedBy: string;
  reportedAt: string;
  status: IncidentStatus;
  resolutionNote?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export type AuditEntityType = 'resource' | 'booking' | 'incident' | 'training' | 'system';

export interface AuditEvent {
  id: string;
  at: string;
  /** User id of the actor; 'system' for resets. */
  actor: string;
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  summary: string;
  details?: string;
}

export interface DemoState {
  version: number;
  /** Currently acting persona (demo session, not real authentication). */
  currentUserId: string;
  users: User[];
  trainings: Training[];
  resources: Resource[];
  bookings: Booking[];
  incidents: Incident[];
  audit: AuditEvent[];
  /** Config knobs shown on screen so everyone can see the rules. */
  maxActiveBookingsPerUser: number;
  /** When each user last opened their notifications (unread = newer than this). */
  notificationsSeenAt?: Record<string, string>;
}

export interface SubmitRequestArgs {
  userId: string;
  resourceId: string;
  start: string;
  end: string;
  purpose: string;
}
