import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../lib/auth';
import { getAuthToken, setAuthToken } from '../lib/auth-token';
import { LoginPage } from '../features/auth/login-page';
import { ProfilePage } from '../features/auth/profile-page';
import { AppShell } from '../components/layout/app-shell';
import type { AuthUser, UserProfileResponse } from '@mal/shared';

const mockUser: AuthUser = {
  id: 'u-123',
  memberId: 'm1',
  name: 'Ananya Rao',
  email: 'ananya.rao@meetingactionlog.dev',
  role: 'Product Lead',
  avatarHue: 200,
  createdAt: '2026-11-01T10:00:00.000Z',
};

const mockProfile: UserProfileResponse = {
  user: mockUser,
  stats: {
    actionsCount: 5,
    openActionsCount: 3,
    overdueActionsCount: 1,
    completedActionsCount: 2,
    meetingsCount: 4,
    decisionsCount: 6,
  },
};

describe('Client Authentication & Customer Profile (100x)', () => {
  beforeEach(() => {
    setAuthToken(null);
    useAuthStore.setState({
      user: null,
      stats: null,
      token: null,
      status: 'unauthenticated',
      error: null,
      demoUsers: [
        {
          id: '1',
          name: 'Ananya Rao',
          email: 'ananya.rao@meetingactionlog.dev',
          role: 'Product Lead',
          avatarHue: 200,
          memberId: 'm1',
        },
      ],
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('manages auth token storage and headers', { repeats: 100 }, () => {
    expect(getAuthToken()).toBeNull();
    setAuthToken('test-token-jwt');
    expect(getAuthToken()).toBe('test-token-jwt');
    setAuthToken(null);
    expect(getAuthToken()).toBeNull();
  });

  it(
    'renders LoginPage with sign-in and create-profile tabs and demo accounts',
    { repeats: 100 },
    () => {
      const { unmount } = render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>,
      );

      expect(screen.getByRole('heading', { name: /access your workspace/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /create profile/i })).toBeInTheDocument();

      // Sign in form fields
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in to ledger/i })).toBeInTheDocument();

      // Demo section
      expect(screen.getByText(/1-click quick demo logins/i)).toBeInTheDocument();
      expect(screen.getByText('Ananya Rao')).toBeInTheDocument();

      // Switch to create profile tab
      fireEvent.click(screen.getByRole('tab', { name: /create profile/i }));
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/role \/ title/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /create profile and sign in/i }),
      ).toBeInTheDocument();

      unmount();
    },
  );

  it('renders ProfilePage unauthenticated state when logged out', { repeats: 100 }, () => {
    const { unmount } = render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/sign in to view your profile/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in or create profile/i })).toHaveAttribute(
      'href',
      '/login',
    );

    unmount();
  });

  it(
    'renders ProfilePage authenticated state with personal activity stats and edit form',
    { repeats: 100 },
    () => {
      useAuthStore.setState({
        user: mockProfile.user,
        stats: mockProfile.stats,
        token: 'jwt-mock-token',
        status: 'authenticated',
      });

      const { unmount } = render(
        <MemoryRouter>
          <ProfilePage />
        </MemoryRouter>,
      );

      // Masthead
      expect(screen.getByText('Ananya Rao')).toBeInTheDocument();
      expect(screen.getByText('Product Lead')).toBeInTheDocument();
      expect(screen.getByText('ananya.rao@meetingactionlog.dev')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();

      // Personal Ledger Activity Stats
      expect(screen.getByText(/personal ledger activity/i)).toBeInTheDocument();
      expect(screen.getByText('Assigned actions')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Actions completed')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Overdue items')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('Meetings attended')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('Decisions owned')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();

      // Settings forms
      expect(screen.getByRole('heading', { name: /profile details/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /change password/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save profile changes/i })).toBeInTheDocument();

      unmount();
    },
  );

  it(
    'renders AppShell with Sign in button when logged out and User Pill when logged in',
    { repeats: 100 },
    () => {
      // When logged out
      const { unmount } = render(
        <MemoryRouter>
          <AppShell>
            <div>Page content</div>
          </AppShell>
        </MemoryRouter>,
      );

      expect(screen.getByRole('link', { name: /sign in or create profile/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /view user profile/i })).not.toBeInTheDocument();

      unmount();

      // When logged in
      useAuthStore.setState({
        user: mockUser,
        token: 'jwt-mock-token',
        status: 'authenticated',
      });

      const { unmount: unmount2 } = render(
        <MemoryRouter>
          <AppShell>
            <div>Page content</div>
          </AppShell>
        </MemoryRouter>,
      );

      const userPill = screen.getByRole('link', { name: /view user profile/i });
      expect(userPill).toBeInTheDocument();
      expect(userPill).toHaveAttribute('href', '/profile');
      expect(screen.getByText('Ananya Rao')).toBeInTheDocument();

      unmount2();
    },
  );
});
