import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuthStore } from '../../lib/auth';
import { AnimatedIcon } from '../../components/ui/animated-icon';
import { apiFetch } from '../../lib/api';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, stats, status, fetchProfile, updateProfile, logout } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Edit fields
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [avatarHue, setAvatarHue] = useState<number>(200);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setRole(user.role);
      setAvatarHue(user.avatarHue);
    }
  }, [user]);

  const getInitials = (n: string): string => {
    const parts = n.trim().split(/\s+/).filter(Boolean);
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

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    if (!name.trim()) {
      setProfileMessage({ type: 'error', text: 'Name cannot be empty.' });
      return;
    }
    setLoading(true);
    try {
      await updateProfile({
        name: name.trim(),
        role: role.trim() || 'Customer',
        avatarHue,
      });
      setProfileMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      setProfileMessage({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);
    if (!currentPassword) {
      setPasswordMessage({ type: 'error', text: 'Please enter your current password.' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage({
        type: 'error',
        text: 'New password must be at least 8 characters long.',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setChangingPassword(true);
    try {
      await apiFetch('/auth/profile', {
        method: 'PATCH',
        body: {
          currentPassword,
          newPassword,
        },
      });
      setPasswordMessage({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Password update failed';
      setPasswordMessage({ type: 'error', text: msg });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user && status !== 'loading') {
    return (
      <div className="auth-unauth-container">
        <header className="page-head">
          <div>
            <span className="eyebrow">Customer Account</span>
            <h1>Profile and activity</h1>
          </div>
        </header>
        <div className="empty-card">
          <AnimatedIcon name="user" />
          <h3>Sign in to view your profile</h3>
          <p>
            You must be signed in to see your assigned actions, attended meetings, decisions, and
            account settings.
          </p>
          <div className="empty-actions">
            <Link to="/login" className="btn btn-primary">
              Sign in or create profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const registeredDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Active';

  return (
    <div className="profile-page-container">
      <header className="profile-masthead">
        <div className="profile-user-summary">
          <span
            className="profile-large-avatar"
            style={{ backgroundColor: `hsl(${avatarHue}, 65%, 45%)` }}
          >
            {getInitials(name || user?.name || 'Customer')}
          </span>
          <div className="profile-identity">
            <span className="eyebrow">Customer Profile &middot; Member #{user?.memberId}</span>
            <h1 className="profile-name">{user?.name}</h1>
            <div className="profile-tags">
              <span className="profile-tag role-tag">{user?.role}</span>
              <span className="profile-tag email-tag">{user?.email}</span>
              <span className="profile-tag date-tag">Joined {registeredDate}</span>
            </div>
          </div>
        </div>

        <div className="profile-header-actions">
          <button
            type="button"
            onClick={handleLogout}
            className="btn btn-line btn-danger-line"
            aria-label="Sign out"
          >
            <AnimatedIcon name="logout" />
            <span>Sign out</span>
          </button>
        </div>
      </header>

      {/* Customer activity statistics */}
      <section className="profile-stats-section" aria-label="Personal activity summary">
        <h2 className="section-title">Personal Ledger Activity</h2>
        <div className="profile-stats-grid">
          <div className="profile-stat-card">
            <div className="stat-label">
              <AnimatedIcon name="listcheck" />
              <span>Assigned actions</span>
            </div>
            <div className="stat-value">{stats?.actionsCount ?? 0}</div>
            <div className="stat-sub">Across all logged meetings</div>
          </div>

          <div className="profile-stat-card">
            <div className="stat-label">
              <AnimatedIcon name="check" />
              <span>Actions completed</span>
            </div>
            <div className="stat-value success">{stats?.completedActionsCount ?? 0}</div>
            <div className="stat-sub">Marked done in ledger</div>
          </div>

          <div className="profile-stat-card">
            <div className="stat-label">
              <AnimatedIcon name="flame" />
              <span>Overdue items</span>
            </div>
            <div
              className={`stat-value ${
                (stats?.overdueActionsCount ?? 0) > 0 ? 'stat-overdue' : ''
              }`}
            >
              {stats?.overdueActionsCount ?? 0}
            </div>
            <div className="stat-sub">Past assigned deadline</div>
          </div>

          <div className="profile-stat-card">
            <div className="stat-label">
              <AnimatedIcon name="calendar" />
              <span>Meetings attended</span>
            </div>
            <div className="stat-value">{stats?.meetingsCount ?? 0}</div>
            <div className="stat-sub">Participated discussions</div>
          </div>

          <div className="profile-stat-card">
            <div className="stat-label">
              <AnimatedIcon name="bulb" />
              <span>Decisions owned</span>
            </div>
            <div className="stat-value">{stats?.decisionsCount ?? 0}</div>
            <div className="stat-sub">Logged under your name</div>
          </div>
        </div>
      </section>

      {/* Settings layout */}
      <div className="profile-forms-grid">
        {/* Personal Details */}
        <section className="profile-panel" aria-label="Edit personal details">
          <h3>Profile details</h3>
          <p className="panel-desc">
            Your name, role, and avatar color automatically sync with meeting attendees and action
            owners across the application.
          </p>

          {profileMessage && (
            <div
              className={`auth-alert ${
                profileMessage.type === 'success' ? 'auth-alert-success' : 'auth-alert-error'
              }`}
            >
              <AnimatedIcon name={profileMessage.type === 'success' ? 'check' : 'alert'} />
              <span>{profileMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="profile-form">
            <div className="field">
              <label htmlFor="prof-name">Display name</label>
              <input
                id="prof-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="prof-email">Email address</label>
              <input
                id="prof-email"
                type="email"
                disabled
                value={user?.email || ''}
                title="Email cannot be changed directly"
              />
              <span className="field-hint">Primary account identifier</span>
            </div>

            <div className="field">
              <label htmlFor="prof-role">Role / Title</label>
              <input
                id="prof-role"
                type="text"
                value={role}
                placeholder="e.g. Product Lead, Customer"
                onChange={(e) => setRole(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="prof-hue">Avatar color hue ({avatarHue}&deg;)</label>
              <div className="hue-input-row">
                <input
                  id="prof-hue"
                  type="range"
                  min="0"
                  max="360"
                  step="5"
                  value={avatarHue}
                  onChange={(e) => setAvatarHue(Number(e.target.value))}
                />
                <span
                  className="hue-preview-dot"
                  style={{ backgroundColor: `hsl(${avatarHue}, 65%, 45%)` }}
                  title="Color swatch"
                />
              </div>
            </div>

            <div className="panel-footer">
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? 'Saving changes...' : 'Save profile changes'}
              </button>
            </div>
          </form>
        </section>

        {/* Change Password */}
        <section className="profile-panel" aria-label="Security and credentials">
          <h3>Change password</h3>
          <p className="panel-desc">
            Update your account password with a strong combination of letters, numbers, and symbols.
          </p>

          {passwordMessage && (
            <div
              className={`auth-alert ${
                passwordMessage.type === 'success' ? 'auth-alert-success' : 'auth-alert-error'
              }`}
            >
              <AnimatedIcon name={passwordMessage.type === 'success' ? 'check' : 'alert'} />
              <span>{passwordMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="profile-form">
            <div className="field">
              <label htmlFor="pwd-current">Current password</label>
              <input
                id="pwd-current"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="pwd-new">New password (min 8 chars)</label>
              <input
                id="pwd-new"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Enter new strong password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="pwd-confirm">Confirm new password</label>
              <input
                id="pwd-confirm"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="panel-footer">
              <button type="submit" disabled={changingPassword} className="btn btn-line">
                <AnimatedIcon name="lock" />
                <span>{changingPassword ? 'Updating...' : 'Update password'}</span>
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
