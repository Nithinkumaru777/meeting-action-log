import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AboutPage } from '../features/about/about-page';
import { useShellStore } from '../components/layout/app-shell';

describe('AboutPage (100x)', () => {
  it('renders student details, course, USN, and triggers tour', { repeats: 100 }, () => {
    useShellStore.setState({ tourStep: -1 });

    const { unmount } = render(
      <MemoryRouter>
        <AboutPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/About this/i)).toBeInTheDocument();
    expect(screen.getByText('Nithin Kumar U')).toBeInTheDocument();
    expect(screen.getByText('2102508611')).toBeInTheDocument();
    expect(screen.getByText('Backend Development, CIA-II')).toBeInTheDocument();
    expect(screen.getByText('Practical uses')).toBeInTheDocument();
    expect(screen.getByText('System guarantees')).toBeInTheDocument();

    const tourBtn = screen.getByRole('button', { name: /start guided demo/i });
    fireEvent.click(tourBtn);
    expect(useShellStore.getState().tourStep).toBe(0);

    const healthLink = screen.getByRole('link', { name: /api health check/i });
    expect(healthLink).toHaveAttribute('href', '/api/health');

    unmount();
  });
});
