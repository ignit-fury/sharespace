import { useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { notificationsFor, openIncidents } from '@/lib/derive';
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Compass,
  GraduationCap,
  LayoutDashboard,
  Menu,
  RotateCcw,
  ScrollText,
  ShieldAlert,
  TriangleAlert,
  UserRound,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ResetDemoDialog } from '@/components/ResetDemoDialog';
import { GuideDialog } from '@/components/GuideDialog';
import { UserAvatar } from '@/components/common';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['student', 'owner', 'admin'] },
  { to: '/explore', label: 'Explore', icon: Compass, roles: ['student', 'owner', 'admin'] },
  { to: '/bookings', label: 'Bookings', icon: CalendarDays, roles: ['student', 'owner', 'admin'] },
  { to: '/incidents', label: 'Incidents', icon: ShieldAlert, roles: ['student', 'owner', 'admin'] },
  { to: '/training', label: 'Training & profiles', icon: GraduationCap, roles: ['student', 'owner', 'admin'] },
  { to: '/audit', label: 'Audit log', icon: ScrollText, roles: ['student', 'owner', 'admin'] },
];

const MOBILE_NAV = NAV.slice(0, 4);

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M7.5 14.5c0 1.6 2 2.6 4.5 2.6s4.4-1.1 4.4-2.9c0-3.5-8.4-2-8.4-5.4 0-1.7 1.7-2.8 4.1-2.8 2.2 0 3.9 1 4.2 2.6" />
        </svg>
      </span>
      {!compact ? (
        <span className="leading-tight">
          <span className="block text-sm font-bold tracking-tight text-foreground">ShareSpace</span>
          <span className="block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Parul University</span>
        </span>
      ) : null}
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { user, state } = useStore();
  const pending = state.bookings.filter(
    (b) => b.status === 'requested' && (user.role === 'admin' || (user.role === 'owner' && state.resources.find((r) => r.id === b.resourceId)?.ownerId === user.id)),
  ).length;
  // Only incidents this person can see: own reports/bookings, owned resources, or all for admins.
  const incidentCount = openIncidents(state, user).length;

  const badgeFor = (to: string) => {
    if (to === '/bookings' && user.role !== 'student' && pending > 0) return pending;
    if (to === '/incidents' && incidentCount > 0) return incidentCount;
    return null;
  };

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.filter((item) => item.roles.includes(user.role)).map((item) => {
        const badge = badgeFor(item.to);
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                isActive ? 'bg-accent font-semibold text-accent-foreground' : 'text-foreground/80 hover:bg-muted/60 hover:text-foreground',
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {badge ? (
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">{badge}</span>
            ) : null}
          </NavLink>
        );
      })}
    </nav>
  );
}

function StorageWarning({ className }: { className?: string }) {
  const { storageWarning } = useStore();
  if (!storageWarning) return null;
  return (
    <p className={cn('flex items-center gap-1 rounded-md border border-red-200 bg-red-50 p-3 text-[11px] font-medium text-red-700', className)}>
      <TriangleAlert className="h-3 w-3" /> Storage full — some changes may not persist.
    </p>
  );
}

function PersonaSwitcher({ compact = false }: { compact?: boolean }) {
  const { state, user, actions } = useStore();
  return (
    <div className={cn('space-y-1', compact && 'w-full')}>
      {!compact ? <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Demo personas</p> : <p className="pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Switch demo persona</p>}
      {state.users
        .filter((u) => u.selectable)
        .map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => actions.switchPersona(u.id)}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
              u.id === user.id ? 'bg-accent font-medium text-accent-foreground' : 'hover:bg-muted/60',
            )}
          >
            <UserAvatar user={u} size="sm" />
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate font-medium">{u.name}</span>
              <span className="block truncate text-[10px] text-muted-foreground capitalize">{u.role}</span>
            </span>
            {u.id === user.id ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : null}
          </button>
        ))}
    </div>
  );
}

