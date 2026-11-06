import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { createStore } from '../../lib/store';
import { useLiveStore } from '../../lib/live';
import { useAuthStore } from '../../lib/auth';
import { AnimatedIcon, type IconName } from '../ui/animated-icon';
import { Odometer } from '../ui/primitives';
import { ToastViewport } from '../feedback/toast-store';

export interface ShellUiState {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  newMeetingOpen: boolean;
  setNewMeetingOpen: (open: boolean) => void;
  cmdkOpen: boolean;
  setCmdkOpen: (open: boolean) => void;
  tourStep: number;
  startTour: () => void;
  setTourStep: (step: number) => void;
  endTour: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

const THEME_STORAGE_KEY = 'mal.theme';

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') {
        if (typeof document !== 'undefined') {
          document.documentElement.dataset.theme = saved;
        }
        return saved;
      }
    } catch {
      // Ignore storage access errors
    }
  }
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.dataset.theme;
    if (attr === 'dark' || attr === 'light') return attr;
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  }
  return 'light';
}

export const useShellStore = createStore<ShellUiState>((set) => ({
  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  newMeetingOpen: false,
  setNewMeetingOpen: (newMeetingOpen) => set({ newMeetingOpen }),
  cmdkOpen: false,
  setCmdkOpen: (cmdkOpen) => set({ cmdkOpen }),
  tourStep: -1,
  startTour: () => set({ tourStep: 0 }),
  setTourStep: (tourStep) => set({ tourStep }),
  endTour: () => set({ tourStep: -1 }),
  theme: getInitialTheme(),
  setTheme: (theme) => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme;
    }
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch {
        // Ignore storage errors
      }
    }
    set({ theme });
  },
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === 'dark' ? 'light' : 'dark';
      if (typeof document !== 'undefined') {
        document.documentElement.dataset.theme = next;
      }
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch {
          // Ignore storage errors
        }
      }
      return { theme: next };
    }),
}));

export interface NavItem {
  key: string;
  path: string;
  label: string;
  mobileLabel: string;
  icon: IconName;
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', path: '/', label: 'Today', mobileLabel: 'Today', icon: 'grid' },
  {
    key: 'meetings',
    path: '/meetings',
    label: 'Meetings',
    mobileLabel: 'Meetings',
    icon: 'calendar',
  },
  { key: 'overdue', path: '/overdue', label: 'Overdue', mobileLabel: 'Overdue', icon: 'flame' },
  {
    key: 'decisions',
    path: '/decisions',
    label: 'Decision inbox',
    mobileLabel: 'Inbox',
    icon: 'bulb',
  },
  { key: 'members', path: '/members', label: 'Members', mobileLabel: 'Members', icon: 'users' },
  {
    key: 'tutorials',
    path: '/tutorials',
    label: 'Tutorials',
    mobileLabel: 'Tutorials',
    icon: 'play',
  },
  {
    key: 'profile',
    path: '/profile',
    label: 'Profile',
    mobileLabel: 'Profile',
    icon: 'user',
  },
  {
    key: 'about',
    path: '/about',
    label: 'About',
    mobileLabel: 'About',
    icon: 'help',
  },
];

export const MOBILE_NAV_ITEMS: NavItem[] = [
  NAV_ITEMS[0]!,
  NAV_ITEMS[1]!,
  NAV_ITEMS[2]!,
  NAV_ITEMS[3]!,
  NAV_ITEMS[6]!,
  NAV_ITEMS[7]!,
];

export function isNavActive(pathname: string, itemPath: string): boolean {
  if (itemPath === '/') return pathname === '/';
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

export function getBreadcrumbForPath(pathname: string): string {
  if (pathname === '/') return 'Ledger / Today';
  if (pathname === '/meetings') return 'Ledger / Meetings';
  if (pathname.startsWith('/meetings/')) return 'Ledger / Meeting';
  if (pathname === '/overdue') return 'Ledger / Overdue';
  if (pathname === '/decisions') return 'Ledger / Decision inbox';
  if (pathname === '/members') return 'Ledger / Members';
  if (pathname === '/tutorials') return 'Ledger / Tutorials';
  if (pathname === '/login') return 'Ledger / Sign in';
  if (pathname === '/profile') return 'Ledger / Profile';
  if (pathname === '/about') return 'Ledger / About';
  return 'Ledger / Not found';
}

export interface CommandPaletteItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: IconName;
  onSelect: () => void;
}

