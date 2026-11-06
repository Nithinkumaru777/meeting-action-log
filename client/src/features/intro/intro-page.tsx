import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuthStore, type DemoUserCard } from '../../lib/auth';
import { useShellStore } from '../../components/layout/app-shell';
import { AnimatedIcon } from '../../components/ui/animated-icon';

interface SimState {
  meetingType: string;
  members: number;
  decisions: number;
  actions: number;
  days: number;
}

export function IntroPage({
  initialView = 'showcase',
}: {
  initialView?: 'showcase' | 'auth' | 'about';
} = {}) {
  const navigate = useNavigate();
  const { user, status, login, register, demoUsers, fetchDemoUsers } = useAuthStore();
  const { theme, toggleTheme } = useShellStore();

  // View mode: 'showcase', in-built 'auth', or public 'about'
  const [view, setView] = useState<'showcase' | 'auth' | 'about'>(initialView);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  // Simulator state
  const [sim, setSim] = useState<SimState>({
    meetingType: 'sprint sync',
    members: 5,
    decisions: 4,
    actions: 3,
    days: 5,
  });

  // Student info modal state
  const [studentModalOpen, setStudentModalOpen] = useState(false);

  // Form states
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Calculate dynamic slip risk
  const workloadRatio = sim.actions / (sim.members * Math.max(1, Math.sqrt(sim.days)));
  const decisionRatio = sim.decisions / Math.max(1, sim.members);
  const typeWeight =
    sim.meetingType === 'incident postmortem'
      ? 1.4
      : sim.meetingType === 'architecture review'
        ? 1.2
        : sim.meetingType === 'client kickoff'
          ? 1.1
          : 0.95;

  const rawRisk = workloadRatio * 3.2 * typeWeight + decisionRatio * 1.2;
  const slipChance = Math.min(96.5, Math.max(0.9, Math.round(rawRisk * 10) / 10));

  let riskTier: { grade: string; label: string; badgeClass: string; status: string } = {
    grade: 'A',
    label: 'Low risk',
    badgeClass: 'risk-a',
    status: 'Sanctioned · On track',
  };

  if (slipChance > 12) {
    riskTier = {
      grade: 'C',
      label: 'Elevated risk',
      badgeClass: 'risk-c',
      status: 'Action required · Workload rebalance',
    };
  } else if (slipChance > 4) {
    riskTier = {
      grade: 'B',
      label: 'Moderate risk',
      badgeClass: 'risk-b',
      status: 'Monitor deadlines · Tasks active',
    };
  }

  const handleAccessClick = () => {
    if (user) {
      navigate('/today');
    } else {
      void fetchDemoUsers();
      setView('auth');
    }
  };

  const handleDemoSelect = async (demo: DemoUserCard) => {
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      await login({ email: demo.email, password: 'Password123!' });
      navigate('/today');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Demo sign in failed';
      setAuthError(msg);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!loginEmail.trim() || !loginPassword) {
      setAuthError('Please enter both email and password.');
      return;
    }
    setAuthSubmitting(true);
    try {
      await login({ email: loginEmail.trim().toLowerCase(), password: loginPassword });
      navigate('/today');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setAuthError(msg);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      setAuthError('Please fill in all required fields.');
      return;
    }
    if (regPassword.length < 8) {
      setAuthError('Password must be at least 8 characters long.');
      return;
    }
    setAuthSubmitting(true);
    try {
      await register({
        name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        role: 'Customer',
        avatarHue: 200,
        password: regPassword,
      });
      navigate('/today');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setAuthError(msg);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const demoList: DemoUserCard[] =
    demoUsers.length > 0
      ? demoUsers
      : [
          {
            id: '1',
            name: 'Ananya Rao',
            email: 'ananya.rao@meetingactionlog.dev',
            role: 'Product Lead',
            avatarHue: 176,
            memberId: 'm1',
          },
          {
            id: '2',
            name: 'Karthik Shetty',
            email: 'karthik.shetty@meetingactionlog.dev',
            role: 'Backend Engineer',
            avatarHue: 28,
            memberId: 'm2',
          },
          {
            id: '3',
            name: 'Meera Iyer',
            email: 'meera.iyer@meetingactionlog.dev',
            role: 'Designer',
            avatarHue: 320,
            memberId: 'm3',
          },
          {
            id: '4',
            name: 'Priya Menon',
            email: 'priya.menon@meetingactionlog.dev',
            role: 'Marketing',
            avatarHue: 250,
            memberId: 'm4',
          },
          {
            id: '5',
            name: 'Rahul Nair',
            email: 'rahul.nair@meetingactionlog.dev',
            role: 'QA Engineer',
            avatarHue: 46,
            memberId: 'm5',
          },
        ];

  const getInitials = (name: string): string => {
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
  };

  return (
    <div className="intro-canvas">
      {/* Top Navigation Bar */}
      <header className="intro-nav" aria-label="Intro navigation">
        <div className="intro-brand">
          <span className="intro-logo-badge" id="introLogo">
            <AnimatedIcon name="listcheck" />
          </span>
          <span className="intro-brand-text">
            <span className="intro-brand-title">MeetingActionLog</span>
          </span>
        </div>

        <div className="intro-nav-right">
          <Link
            to="/about"
            className={`intro-nav-link ${view === 'about' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              setView(view === 'about' ? 'showcase' : 'about');
            }}
          >
            About the project
          </Link>

          <button
            type="button"
            className="intro-student-badge"
            onClick={() => setStudentModalOpen(true)}
            aria-label="View developer information"
          >
            unithinkumar
          </button>

          {user && (
            <Link to="/profile" className="intro-user-pill" title={`Signed in as ${user.name}`}>
              <span
                className="u-av"
                style={{
                  backgroundColor: `hsl(${user.avatarHue}, 65%, 45%)`,
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                {getInitials(user.name)}
              </span>
              <span>{user.name}</span>
            </Link>
          )}

          <button
            type="button"
            className="intro-theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <AnimatedIcon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
        </div>
      </header>

      {/* Main Content: Showcase Mode, About View, or Inbuild Auth Mode */}
      {view === 'showcase' && (
        <main className="intro-main">
          <div className="intro-hero-container">
            <h1 className="intro-headline">
              Know who owns what
              <br />
              <em>before things slip.</em>
            </h1>

            <p className="intro-subhead">
              MeetingActionLog reads meeting decisions, estimates execution risk, assigns
              accountable owners with strict due dates, and shows exactly which commitments moved
              forward.
            </p>

            {/* Interactive Underline Sentence Simulator */}
            <div className="intro-simulator-box" aria-label="Interactive meeting ledger simulator">
              <div className="intro-sim-indicator">
                <span className="bullet-sq" aria-hidden="true">
                  &#9632;
                </span>
                <span>Change any underlined value</span>
              </div>

              <div className="intro-sentence">
                <span className="sentence-text">A </span>
                <span className="inline-select-wrap">
                  <select
                    aria-label="Meeting type"
                    value={sim.meetingType}
                    onChange={(e) => setSim({ ...sim, meetingType: e.target.value })}
                    className="inline-select"
                  >
                    <option value="sprint sync">sprint sync</option>
                    <option value="architecture review">architecture review</option>
                    <option value="incident postmortem">incident postmortem</option>
                    <option value="executive sync">executive sync</option>
                    <option value="client kickoff">client kickoff</option>
                  </select>
                  <span className="underline-anchor">{sim.meetingType}</span>
                </span>

                <span className="sentence-text"> with </span>
                <span className="inline-select-wrap">
                  <select
                    aria-label="Number of members"
                    value={sim.members}
                    onChange={(e) => setSim({ ...sim, members: Number(e.target.value) })}
                    className="inline-select"
                  >
                    <option value={2}>2 members</option>
                    <option value={3}>3 members</option>
                    <option value={5}>5 members</option>
                    <option value={8}>8 members</option>
                    <option value={12}>12 members</option>
                  </select>
                  <span className="underline-anchor">{sim.members} members</span>
                </span>

                <span className="sentence-text"> logs </span>
                <span className="inline-select-wrap">
                  <select
                    aria-label="Number of decisions"
                    value={sim.decisions}
                    onChange={(e) => setSim({ ...sim, decisions: Number(e.target.value) })}
                    className="inline-select"
                  >
                    <option value={2}>2 decisions</option>
                    <option value={4}>4 decisions</option>
                    <option value={6}>6 decisions</option>
                    <option value={10}>10 decisions</option>
                  </select>
                  <span className="underline-anchor">{sim.decisions} decisions</span>
                </span>

                <span className="sentence-text">, creating </span>
                <span className="inline-select-wrap">
                  <select
                    aria-label="Number of action items"
                    value={sim.actions}
                    onChange={(e) => setSim({ ...sim, actions: Number(e.target.value) })}
                    className="inline-select"
                  >
                    <option value={1}>1 action item</option>
                    <option value={3}>3 action items</option>
                    <option value={6}>6 action items</option>
                    <option value={10}>10 action items</option>
                    <option value={16}>16 action items</option>
                  </select>
                  <span className="underline-anchor">
                    {sim.actions} {sim.actions === 1 ? 'action item' : 'action items'}
                  </span>
                </span>

                <span className="sentence-text"> due within </span>
                <span className="inline-select-wrap">
                  <select
                    aria-label="Deadline days"
                    value={sim.days}
                    onChange={(e) => setSim({ ...sim, days: Number(e.target.value) })}
                    className="inline-select"
                  >
                    <option value={2}>2 days</option>
                    <option value={5}>5 days</option>
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                  </select>
                  <span className="underline-anchor">{sim.days} days</span>
                </span>
                <span className="sentence-text">.</span>
              </div>

              {/* Live Calculated Evaluation Strip */}
              <div className="intro-metric-strip">
                <div className="metric-primary">
                  <span className="metric-val">{slipChance}%</span>
                  <span className="metric-lbl">
                    estimated chance
                    <br />
                    of slip
                  </span>
                </div>

                <div className="metric-badge-wrap">
                  <span className={`risk-grade-badge ${riskTier.badgeClass}`}>
                    <b>{riskTier.grade}</b> {riskTier.label}
                  </span>
                </div>

                <div className="metric-status-wrap">
                  <span className="metric-status-chip">
                    <AnimatedIcon name="check" />
                    <span>{riskTier.status}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Action Row */}
            <div className="intro-cta-row">
              <button type="button" className="btn-access-application" onClick={handleAccessClick}>
                <span>Access full application</span>
                <AnimatedIcon name="arrow" />
              </button>

              <button
                type="button"
                className="btn-intro-secondary"
                onClick={() => {
                  if (user) {
                    navigate('/tutorials');
                  } else {
                    setView('auth');
                  }
                }}
              >
                <AnimatedIcon name="play" />
                <span>Watch tutorials</span>
              </button>

              <button
                type="button"
                className="btn-intro-secondary"
                onClick={() => setView('about')}
              >
                <AnimatedIcon name="help" />
                <span>System specs</span>
              </button>
            </div>

            {!user && (
              <p className="intro-cta-hint">
                Requires customer login or profile creation. 1-click team demo logins are available.
              </p>
            )}

            {/* Feature Highlights Grid */}
            <div className="intro-features-grid">
              <div className="intro-feature-card">
                <div className="feature-icon">
                  <AnimatedIcon name="bulb" />
                </div>
                <h3>Decisions With Owners</h3>
                <p>
                  Every decision captured during meetings leaves with a named owner, rationale, and
                  immutable audit trail.
                </p>
              </div>

              <div className="intro-feature-card">
                <div className="feature-icon">
                  <AnimatedIcon name="flame" />
                </div>
                <h3>Proactive Overdue Escalation</h3>
                <p>
                  Automatic timezone-aware calculation flags slipping actions before team sprint
                  velocity degrades.
                </p>
              </div>

              <div className="intro-feature-card">
                <div className="feature-icon">
                  <AnimatedIcon name="users" />
                </div>
                <h3>Customer Profiles &amp; Activity</h3>
                <p>
                  Individual customer profiles with customized avatar hues and real-time personal
                  ledger activity tracking.
                </p>
              </div>

              <div className="intro-feature-card">
                <div className="feature-icon">
                  <AnimatedIcon name="listcheck" />
                </div>
                <h3>Zero-Polling Live Sync</h3>
                <p>
                  Multi-client SSE broadcasts ensure meetings, converted decisions, and check-offs
                  synchronize immediately.
                </p>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* PUBLIC ABOUT VIEW */}
      {view === 'about' && (
        <main className="intro-about-container" aria-label="About the project view">
          <div className="intro-about-card">
            <button type="button" className="inbuild-back-btn" onClick={() => setView('showcase')}>
              <span aria-hidden="true">&larr;</span>
              <span>Return to showcase</span>
            </button>

            <h1 className="inbuild-auth-title">
              About this <em>project</em>
            </h1>
            <p className="inbuild-auth-subhead">
              System overview, student details, architectural specifications, and practical
              applications.
            </p>

            <div className="about-grid">
              <div className="about-panel">
                <dl className="about-dl">
                  <dt>Project</dt>
                  <dd>
                    MeetingActionLog: Meeting decisions, action items, and ownership tracking system
                  </dd>

                  <dt>Course</dt>
                  <dd>Backend Development, CIA-II</dd>

                  <dt>Topic</dt>
                  <dd>
                    Meeting decisions, assigned actions, and ownership tracking (MERN Full Stack)
                  </dd>

                  <dt>Student</dt>
                  <dd>
                    <b>Nithin Kumar U</b>
                  </dd>

                  <dt>USN</dt>
                  <dd>
                    <span className="mono bold">2102508611</span>
                  </dd>

                  <dt>Built with</dt>
                  <dd>
                    Antigravity (planning, orchestration, browser testing) and Claude Code
                    (implementation and tests)
                  </dd>

                  <dt>Differentiators</dt>
                  <dd>
                    (1) Overdue actions grouped by owner with +3 days quick-chase; (2) Decision
                    inbox for unconverted meeting decisions with one-click task conversion
                  </dd>

                  <dt>Stack</dt>
                  <dd>
                    React 19, TypeScript, TanStack Query v5, Node.js, Express.js, MongoDB /
                    Mongoose, Zod v4, Server-Sent Events (SSE)
                  </dd>
                </dl>

                <div className="about-actions" style={{ marginTop: '24px' }}>
                  <button
                    type="button"
                    className="inbuild-submit-btn"
                    style={{ width: 'auto', padding: '11px 22px', margin: 0 }}
                    onClick={() => setView('auth')}
                  >
                    Access full application
                  </button>
                  <a
                    href="/api/health"
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-line ah"
                    id="apiHealthBtn"
                  >
                    <AnimatedIcon name="check" />
                    <span>API Health Check</span>
                  </a>
                </div>
              </div>

              <div className="about-panel">
                <h2 className="about-subtitle">Practical uses</h2>
                <ul className="about-uses">
                  <li>
                    <b>Sprint ceremonies:</b> Engineering and product teams tracking commitments,
                    decisions, and action items from standups and planning.
                  </li>
                  <li>
                    <b>Accountability:</b> Project managers ensuring every decision leaves the room
                    with an explicit owner and due date.
                  </li>
                  <li>
                    <b>Centralized workload:</b> Team members reviewing upcoming and overdue tasks
                    across all meetings in one unified ledger.
                  </li>
                  <li>
                    <b>Decision triage:</b> Leadership identifying and converting unassigned
                    decisions before they slip through the cracks.
                  </li>
                  <li>
                    <b>Real-time collaboration:</b> Multi-client synchronization across teammate
                    desks via Server-Sent Events (SSE).
                  </li>
                </ul>

                <h2 className="about-subtitle" style={{ marginTop: '24px' }}>
                  System guarantees
                </h2>
                <ul className="about-uses">
                  <li>
                    <b>Zero emojis:</b> 31 purposeful SVG icons with crafted micro-animations.
                  </li>
                  <li>
                    <b>Shared validation:</b> Client forms and REST endpoints validate against
                    identical Zod v4 schemas from <code>@mal/shared</code>.
                  </li>
                  <li>
                    <b>Optimistic UI:</b> Instant state updates with one-click undo toasts and
                    automatic cache rollback.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* INBUILD AUTH UI (Exact Match to Reference Image 2) */}
      {view === 'auth' && (
        <main className="inbuild-auth-container" aria-label="Customer authentication view">
          <div className="inbuild-auth-card">
            <button
              type="button"
              className="inbuild-back-btn"
              onClick={() => {
                setView('showcase');
                setAuthError(null);
              }}
              aria-label="Return to showcase"
            >
              &larr; Back to showcase
            </button>

            <h2 className="inbuild-auth-title">
              {authMode === 'register' ? 'Create your account' : 'Sign in to your account'}
            </h2>

            <p className="inbuild-auth-subhead">
              {authMode === 'register'
                ? 'Create a free account to run assessments and keep your history.'
                : 'Sign in to access your meetings, decisions, and personal ledger.'}
            </p>

            {/* Segmented Control Switcher */}
            <div className="inbuild-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'login'}
                className={`inbuild-tab ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setAuthMode('login');
                  setAuthError(null);
                }}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'register'}
                className={`inbuild-tab ${authMode === 'register' ? 'active' : ''}`}
                onClick={() => {
                  setAuthMode('register');
                  setAuthError(null);
                }}
              >
                Create account
              </button>
            </div>

            {authError && (
              <div className="auth-error-alert" role="alert">
                <AnimatedIcon name="alert" />
                <span>{authError}</span>
              </div>
            )}

            {/* Form */}
            {authMode === 'register' ? (
              <form onSubmit={handleRegisterSubmit} className="inbuild-form" noValidate>
                <div className="inbuild-field">
                  <label htmlFor="inbuild-name">Full name</label>
                  <input
                    id="inbuild-name"
                    type="text"
                    required
                    placeholder="e.g. Alex Morgan"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="inbuild-input"
                  />
                </div>

                <div className="inbuild-field">
                  <label htmlFor="inbuild-email">Email</label>
                  <input
                    id="inbuild-email"
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="inbuild-input"
                  />
                </div>

                <div className="inbuild-field">
                  <label htmlFor="inbuild-password">Password</label>
                  <input
                    id="inbuild-password"
                    type="password"
                    required
                    placeholder="Enter password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="inbuild-input"
                  />
                  <span className="inbuild-hint">
                    At least 8 characters with a letter and a number.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={authSubmitting || status === 'loading'}
                  className="inbuild-submit-btn"
                >
                  {authSubmitting ? 'Creating account...' : 'Create account'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleLoginSubmit} className="inbuild-form" noValidate>
                <div className="inbuild-field">
                  <label htmlFor="inbuild-login-email">Email</label>
                  <input
                    id="inbuild-login-email"
                    type="email"
                    required
                    placeholder="name@domain.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="inbuild-input"
                  />
                </div>

                <div className="inbuild-field">
                  <label htmlFor="inbuild-login-password">Password</label>
                  <input
                    id="inbuild-login-password"
                    type="password"
                    required
                    placeholder="Enter password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="inbuild-input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authSubmitting || status === 'loading'}
                  className="inbuild-submit-btn"
                >
                  {authSubmitting ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
            )}

            <p className="inbuild-disclaimer">
              By continuing you agree that MeetingActionLog is a demonstration system trained on
              synthetic data. Decisions shown are illustrative.
            </p>

            {/* Quick 1-Click Demo Accounts */}
            <div className="inbuild-demo-section">
              <div className="inbuild-demo-label">1-Click Quick Demo Access</div>
              <div className="inbuild-demo-chips">
                {demoList.map((demo) => (
                  <button
                    key={demo.email}
                    type="button"
                    disabled={authSubmitting}
                    className="inbuild-demo-chip"
                    onClick={() => handleDemoSelect(demo)}
                    title={`Sign in as ${demo.name} (${demo.role})`}
                  >
                    <span
                      className="dot"
                      style={{ backgroundColor: `hsl(${demo.avatarHue}, 65%, 45%)` }}
                    />
                    <span>{demo.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="intro-footer">
        <div className="intro-footer-content">
          <span>Backend Development CIA-II</span>
          <span className="sep">&middot;</span>
          <span>Student: Nithin Kumar U</span>
          <span className="sep">&middot;</span>
          <span className="mono">USN 2102508611</span>
        </div>
      </footer>

      {/* Student Details Modal */}
      {studentModalOpen && (
        <div
          className="intro-modal-scrim"
          onClick={() => setStudentModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="student-modal-title"
        >
          <div className="intro-modal-box student-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="intro-modal-header">
              <div>
                <span className="eyebrow">Academic Submission</span>
                <h2 id="student-modal-title">Student &amp; Project Information</h2>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setStudentModalOpen(false)}
                aria-label="Close dialog"
              >
                <AnimatedIcon name="x" />
              </button>
            </div>

            <div className="student-modal-details">
              <div className="detail-row">
                <span className="detail-key">Student Name</span>
                <span className="detail-val">Nithin Kumar U</span>
              </div>
              <div className="detail-row">
                <span className="detail-key">USN</span>
                <span className="detail-val mono">2102508611</span>
              </div>
              <div className="detail-row">
                <span className="detail-key">Course</span>
                <span className="detail-val">Backend Development, CIA-II</span>
              </div>
              <div className="detail-row">
                <span className="detail-key">Topic / System</span>
                <span className="detail-val">Meeting Decisions and Follow-Up Ledger</span>
              </div>
              <div className="detail-row">
                <span className="detail-key">Technology Stack</span>
                <span className="detail-val">
                  Express, MongoDB, TypeScript, React 19, Vite, TanStack Query
                </span>
              </div>
            </div>

            <div className="student-modal-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setStudentModalOpen(false);
                  setView('about');
                }}
              >
                View full project details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
