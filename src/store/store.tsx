/**
 * Demo-mode store. Persists the whole fictional dataset to localStorage and
 * exposes pure transitions as actions. Demo account switching is NOT real
 * authentication — it only selects which seeded persona you act as.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { DemoState, User } from '@/types';
import {
  approveBooking,
  cancelBooking,
  checkInBooking,
  completeTraining,
  rejectBooking,
  reportIncident,
  resetDemoState,
  resolveIncident,
  returnBooking,
  reviewIncident,
  reviewResource,
  requestExtension,
  reviewExtension,
  saveResource,
  submitRequest,
  type ConditionInput,
  type ResourceInput,
  type SubmitRequestInput,
  type ReportIncidentInput,
  type Transition,
} from '@/lib/actions';
import { STORAGE_KEY } from '@/lib/config';
import { buildSeedState } from '@/seed/seed';
import { getUser } from '@/lib/rules';

function loadInitial(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed && parsed.version === buildSeedState().version && Array.isArray(parsed.bookings)) {
        return parsed;
      }
    }
  } catch {
    // corrupted store falls through to a fresh seed
  }
  return buildSeedState();
}

export interface ActionResult {
  ok: boolean;
  code?: string;
  reason?: string;
  detail?: string;
}

interface StoreValue {
  state: DemoState;
  user: User;
  storageWarning: boolean;
  isDemoMode: true;
  actions: {
    switchPersona: (userId: string) => void;
    resetDemo: () => void;
    submitRequest: (input: Omit<SubmitRequestInput, 'userId'> & { userId?: string }) => ActionResult;
    approveBooking: (bookingId: string) => ActionResult;
    rejectBooking: (bookingId: string, reason: string) => ActionResult;
    cancelBooking: (bookingId: string, reason?: string) => ActionResult;
    checkIn: (bookingId: string, input: ConditionInput) => ActionResult;
    returnBooking: (bookingId: string, input: ConditionInput) => ActionResult;
    reportIncident: (input: Omit<ReportIncidentInput, 'actorId'> & { bookingId?: string; resourceId?: string }) => ActionResult;
    reviewIncident: (incidentId: string) => ActionResult;
    resolveIncident: (incidentId: string, note: string) => ActionResult;
    completeTraining: (trainingId: string) => ActionResult;
    saveResource: (input: ResourceInput) => ActionResult;
    reviewResource: (resourceId: string, approve: boolean, reason?: string) => ActionResult;
    requestExtension: (bookingId: string, newEnd: string, reason: string) => ActionResult;
    reviewExtension: (bookingId: string, approve: boolean, reason?: string) => ActionResult;
    markNotificationsSeen: () => void;
  };
}

const StoreContext = createContext<StoreValue | null>(null);

function toResult(t: Transition): ActionResult {
  return { ok: t.ok, code: t.code, reason: t.reason, detail: t.detail };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(() => loadInitial());
  const [storageWarning, setStorageWarning] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      setStorageWarning(true);
      console.warn('ShareSpace: localStorage write failed (quota?). Photos may be too large for demo storage.');
    }
  }, [state]);

  const value = useMemo<StoreValue>(() => {
    const store: StoreValue = {
      state,
      user: getUser(state, state.currentUserId),
      storageWarning,
      isDemoMode: true,
      actions: {
        switchPersona: (userId: string) => setState((s) => ({ ...s, currentUserId: userId })),
        resetDemo: () => {
          setState((s) => resetDemoState(s).state);
        },
        submitRequest: (input) => {
          const result = submitRequest(state, { ...input, userId: input.userId ?? state.currentUserId });
          setState(result.state);
          return toResult(result);
        },
        approveBooking: (bookingId) => {
          const result = approveBooking(state, bookingId, state.currentUserId);
          setState(result.state);
          return toResult(result);
        },
        rejectBooking: (bookingId, reason) => {
          const result = rejectBooking(state, bookingId, state.currentUserId, reason);
          setState(result.state);
          return toResult(result);
        },
        cancelBooking: (bookingId, reason) => {
          const result = cancelBooking(state, bookingId, state.currentUserId, reason);
          setState(result.state);
          return toResult(result);
        },
        checkIn: (bookingId, input) => {
          const result = checkInBooking(state, bookingId, state.currentUserId, input);
          setState(result.state);
          return toResult(result);
        },
        returnBooking: (bookingId, input) => {
          const result = returnBooking(state, bookingId, state.currentUserId, input);
          setState(result.state);
          return toResult(result);
        },
        reportIncident: (input) => {
          const result = reportIncident(state, { ...input, actorId: state.currentUserId });
          setState(result.state);
          return toResult(result);
        },
        reviewIncident: (incidentId) => {
          const result = reviewIncident(state, incidentId, state.currentUserId);
          setState(result.state);
          return toResult(result);
        },
        resolveIncident: (incidentId, note) => {
          const result = resolveIncident(state, incidentId, state.currentUserId, note);
          setState(result.state);
          return toResult(result);
        },
        completeTraining: (trainingId) => {
          const result = completeTraining(state, state.currentUserId, trainingId);
          setState(result.state);
          return toResult(result);
        },
        saveResource: (input) => {
          const result = saveResource(state, state.currentUserId, input);
          setState(result.state);
          return toResult(result);
        },
        requestExtension: (bookingId, newEnd, reason) => {
          const result = requestExtension(state, bookingId, state.currentUserId, newEnd, reason);
          setState(result.state);
          return toResult(result);
        },
        reviewExtension: (bookingId, approve, reason) => {
          const result = reviewExtension(state, bookingId, state.currentUserId, approve, reason);
          setState(result.state);
          return toResult(result);
        },
        markNotificationsSeen: () =>
          setState((s) => ({ ...s, notificationsSeenAt: { ...s.notificationsSeenAt, [s.currentUserId]: new Date().toISOString() } })),
        reviewResource: (resourceId, approve, reason) => {
          const result = reviewResource(state, resourceId, state.currentUserId, approve, reason);
          setState(result.state);
          return toResult(result);
        },
      },
    };
    return store;
  }, [state, storageWarning]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
