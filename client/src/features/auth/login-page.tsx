import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useAuthStore, type DemoUserCard } from '../../lib/auth';
import { AnimatedIcon } from '../../components/ui/animated-icon';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/profile';

  const { user, status, error, login, register, fetchDemoUsers, demoUsers, clearError } =
    useAuthStore();

  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState('Customer');
  const [regAvatarHue, setRegAvatarHue] = useState<number>(200);
  const [regPassword, setRegPassword] = useState('');

  useEffect(() => {
    void fetchDemoUsers();
  }, [fetchDemoUsers]);

  useEffect(() => {
    clearError();
    setFormError(null);
  }, [tab, clearError]);

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!loginEmail.trim() || !loginPassword) {
      setFormError('Please enter both email and password.');
      return;
    }
    setSubmitting(true);
    try {
      await login({ email: loginEmail.trim().toLowerCase(), password: loginPassword });
      navigate(redirectPath);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      setFormError('Please fill in all required fields.');
      return;
    }
    if (regPassword.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }
    setSubmitting(true);
    try {
      await register({
        name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        role: regRole.trim() || 'Customer',
        avatarHue: regAvatarHue,
        password: regPassword,
      });
      navigate('/profile');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (demo: DemoUserCard) => {
    setFormError(null);
    setSubmitting(true);
    try {
      await login({ email: demo.email, password: 'Password123!' });
      navigate(redirectPath);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Demo sign in failed';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

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
    <div className="auth-page-container">
      <header className="page-head">
        <div>
          <span className="eyebrow">Customer Portal</span>
          <h1>Access your workspace</h1>
          <p className="lead">
            Sign in to manage decisions, attend meetings, track action items, and personalize your
            customer profile.
          </p>
        </div>
      </header>

      {user && (
        <section className="auth-status-banner" aria-label="Current session">
          <div className="auth-status-info">
            <span
              className="u-av"
              style={{
                backgroundColor: `hsl(${user.avatarHue}, 60%, 45%)`,
                color: '#fff',
                width: 38,
                height: 38,
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              {getInitials(user.name)}
            </span>
            <div>
              <strong>Currently signed in as {user.name}</strong>
              <div className="text-muted">
                {user.email} &middot; {user.role}
              </div>
            </div>
          </div>
          <div className="auth-status-actions">
            <Link to="/profile" className="btn btn-primary btn-sm">
              View Profile
            </Link>
            <Link to="/" className="btn btn-line btn-sm">
              Dashboard
            </Link>
          </div>
        </section>
      )}

      <div className="auth-layout-grid">
        <section className="auth-card" aria-label="Authentication form">
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'login'}
              className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
              onClick={() => setTab('login')}
            >
              <AnimatedIcon name="user" />
              <span>Sign in</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'register'}
              className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
              onClick={() => setTab('register')}
            >
              <AnimatedIcon name="plus" />
              <span>Create profile</span>
            </button>
          </div>

          {(formError || error) && (
            <div className="auth-error-alert" role="alert">
              <AnimatedIcon name="alert" />
              <span>{formError || error}</span>
            </div>
          )}

          {tab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="auth-form" noValidate>
              <div className="field">
                <label htmlFor="login-email">Email address</label>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@domain.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="Enter your account password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </div>

              <div className="auth-submit-row">
                <button
                  type="submit"
                  disabled={submitting || status === 'loading'}
                  className="btn btn-primary auth-submit-btn"
                >
                  {submitting ? 'Signing in...' : 'Sign in to ledger'}
                </button>
              </div>

              <p className="auth-footer-hint">
                Need a new account? Switch to the{' '}
                <button type="button" className="btn-link" onClick={() => setTab('register')}>
                  Create profile
                </button>{' '}
                tab to get started.
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="auth-form" noValidate>
              <div className="field">
                <label htmlFor="reg-name">Full name</label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="e.g. Jordan Blake"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="reg-email">Email address</label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@company.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                />
              </div>

              <div className="field-grid-2">
                <div className="field">
                  <label htmlFor="reg-role">Role / Title</label>
                  <input
                    id="reg-role"
                    type="text"
                    placeholder="e.g. Product Lead, Customer"
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="reg-hue">Avatar color hue ({regAvatarHue}&deg;)</label>
                  <div className="hue-input-row">
                    <input
                      id="reg-hue"
                      type="range"
                      min="0"
                      max="360"
                      step="5"
                      value={regAvatarHue}
                      onChange={(e) => setRegAvatarHue(Number(e.target.value))}
                    />
                    <span
                      className="hue-preview-dot"
                      style={{
                        backgroundColor: `hsl(${regAvatarHue}, 65%, 45%)`,
                      }}
                      title="Color preview"
                    />
                  </div>
                </div>
              </div>

              <div className="field">
                <label htmlFor="reg-password">Password (min 8 chars, 1 digit, 1 special)</label>
                <input
                  id="reg-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                />
              </div>

              <div className="auth-profile-preview">
                <span
                  className="preview-avatar"
                  style={{ backgroundColor: `hsl(${regAvatarHue}, 65%, 45%)` }}
                >
                  {getInitials(regName || 'Customer')}
                </span>
                <div className="preview-meta">
                  <div className="preview-name">{regName || 'Customer Name'}</div>
                  <div className="preview-role">{regRole || 'Customer'} &middot; New profile</div>
                </div>
              </div>

              <div className="auth-submit-row">
                <button
                  type="submit"
                  disabled={submitting || status === 'loading'}
                  className="btn btn-primary auth-submit-btn"
                >
                  {submitting ? 'Creating profile...' : 'Create profile and sign in'}
                </button>
              </div>
            </form>
          )}
        </section>

        <aside className="auth-demo-sidebar" aria-label="Demo customer logins">
          <div className="demo-header">
            <h3>1-Click Quick Demo Logins</h3>
            <p>
              Explore the ledger immediately with any of the pre-configured team accounts. Password
              for all demo users is <code>Password123!</code>.
            </p>
          </div>

          <div className="demo-users-list">
            {(demoUsers.length > 0
              ? demoUsers
              : [
                  {
                    id: '1',
                    name: 'Ananya Rao',
                    email: 'ananya.rao@meetingactionlog.dev',
                    role: 'Product Lead',
                    avatarHue: 200,
                    memberId: 'm1',
                  },
                  {
                    id: '2',
                    name: 'Karthik Shetty',
                    email: 'karthik.shetty@meetingactionlog.dev',
                    role: 'Backend Engineer',
                    avatarHue: 35,
                    memberId: 'm2',
                  },
                  {
                    id: '3',
                    name: 'Meera Iyer',
                    email: 'meera.iyer@meetingactionlog.dev',
                    role: 'Designer',
                    avatarHue: 280,
                    memberId: 'm3',
                  },
                  {
                    id: '4',
                    name: 'Priya Menon',
                    email: 'priya.menon@meetingactionlog.dev',
                    role: 'Marketing',
                    avatarHue: 150,
                    memberId: 'm4',
                  },
                  {
                    id: '5',
                    name: 'Rahul Nair',
                    email: 'rahul.nair@meetingactionlog.dev',
                    role: 'QA Engineer',
                    avatarHue: 10,
                    memberId: 'm5',
                  },
                ]
            ).map((demo) => (
              <button
                key={demo.email}
                type="button"
                className="demo-user-card"
                disabled={submitting}
                onClick={() => handleDemoLogin(demo)}
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

          <div className="demo-note">
            <AnimatedIcon name="info" />
            <span>
              Customer profiles automatically sync with meeting attendees and action item ownership.
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
