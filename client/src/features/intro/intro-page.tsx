import { useState, type FormEvent } from 'react';
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

export function IntroPage() {
  const navigate = useNavigate();
  const { user, status, login, register, demoUsers, fetchDemoUsers } = useAuthStore();
  const { theme, toggleTheme } = useShellStore();

  // Interactive sentence simulator state
  const [sim, setSim] = useState<SimState>({
    meetingType: 'sprint sync',
    members: 5,
    decisions: 4,
    actions: 3,
    days: 5,
  });

  // Auth Modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'demo' | 'login' | 'register'>('demo');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Student info modal state
  const [studentModalOpen, setStudentModalOpen] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState('Customer');
  const [regAvatarHue, setRegAvatarHue] = useState<number>(200);
  const [regPassword, setRegPassword] = useState('');

  // Calculate dynamic slip risk
  // Baseline load ratio: actions / (members * sqrt(days))
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
      setAuthModalOpen(true);
    }
  };

  const handleDemoSelect = async (demo: DemoUserCard) => {
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      await login({ email: demo.email, password: 'Password123!' });
      setAuthModalOpen(false);
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
      setAuthModalOpen(false);
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
        role: regRole.trim() || 'Customer',
        avatarHue: regAvatarHue,
        password: regPassword,
      });
      setAuthModalOpen(false);
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
          <Link to="/about" className="intro-nav-link">
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

      {/* Main Hero Section */}
      <main className="intro-main">
        <div className="intro-hero-container">
          <h1 className="intro-headline">
            Know who owns what
            <br />
            <em>before things slip.</em>
          </h1>

          <p className="intro-subhead">
            MeetingActionLog reads meeting decisions, estimates execution risk, assigns accountable
            owners with strict due dates, and shows exactly which commitments moved forward.
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

            <Link to="/tutorials" className="btn-intro-secondary">
              <AnimatedIcon name="play" />
              <span>Watch tutorials</span>
            </Link>

            <Link to="/about" className="btn-intro-secondary">
              <AnimatedIcon name="help" />
              <span>System specs</span>
            </Link>
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

      {/* Authentication Prompt Modal */}
      {authModalOpen && (
        <div
          className="intro-modal-scrim"
          onClick={() => setAuthModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
        >
          <div className="intro-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="intro-modal-header">
              <div>
                <span className="eyebrow">Customer Access</span>
                <h2 id="auth-modal-title">Sign in to access the full application</h2>
                <p className="modal-subhead">
                  Select a 1-click team account or sign in with your customer credentials to unlock
                  the complete ledger.
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setAuthModalOpen(false)}
                aria-label="Close dialog"
              >
                <AnimatedIcon name="x" />
              </button>
            </div>

            <div className="auth-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={authTab === 'demo'}
                className={`auth-tab ${authTab === 'demo' ? 'active' : ''}`}
                onClick={() => {
                  setAuthTab('demo');
                  setAuthError(null);
                }}
              >
                <AnimatedIcon name="users" />
                <span>1-Click Demo</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={authTab === 'login'}
                className={`auth-tab ${authTab === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setAuthTab('login');
                  setAuthError(null);
                }}
              >
                <AnimatedIcon name="user" />
                <span>Sign in</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={authTab === 'register'}
                className={`auth-tab ${authTab === 'register' ? 'active' : ''}`}
                onClick={() => {
                  setAuthTab('register');
                  setAuthError(null);
                }}
              >
                <AnimatedIcon name="plus" />
                <span>Create profile</span>
              </button>
            </div>

            {authError && (
              <div className="auth-error-alert" role="alert">
                <AnimatedIcon name="alert" />
                <span>{authError}</span>
              </div>
            )}

            {/* Tab 1: 1-Click Demo Logins */}
            {authTab === 'demo' && (
              <div className="modal-demo-grid">
                <p className="demo-hint-text">
                  Click any team account to log in instantly with full permissions (password is
                  pre-filled):
                </p>
                <div className="demo-users-list">
                  {demoList.map((demo) => (
                    <button
                      key={demo.email}
                      type="button"
                      disabled={authSubmitting}
                      className="demo-user-card"
                      onClick={() => handleDemoSelect(demo)}
                    >
                      <span
                        className="demo-avatar"
                        style={{ backgroundColor: `hsl(${demo.avatarHue}, 65%, 45%)` }}
                      >
                        {getInitials(demo.name)}
                      </span>
                      <div className="demo-info">
                        <div className="demo-name">{demo.name}</div>
                        <div className="demo-role">{demo.role}</div>
                        <div className="demo-email">{demo.email}</div>
                      </div>
                      <span className="demo-arrow">&rarr;</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 2: Regular Email/Password Login */}
            {authTab === 'login' && (
              <form onSubmit={handleLoginSubmit} className="auth-form" noValidate>
                <div className="field">
                  <label htmlFor="modal-login-email">Email address</label>
                  <input
                    id="modal-login-email"
                    type="email"
                    required
                    placeholder="name@domain.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="modal-login-password">Password</label>
                  <input
                    id="modal-login-password"
                    type="password"
                    required
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>

                <div className="auth-submit-row">
                  <button
                    type="submit"
                    disabled={authSubmitting || status === 'loading'}
                    className="btn btn-primary auth-submit-btn"
                  >
                    {authSubmitting ? 'Signing in...' : 'Sign in & access full application'}
                  </button>
                </div>
              </form>
            )}

            {/* Tab 3: Create Customer Profile */}
            {authTab === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="auth-form" noValidate>
                <div className="field">
                  <label htmlFor="modal-reg-name">Full name</label>
                  <input
                    id="modal-reg-name"
                    type="text"
                    required
                    placeholder="e.g. Jordan Blake"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="modal-reg-email">Email address</label>
                  <input
                    id="modal-reg-email"
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                  />
                </div>

                <div className="field-grid-2">
                  <div className="field">
                    <label htmlFor="modal-reg-role">Role / Title</label>
                    <input
                      id="modal-reg-role"
                      type="text"
                      placeholder="e.g. Customer, Lead"
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="modal-reg-hue">Avatar color hue ({regAvatarHue}&deg;)</label>
                    <div className="hue-input-row">
                      <input
                        id="modal-reg-hue"
                        type="range"
                        min="0"
                        max="360"
                        step="5"
                        value={regAvatarHue}
                        onChange={(e) => setRegAvatarHue(Number(e.target.value))}
                      />
                      <span
                        className="hue-preview-dot"
                        style={{ backgroundColor: `hsl(${regAvatarHue}, 65%, 45%)` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="modal-reg-pwd">Password (min 8 chars)</label>
                  <input
                    id="modal-reg-pwd"
                    type="password"
                    required
                    placeholder="Create a strong password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                  />
                </div>

                <div className="auth-submit-row">
                  <button
                    type="submit"
                    disabled={authSubmitting || status === 'loading'}
                    className="btn btn-primary auth-submit-btn"
                  >
                    {authSubmitting ? 'Creating profile...' : 'Create profile & access application'}
                  </button>
                </div>
              </form>
            )}

            <div className="modal-footer-nav">
              <Link to="/login" className="btn-link" onClick={() => setAuthModalOpen(false)}>
                Go to dedicated sign-in page &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

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
              <Link
                to="/about"
                className="btn btn-primary"
                onClick={() => setStudentModalOpen(false)}
              >
                View full project details
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