function ProfileMenu() {
  const { user } = useStore();
  const [guideOpen, setGuideOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 px-2">
            <UserAvatar user={user} size="sm" />
            <span className="hidden min-w-0 text-left leading-tight sm:block">
              <span className="block max-w-24 truncate text-xs font-semibold">{user.name}</span>
              <span className="block text-[10px] capitalize text-muted-foreground">{user.role}</span>
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <UserAvatar user={user} />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{user.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{user.department}</p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Demo persona switcher</DropdownMenuLabel>
          <div className="px-1 pb-1">
            <PersonaSwitcher compact />
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setGuideOpen(true)} className="gap-2">
            <ClipboardList className="h-3.5 w-3.5" /> Guide
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setResetOpen(true)} className="gap-2 text-red-700 data-[highlighted]:text-red-800">
            <RotateCcw className="h-3.5 w-3.5" /> Reset demo data…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div className="px-2 pb-1.5 text-[10px] leading-relaxed text-muted-foreground">
            Demo accounts, not secure authentication.
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      <GuideDialog open={guideOpen} onOpenChange={setGuideOpen} />
      <ResetDemoDialog open={resetOpen} onOpenChange={setResetOpen} />
    </>
  );
}

const TONE_DOT = { info: 'bg-sky-500', success: 'bg-emerald-500', warning: 'bg-amber-500', alert: 'bg-red-500' } as const;

function NotificationBell() {
  const { state, user, actions } = useStore();
  const navigate = useNavigate();
  const notices = notificationsFor(state, user);
  const unread = notices.filter((n) => n.unread).length;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative px-2" aria-label={`Notifications, ${unread} unread`}>
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
        <div className="flex items-center justify-between gap-2 pr-1">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          {unread > 0 ? (
            <button
              type="button"
              className="rounded px-1.5 py-0.5 text-[11px] font-medium text-primary hover:bg-muted"
              // Keep the menu open so the person sees the items turn read.
              onClick={(e) => { e.preventDefault(); actions.markNotificationsSeen(); }}
            >
              Mark all read
            </button>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        {notices.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">Nothing new. Approvals, reminders and overdue alerts appear here.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notices.map((n) => (
              <DropdownMenuItem key={n.id} onSelect={() => navigate(n.link)} className="items-start gap-2 py-2">
                <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', TONE_DOT[n.tone])} />
                <span className="min-w-0 text-xs leading-snug">
                  <span className={cn('block', n.unread && 'font-semibold')}>{n.text}</span>
                  <span className="block text-[10px] text-muted-foreground">{new Date(n.at).toLocaleString()}</span>
                </span>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const { state, user } = useStore();
  const location = useLocation();
  const title = NAV.find((n) => (n.to === '/' ? location.pathname === '/' : location.pathname.startsWith(n.to)))?.label ?? 'Explore';

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card px-4 py-5 lg:flex">
        <Wordmark />
        <div className="mt-6 flex-1">
          <NavList />
        </div>
        <StorageWarning className="mb-3" />
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur lg:pl-64">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            className="rounded-md p-1.5 hover:bg-muted/70 lg:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold hidden sm:block">{title}</span>
          <div className="ml-auto flex items-center gap-1.5">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => setGuideOpen(true)}>
              <ClipboardList className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Guide</span>
            </Button>
            <Button variant="ghost" size="sm" className="hidden gap-1.5 text-xs text-red-700 hover:text-red-800 sm:inline-flex" onClick={() => setResetOpen(true)}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
            <NotificationBell />
            <ProfileMenu />
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-[rgba(16,24,42,0.45)]" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[82vw] flex-col overflow-y-auto border-r border-border bg-card p-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <Wordmark />
              <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-md p-1.5 hover:bg-muted/70" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 flex-1">
              <NavList onNavigate={() => setDrawerOpen(false)} />
            </div>
            <PersonaSwitcher compact />
            <div className="mb-2 mt-3 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => { setDrawerOpen(false); setGuideOpen(true); }}>
                <UserRound className="h-3.5 w-3.5" /> Guide
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-xs text-red-700" onClick={() => { setDrawerOpen(false); setResetOpen(true); }}>
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
            </div>
            <StorageWarning className="mb-2" />
          </div>
        </div>
      ) : null}

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-border bg-card/95 backdrop-blur lg:hidden">
        {MOBILE_NAV.map((item) => {
          const badge = item.to === '/incidents' ? openIncidents(state, user).length : null;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn('relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium', isActive ? 'text-primary' : 'text-muted-foreground')
              }
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
              {badge ? <span className="absolute right-1/4 top-1 h-2 w-2 rounded-full bg-red-500" /> : null}
            </NavLink>
          );
        })}
      </nav>

      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-5 sm:px-6 lg:pb-10">{children}</div>
      </main>

      <GuideDialog open={guideOpen} onOpenChange={setGuideOpen} />
      <ResetDemoDialog open={resetOpen} onOpenChange={setResetOpen} />
    </div>
  );
}
