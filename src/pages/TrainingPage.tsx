import { useState } from 'react';
import { BadgeCheck, CircleAlert, GraduationCap, ShieldQuestion, UserRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState, UserAvatar } from '@/components/common';
import { useStore } from '@/store/store';
import { useToast } from '@/components/ui/toast';
import { getUser, isPublished } from '@/lib/rules';
import { cn, fmtDate } from '@/lib/utils';

export function TrainingPage() {
  const { state, actions } = useStore();
  const { toast } = useToast();
  const me = getUser(state, state.currentUserId);
  const [openTraining, setOpenTraining] = useState<string | null>(null);
  const module_ = state.trainings.find((t) => t.id === openTraining);
  const moduleDone = me.trainings.some((x) => x.trainingId === openTraining);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold tracking-tight">Eligibility & training</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Verified membership plus required trainings decide who can request a resource. Demo modules below simulate completion —
          they are not real institutional verification and never substitute for it.
        </p>
      </header>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-950">
        <p className="flex items-center gap-1.5 font-semibold">
          <CircleAlert className="h-3.5 w-3.5" /> Demo disclosure
        </p>
        <p className="mt-1 text-amber-900/90">
          Training completions, memberships and personas are fictional local data. They exist to let anyone walk the eligibility
          → training → request → approval path. No real records, credentials or sanctions are represented.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Training modules</h2>
            <p className="text-[11px] text-muted-foreground">Acting as <span className="font-semibold text-foreground">{me.name}</span> · {me.trainings.length}/{state.trainings.length} completed</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {state.trainings.map((t) => {
              const done = me.trainings.some((x) => x.trainingId === t.id);
              const record = me.trainings.find((x) => x.trainingId === t.id);
              const requiredBy = state.resources.filter((r) => isPublished(r) && r.eligibility.requiredTrainings.includes(t.id));
              const universal = t.id === 'general-safety';
              return (
                <Card key={t.id} className={cn('flex h-full flex-col', done && 'border-emerald-200')}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-start justify-between gap-2">
                      <span className="flex items-center gap-1.5">
                        <GraduationCap className="h-4 w-4 text-primary" />
                        {t.name}
                      </span>
                      {done ? (
                        <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          {record?.simulated ? 'Completed (demo)' : 'Completed'}
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Not yet</span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col pt-0">
                    <p className="text-xs leading-relaxed text-muted-foreground">{t.summary}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {universal
                        ? 'Required for every booking campus-wide.'
                        : requiredBy.length > 0
                          ? `Gate for ${requiredBy.map((r) => r.name).join(', ')}.`
                          : 'Not required by any resource yet.'}
                    </p>
                    {done && record ? (
                      <div className="mt-auto flex items-center justify-between gap-2 pt-2.5">
                        <p className="text-[10px] text-muted-foreground">Completed {fmtDate(record.completedAt)}{record.simulated ? ' · simulated demo module' : ''}</p>
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => setOpenTraining(t.id)}>
                          Read again
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-auto pt-2.5">
                        <Button size="sm" className="text-xs" onClick={() => setOpenTraining(t.id)}>
                          Start module
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Who can book what — requirement matrix</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {state.resources.filter(isPublished).map((r) => {
              const missing = ['general-safety', ...r.eligibility.requiredTrainings].filter((id) => !me.trainings.some((x) => x.trainingId === id));
              return (
                <Card key={r.id} className="p-3.5">
                  <p className="text-xs font-semibold">{r.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {missing.length === 0
                      ? `${me.name.split(' ')[0]} is cleared to request`
                      : `Missing: ${missing.map((id) => state.trainings.find((t) => t.id === id)?.name ?? id).join(', ')}`}
                  </p>
                  {r.status === 'maintenance' ? (
                    <p className="mt-1 text-[10px] font-medium text-red-700">Currently under maintenance — booking paused.</p>
                  ) : null}
                </Card>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Demo personas</h2>
          {state.users
            .filter((u) => u.selectable)
            .map((u) => (
              <Card key={u.id} className={cn('p-3.5', u.id === me.id && 'border-primary/50 ring-1 ring-primary/20')}>
                <div className="flex items-center gap-2.5">
                  <UserAvatar user={u} size="lg" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{u.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{u.title}</p>
                  </div>
                  {u.id === me.id ? <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">You</span> : null}
                </div>
                <div className="mt-2.5 space-y-1 text-[11px]">
                  <p className="flex items-center gap-1.5">
                    {u.membershipVerified ? <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" /> : <ShieldQuestion className="h-3.5 w-3.5 text-amber-600" />}
                    {u.membershipVerified ? 'Membership verified' : 'Membership unverified'}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-primary" />
                    Trainings: {u.trainings.map((t) => state.trainings.find((x) => x.id === t.trainingId)?.name).join(', ') || 'none'}
                  </p>
                  <p className="flex items-center gap-1.5 capitalize">
                    <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                    {u.role === 'owner' ? 'Resource owner — approves requests on owned resources' : u.role === 'admin' ? 'Administrative view — sees everything' : 'Student view — own bookings only'}
                  </p>
                </div>
              </Card>
            ))}
          <EmptyState icon={UserRound} title="Demo roles, one click away" description="Use the profile menu (top-right) to switch personas at any time. Booking history and eligibility recalculate per persona." />
        </div>
      </div>

      <Dialog open={openTraining !== null} onOpenChange={(open) => { if (!open) setOpenTraining(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{module_?.name}</DialogTitle>
            <DialogDescription>
              {moduleDone
                ? 'You have completed this module. Re-reading it does not change your record.'
                : 'Simulated demo module. Completing it records the training on your demo profile and writes an audit event with an explicit “not real verification” disclosure.'}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
            {module_ ? (
              <div>
                <p className="mb-2 text-xs text-muted-foreground">{module_.summary}</p>
                {module_.module.map((section) => (
                  <Card key={section.heading} className="p-3.5">
                    <h3 className="text-sm font-semibold">{section.heading}</h3>
                    <ul className="mt-1.5 space-y-1">
                      {section.points.map((p, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/80">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-teal-600" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenTraining(null)}>
              {moduleDone ? 'Close' : 'Read later'}
            </Button>
            {moduleDone ? null : <Button
              disabled={module_ == null}
              onClick={() => {
                if (!module_) return;
                const usedId = module_.id;
                const result = actions.completeTraining(usedId);
                if (result.ok) {
                  toast('success', `${module_.name} recorded`, 'Audit trail updated — flagged as a simulated demo module.');
                  setOpenTraining(null);
                } else {
                  toast('error', 'Could not record training', result.reason);
                }
              }}
            >
              I have completed this module
            </Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
