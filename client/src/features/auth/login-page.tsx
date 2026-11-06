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

  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
    void fetchDemoUsers();
  }, [fetchDemoUsers]);

  useEffect(() => {
    clearError();
    setFormError(null);
  }, [authMode, clearError]);

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
        role: 'Customer',
        avatarHue: 200,
        password: regPassword,
      });
      navigate(redirectPath);
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
    <div className="inbuild-auth-container">
      {user && (
        <section className="auth-status-banner" aria-label="Current session">
          <div className="auth-status-info">
            <span
              className="u-av"
              style={{
                backgroundColor: `hsl(${user.avatarHue}, 60%, 45%)`,
                color: '#fff',
                width: 36,
                height: 36,
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
              <strong>Signed in as {user.name}</strong>
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

      <div className="inbuild-auth-card">
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
            onClick={() => setAuthMode('login')}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={authMode === 'register'}
            className={`inbuild-tab ${authMode === 'register' ? 'active' : ''}`}
            onClick={() => setAuthMode('register')}
          >
            Create account
          </button>
        </div>

        {(formError || error) && (
          <div className="auth-error-alert" role="alert">
            <AnimatedIcon name="alert" />
            <span>{formError || error}</span>
          </div>
        )}

        {authMode === 'register' ? (
          <form onSubmit={handleRegisterSubmit} className="inbuild-form" noValidate>
            <div className="inbuild-field">
              <label htmlFor="login-page-reg-name">Full name</label>
              <input
                id="login-page-reg-name"
                type="text"
                required
                placeholder="e.g. Alex Morgan"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="inbuild-input"
              />
            </div>

            <div className="inbuild-field">
              <label htmlFor="login-page-reg-email">Email</label>
              <input
                id="login-page-reg-email"
                type="email"
                required
                placeholder="name@example.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="inbuild-input"
              />
            </div>

            <div className="inbuild-field">
              <label htmlFor="login-page-reg-pwd">Password</label>
              <input
                id="login-page-reg-pwd"
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
              disabled={submitting || status === 'loading'}
              className="inbuild-submit-btn"
            >
              {submitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLoginSubmit} className="inbuild-form" noValidate>
            <div className="inbuild-field">
              <label htmlFor="login-page-email">Email</label>
              <input
                id="login-page-email"
                type="email"
                required
                placeholder="name@domain.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="inbuild-input"
              />
            </div>

            <div className="inbuild-field">
              <label htmlFor="login-page-pwd">Password</label>
              <input
                id="login-page-pwd"
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
              disabled={submitting || status === 'loading'}
              className="inbuild-submit-btn"
            >
              {submitting ? 'Signing in...' : 'Sign in'}
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
                disabled={submitting}
                className="inbuild-demo-chip"
                onClick={() => handleDemoLogin(demo)}
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
    </div>
  );
}
