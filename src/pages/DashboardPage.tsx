import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  Compass,
  CircuitBoard,
  GraduationCap,
  Hourglass,
  PackageOpen,
  ScrollText,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatCard, UserChip } from '@/components/common';
import { StatusBadge } from '@/components/StatusBadge';
import { useStore } from '@/store/store';
import {
  activeCheckouts,
  auditVisibleTo,
  kpisForUser,
  openIncidents,
  overdueBookings,
  pendingResources,
  upcomingBookings,
} from '@/lib/derive';
import { effectiveStatus, getResource, getUser } from '@/lib/rules';
import { fmtRange, timeAgo } from '@/lib/utils';

export function DashboardPage() {
  const { state, user } = useStore();
  const navigate = useNavigate();
  const kpis = kpisForUser(state, user);
  const myBookings = state.bookings
    .filter((b) => b.userId === user.id)
    .sort((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt));
  const myCheckouts = activeCheckouts(state, user).filter((b) => b.userId === user.id);
  const outstandingBookings = myBookings.filter(
    (b) => b.status === 'requested' || b.status === 'waitlisted' || isLive(b),
  );
  const upcoming = upcomingBookings(state, user);
  const incidents = openIncidents(state, user);
  // An incident report on the booking is the follow-up, so only flag overdue items nobody has reported yet.
  const overdue = overdueBookings(state, user).filter((b) => !state.incidents.some((i) => i.bookingId === b.id));
  const pendingRes = user.role === 'admin' ? pendingResources(state) : [];
  const activity = auditVisibleTo(state, user).slice(-7).reverse();

  const actionsRow: { label: string; icon: LucideIcon; to: string }[] =
    user.role === 'student'
      ? [
          { label: 'Browse resources', icon: Compass, to: '/explore' },
          { label: 'My bookings', icon: CalendarClock, to: '/bookings' },
          { label: 'Training & profiles', icon: GraduationCap, to: '/training' },
        ]
      : user.role === 'owner'
        ? [
            { label: 'Approval queue', icon: PackageOpen, to: '/bookings?tab=queue' },
            { label: 'Incidents to review', icon: ShieldAlert, to: '/incidents' },
            { label: 'Audit trail', icon: ScrollText, to: '/audit' },
          ]
        : [
            { label: 'Approval queue', icon: PackageOpen, to: '/bookings?tab=queue' },
            { label: 'Incidents', icon: ShieldAlert, to: '/incidents' },
            { label: 'Audit log', icon: ScrollText, to: '/audit' },
          ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {user.role === 'admin' ? 'Campus operations overview' : user.role === 'owner' ? 'Resource owner dashboard' : `Welcome back, ${user.name}`}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Parul University · {new Date().toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })} · acting as {user.title}
          </p>
        </div>
        <p className="rounded-full border border-border bg-card px-3 py-1 text-[11px] text-muted-foreground">
          {user.membershipVerified ? 'Membership verified' : 'Membership unverified'} · {user.trainings.length} training{user.trainings.length === 1 ? '' : 's'} completed
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard icon={CircuitBoard} label="Available now" value={kpis.availableResources} hint={`of ${kpis.totalResources} resources`} onClick={() => navigate('/explore')} />
        <StatCard icon={CalendarClock} label="Pending requests" value={kpis.pendingRequests} hint="awaiting owner decision" onClick={() => navigate(user.role === 'student' ? '/bookings' : '/bookings?tab=queue')} />
        <StatCard icon={PackageOpen} label="Active checkouts" value={kpis.activeCheckouts} hint="currently out" onClick={() => navigate('/bookings')} />
        <StatCard icon={Hourglass} label="Waitlisted" value={kpis.waitlisted} hint="transparent queue" onClick={() => navigate('/bookings')} />
        <StatCard icon={ShieldAlert} label="Open incidents" value={kpis.openIncidents} hint={`${kpis.overdueReturns} overdue return${kpis.overdueReturns === 1 ? '' : 's'}`} tone="alert" onClick={() => navigate('/incidents')} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {pendingRes.length > 0 ? (
            <Card className="border-amber-300 bg-amber-50/70">
              <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3">
                <p className="text-xs font-medium text-amber-900">
                  {pendingRes.length} new resource{pendingRes.length > 1 ? 's' : ''} awaiting your approval: {pendingRes.map((r) => r.name).join(', ')}
                </p>
                <Button variant="outline" size="sm" className="border-amber-300 text-xs text-amber-900 hover:bg-amber-100" onClick={() => navigate(`/resources/${pendingRes[0].id}`)}>
                  Review
                </Button>
              </CardContent>
            </Card>
          ) : null}
          {overdue.length > 0 ? (
            <Card className="border-red-300 bg-red-50/70">
              <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3">
                <p className="flex items-center gap-2 text-xs font-medium text-red-800">
                  <TriangleAlert className="h-4 w-4" /> {overdue.length} overdue return{overdue.length > 1 ? 's need' : ' needs'} follow-up
                  <span className="font-normal text-red-700/80">— resolves only by return, incident or admin decision.</span>
                </p>
                <Button variant="outline" size="sm" className="border-red-300 text-xs text-red-800 hover:bg-red-100" onClick={() => navigate('/bookings')}>
                  Take action
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle>Upcoming bookings</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px]" asChild>
                <Link to="/bookings">All bookings <ArrowRight className="h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {upcoming.length === 0 ? (
                <EmptyLine text="Nothing scheduled in your scope. Explore a resource to request one." />
              ) : (
                <ul className="divide-y divide-border/80">
                  {upcoming.slice(0, 5).map((b) => (
                    <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">{getResource(state, b.resourceId).name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {getUser(state, b.userId).name} · {fmtRange(b.start, b.end)}
                        </p>
                      </div>
                      <StatusBadge status={effectiveStatus(b)} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle>Recent activity</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px]" asChild>
                <Link to="/audit">Audit log <ArrowRight className="h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="divide-y divide-border/80">
                {activity.map((e) => (
                  <li key={e.id} className="py-2.5 text-xs">
                    <p className="font-medium leading-snug">{e.summary}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {timeAgo(e.at)} · {e.actor === 'system' ? 'System' : getUser(state, e.actor).name} · <code className="text-[10px]">{e.action}</code>
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Role-specific actions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 pt-0">
              {actionsRow.map((a) => (
                <Button key={a.label} variant="outline" size="sm" className="justify-between" asChild>
                  <Link to={a.to}>
                    <span className="flex items-center gap-2">
                      <a.icon className="h-4 w-4 text-primary" /> {a.label}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-60" />
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>My activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0 text-xs">
              <Row label="My requests pending decision" value={myBookings.filter((b) => b.status === 'requested').length} />
              <Row label="My waitlisted requests" value={myBookings.filter((b) => b.status === 'waitlisted').length} />
              <Row label="My active checkouts" value={myCheckouts.length} />
              <Row label="Outstanding bookings" value={outstandingBookings.length} />
              <Row label="Incidents I must resolve" value={incidents.filter((i) => (user.role !== 'student' || i.reportedBy === user.id) && i.status !== 'resolved').length} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Acting as</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <UserChip user={user} sub={user.department} />
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                Switch personas from the profile menu (top right) to run the full lifecycle — student, resource owner and administrator views.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function isLive(b: { status: string; end: string }): boolean {
  return (b.status === 'approved' || b.status === 'checked_out') && Date.parse(b.end) >= Date.now();
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <p className="flex items-center justify-between gap-2 border-b border-border/60 pb-1.5 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </p>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="py-3 text-center text-[11px] text-muted-foreground">{text}</p>;
}