export function CommandPalette({ extraItems = [] }: { extraItems?: CommandPaletteItem[] }) {
  const { cmdkOpen, setCmdkOpen, setNewMeetingOpen, toggleTheme, startTour } = useShellStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo<CommandPaletteItem[]>(() => {
    const base: CommandPaletteItem[] = [
      ...NAV_ITEMS.map((n) => ({
        id: `nav-${n.key}`,
        label: `Go to ${n.label}`,
        sublabel: 'Navigation',
        icon: n.icon,
        onSelect: () => navigate(n.path),
      })),
      {
        id: 'act-new-meeting',
        label: 'Log a new meeting',
        sublabel: 'Action',
        icon: 'plus',
        onSelect: () => setNewMeetingOpen(true),
      },
      {
        id: 'act-tour',
        label: 'Start guided demo tour',
        sublabel: 'Tour',
        icon: 'play',
        onSelect: () => startTour(),
      },
      {
        id: 'act-theme',
        label: 'Toggle light / dark theme',
        sublabel: 'Appearance',
        icon: 'moon',
        onSelect: () => toggleTheme(),
      },
      ...extraItems,
    ];
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((it) => `${it.label} ${it.sublabel ?? ''}`.toLowerCase().includes(q));
  }, [extraItems, navigate, query, setNewMeetingOpen, startTour, toggleTheme]);

  useEffect(() => {
    if (cmdkOpen) {
      setQuery('');
      setActiveIndex(0);
      inputRef.current?.focus();
    }
  }, [cmdkOpen]);

  useEffect(() => {
    if (!cmdkOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setCmdkOpen(false);
      }
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [cmdkOpen, setCmdkOpen]);

  if (!cmdkOpen) return null;

  return (
    <div
      className="cmdk-scrim"
      onClick={() => setCmdkOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="cmdk-box" onClick={(e) => e.stopPropagation()}>
        <div className="cmdk-in">
          <AnimatedIcon name="search" />
          <input
            ref={inputRef}
            autoFocus
            type="text"
            placeholder="Jump to page, meeting, or action..."
            aria-label="Command palette search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                setCmdkOpen(false);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((i) => (items.length ? (i + 1) % items.length : 0));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
              } else if (e.key === 'Enter' && items[activeIndex]) {
                e.preventDefault();
                const chosen = items[activeIndex];
                setCmdkOpen(false);
                chosen.onSelect();
              }
            }}
          />
          <kbd className="mono" style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
            ESC
          </kbd>
        </div>
        <div className="cmdk-list" role="listbox">
          {items.length === 0 ? (
            <p className="muted" style={{ padding: '12px 16px', margin: 0 }}>
              No matching commands.
            </p>
          ) : (
            items.map((it, idx) => (
              <button
                key={it.id}
                type="button"
                role="option"
                aria-selected={idx === activeIndex}
                data-active={idx === activeIndex}
                className="cmdk-item ah"
                onClick={() => {
                  setCmdkOpen(false);
                  it.onSelect();
                }}
              >
                <AnimatedIcon name={it.icon} />
                <span style={{ flex: 1, fontWeight: 500 }}>{it.label}</span>
                {it.sublabel && <span className="eyebrow">{it.sublabel}</span>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const LIVE_LABEL = { live: 'Live', connecting: 'Reconnecting', offline: 'Offline' } as const;

/** Shows whether this tab is receiving real-time updates from /api/events. */
export function LiveIndicator() {
  const { status } = useLiveStore();
  return (
    <span
      className="live"
      data-state={status}
      role="status"
      title={
        status === 'live'
          ? 'Changes from teammates appear here instantly'
          : 'Live updates paused; data refreshes when the connection returns'
      }
    >
      <span className="pulse" aria-hidden="true" />
      <span className="txt">{LIVE_LABEL[status]}</span>
    </span>
  );
}

export interface AppShellProps {
  openActionsCount?: number;
  overdueCount?: number;
  pendingDecisionsCount?: number;
  commandItems?: CommandPaletteItem[];
  onNewMeetingClick?: () => void;
  children: ReactNode;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return 'CU';
  const last = parts[parts.length - 1];
  if (parts.length === 1 || !last) {
    return first.slice(0, 2).toUpperCase();
  }
  const f = first[0] ?? '';
  const l = last[0] ?? '';
  return (f + l).toUpperCase() || 'CU';
}

export function AppShell({
  openActionsCount = 0,
  overdueCount = 0,
  pendingDecisionsCount = 0,
  commandItems = [],
  onNewMeetingClick,
  children,
}: AppShellProps) {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const navRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [navIndY, setNavIndY] = useState(0);

  const {
    searchQuery,
    setSearchQuery,
    setNewMeetingOpen,
    setCmdkOpen,
    startTour,
    theme,
    toggleTheme,
  } = useShellStore();

  useEffect(() => {
    const navEl = navRef.current;
    if (!navEl) return;
    const activeLink = navEl.querySelector<HTMLAnchorElement>('a[aria-current="page"]');
    if (activeLink) {
      setNavIndY(activeLink.offsetTop);
    }
  }, [location.pathname, overdueCount, pendingDecisionsCount]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdkOpen(true);
        return;
      }
      const target = e.target as HTMLElement | null;
      const inInput = target && /input|textarea|select/i.test(target.tagName);
      if (e.key === '/' && !inInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [setCmdkOpen]);

  const handleNewMeeting = () => {
    if (onNewMeetingClick) {
      onNewMeetingClick();
    } else {
      setNewMeetingOpen(true);
    }
  };

  const crumb = getBreadcrumbForPath(location.pathname);

  return (
    <>
      <div className="app">
        <aside className="spine" aria-label="Main navigation">
          <div className="brand">
            <span className="mark" id="logo">
              <AnimatedIcon name="listcheck" />
            </span>
            <span>
              <b>MeetingActionLog</b>
              <small>Decisions → owners</small>
            </span>
          </div>
          <nav className="nav" id="nav" ref={navRef}>
            <span
              className="nav-ind"
              id="navInd"
              style={{ transform: `translateY(${navIndY}px)` }}
            />
            {NAV_ITEMS.map((item) => {
              const active = isNavActive(location.pathname, item.path);
              return (
                <Link
                  key={item.key}
                  to={item.path}
                  className="ah"
                  data-nav={item.key}
                  aria-current={active ? 'page' : undefined}
                >
                  <AnimatedIcon name={item.icon} />
                  <span>{item.label}</span>
                  {item.key === 'overdue' && overdueCount > 0 && (
                    <span className="count late">{overdueCount}</span>
                  )}
                  {item.key === 'decisions' && pendingDecisionsCount > 0 && (
                    <span className="count dec">{pendingDecisionsCount}</span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="spine-stat">
            <span className="eyebrow">Open actions</span>
            <span className="big" id="sideOpen">
              <Odometer value={openActionsCount} />
            </span>
            <p>Tick boxes, convert decisions into tasks, log meetings, and switch theme.</p>
          </div>
          <div className="spine-student" id="spineStudent">
            <div className="spine-course">Backend Development CIA-II</div>
            <div className="spine-author">Nithin Kumar U</div>
            <div className="spine-usn mono">USN 2102508611</div>
          </div>
        </aside>

        <div className="main">
          <header className={`top ${scrolled ? 'scrolled' : ''}`} id="top">
            <span className="crumb" id="crumb">
              {crumb}
            </span>
            <div className="search">
              <AnimatedIcon name="search" />
              <label htmlFor="q" className="sr">
                Search meetings
              </label>
              <input
                ref={searchInputRef}
                id="q"
                type="search"
                placeholder="Search meetings"
                autoComplete="off"
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  if (location.pathname !== '/meetings') {
                    navigate('/meetings');
                  }
                }}
              />
              <kbd>/</kbd>
            </div>
            <LiveIndicator />
            <button
              type="button"
              className="btn btn-line btn-demo ah"
              id="demoBtn"
              aria-label="Start guided demo"
              onClick={startTour}
            >
              <span className="lbl" id="demoLbl">
                <AnimatedIcon name="play" />
                <span className="txt">Guided demo</span>
                <span className="dot" aria-hidden="true" />
              </span>
            </button>
            <button
              type="button"
              className="btn btn-line btn-icon ah"
              id="themeBtn"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={toggleTheme}
            >
              <AnimatedIcon name={theme === 'dark' ? 'sun' : 'moon'} />
            </button>
            {user ? (
              <Link
                to="/profile"
                className="user-top-pill ah"
                id="userPill"
                title={`Signed in as ${user.name} (${user.role})`}
                aria-label="View user profile"
              >
                <span
                  className="user-top-avatar"
                  style={{ backgroundColor: `hsl(${user.avatarHue}, 65%, 45%)` }}
                >
                  {getInitials(user.name)}
                </span>
                <span className="user-top-name">{user.name}</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="btn btn-line btn-auth ah"
                id="loginBtn"
                aria-label="Sign in or create profile"
              >
                <AnimatedIcon name="user" />
                <span className="txt">Sign in</span>
              </Link>
            )}
            <button
              type="button"
              className="btn btn-primary ah"
              id="newMeetingBtn"
              onClick={handleNewMeeting}
            >
              <span className="lbl" id="nmLbl">
                <AnimatedIcon name="plus" />
                <span className="txt">New meeting</span>
              </span>
            </button>
          </header>
          <main id="view" className="view enter" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>

      <nav className="tabbar" id="tabbar" aria-label="Main navigation (mobile)">
        {MOBILE_NAV_ITEMS.map((item) => {
          const active = isNavActive(location.pathname, item.path);
          return (
            <Link
              key={item.key}
              to={item.path}
              className="ah"
              data-nav={item.key}
              aria-current={active ? 'page' : undefined}
            >
              <AnimatedIcon name={item.icon} />
              <span>{item.mobileLabel}</span>
            </Link>
          );
        })}
      </nav>

      <CommandPalette extraItems={commandItems} />
      <ToastViewport />
    </>
  );
}
