import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../lib/auth';
import { IntroPage } from '../features/intro/intro-page';
import type { AuthUser } from '@mal/shared';

const mockUser: AuthUser = {
  id: 'u-1',
  memberId: 'm1',
  name: 'Ananya Rao',
  email: 'ananya.rao@meetingactionlog.dev',
  role: 'Product Lead',
  avatarHue: 176,
  createdAt: '2026-11-01T10:00:00.000Z',
};

describe('IntroPage (100x)', () => {
  beforeEach(() => {
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
          avatarHue: 176,
          memberId: 'm1',
        },
      ],
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders headline, interactive simulator, and student badge', { repeats: 100 }, () => {
    const { unmount } = render(
      <MemoryRouter>
        <IntroPage />
      </MemoryRouter>,
    );

    // Headline
    expect(screen.getByRole('heading', { name: /know who owns what/i })).toBeInTheDocument();
    expect(screen.getByText(/before things slip/i)).toBeInTheDocument();

    // Top Navigation
    expect(screen.getByRole('link', { name: /about the project/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view developer information/i })).toHaveTextContent(
      'unithinkumar',
    );

    // Interactive simulator
    expect(screen.getByText(/change any underlined value/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/meeting type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/number of members/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/number of decisions/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/number of action items/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/deadline days/i)).toBeInTheDocument();

    // Evaluation strip
    expect(screen.getByText(/estimated chance/i)).toBeInTheDocument();
    expect(screen.getByText(/low risk/i)).toBeInTheDocument();

    // Action button
    expect(screen.getByRole('button', { name: /access full application/i })).toBeInTheDocument();

    unmount();
  });

  it('updates risk calculation when values change in the simulator', { repeats: 100 }, () => {
    const { unmount } = render(
      <MemoryRouter>
        <IntroPage />
      </MemoryRouter>,
    );

    const membersSelect = screen.getByLabelText(/number of members/i);
    const actionsSelect = screen.getByLabelText(/number of action items/i);
    const daysSelect = screen.getByLabelText(/deadline days/i);

    // Change to high load scenario: 2 members, 16 actions, 2 days deadline
    fireEvent.change(membersSelect, { target: { value: '2' } });
    fireEvent.change(actionsSelect, { target: { value: '16' } });
    fireEvent.change(daysSelect, { target: { value: '2' } });

    // Risk tier should escalate to elevated risk
    expect(screen.getByText(/elevated risk/i)).toBeInTheDocument();
    expect(screen.getByText(/action required/i)).toBeInTheDocument();

    unmount();
  });

  it(
    'opens Auth Modal when unauthenticated user clicks Access full application',
    { repeats: 100 },
    () => {
      const { unmount } = render(
        <MemoryRouter>
          <IntroPage />
        </MemoryRouter>,
      );

      const accessBtn = screen.getByRole('button', { name: /access full application/i });
      fireEvent.click(accessBtn);

      // Modal opens
      expect(
        screen.getByRole('heading', { name: /sign in to access the full application/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /1-click demo/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /create profile/i })).toBeInTheDocument();

      // Demo account card is visible
      expect(screen.getByText('Ananya Rao')).toBeInTheDocument();

      // Close button
      const closeBtn = screen.getByRole('button', { name: /close dialog/i });
      fireEvent.click(closeBtn);
      expect(
        screen.queryByRole('heading', { name: /sign in to access the full application/i }),
      ).not.toBeInTheDocument();

      unmount();
    },
  );

  it('opens Student Details modal when clicking unithinkumar badge', { repeats: 100 }, () => {
    const { unmount } = render(
      <MemoryRouter>
        <IntroPage />
      </MemoryRouter>,
    );

    const studentBadge = screen.getByRole('button', { name: /view developer information/i });
    fireEvent.click(studentBadge);

    expect(
      screen.getByRole('heading', { name: /student & project information/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Nithin Kumar U')).toBeInTheDocument();
    expect(screen.getByText('2102508611')).toBeInTheDocument();
    expect(screen.getByText('Backend Development, CIA-II')).toBeInTheDocument();

    unmount();
  });

  it('renders user pill when already authenticated', { repeats: 100 }, () => {
    useAuthStore.setState({
      user: mockUser,
      token: 'jwt-mock-token',
      status: 'authenticated',
    });

    const { unmount } = render(
      <MemoryRouter>
        <IntroPage />
      </MemoryRouter>,
    );

    expect(screen.getByTitle(/signed in as ananya rao/i)).toBeInTheDocument();

    unmount();
  });
});
