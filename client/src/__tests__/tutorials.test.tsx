import { describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import { fireEvent, render, screen, within } from '@testing-library/react';
import {
  TUTORIALS,
  TutorialsPage,
  filterChapters,
  type TutorialData,
} from '../features/tutorials/tutorials-page';

const SAMPLE: TutorialData = {
  full: { src: '/tutorial/full.mp4', poster: '/tutorial/poster.jpg', duration: '20:31' },
  chapters: [
    {
      num: 7,
      title: 'Inside a meeting',
      topics: [
        {
          id: 'a',
          title: 'Log a decision',
          description: 'Type what was decided and press Log.',
          duration: '0:27',
          src: '/tutorial/clips/a.mp4',
        },
        {
          id: 'b',
          title: 'Convert a decision',
          description: 'Choose an owner and press Create task.',
          duration: '0:36',
          src: '/tutorial/clips/b.mp4',
        },
      ],
    },
    {
      num: 9,
      title: 'Overdue',
      topics: [
        {
          id: 'c',
          title: 'Chase late work',
          description: 'Press plus three days to move the date.',
          duration: '0:44',
          src: '/tutorial/clips/c.mp4',
        },
      ],
    },
  ],
};

const row = (c: HTMLElement, id: string) =>
  c.querySelector<HTMLElement>(`[data-topic="${id}"]`) as HTMLElement;
const arrow = (c: HTMLElement, id: string) => within(row(c, id)).getByRole('button');

describe('filterChapters', () => {
  it('every word must match; results are a subset and no chapter is empty (100 runs)', () => {
    const pool = TUTORIALS.chapters.flatMap((c) => c.topics).flatMap((t) => t.title.split(/\s+/));
    const ids = new Set(TUTORIALS.chapters.flatMap((c) => c.topics).map((t) => t.id));
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.constantFrom(...pool), fc.string({ maxLength: 8 })), { maxLength: 4 }),
        (ws) => {
          const query = ws.join(' ');
          const out = filterChapters(TUTORIALS.chapters, query);
          const words = query.toLowerCase().split(/\s+/).filter(Boolean);
          for (const c of out) {
            expect(c.topics.length).toBeGreaterThan(0);
            for (const t of c.topics) {
              expect(ids.has(t.id)).toBe(true);
              const text = `${c.title} ${t.title} ${t.description}`.toLowerCase();
              for (const w of words) expect(text).toContain(w);
            }
          }
          if (words.length === 0) expect(out).toEqual(TUTORIALS.chapters);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('topic data', () => {
  it('every topic has a title, a written description, a duration and its own clip', () => {
    const list = TUTORIALS.chapters.flatMap((c) => c.topics);
    expect(list.length).toBeGreaterThan(25);
    expect(new Set(list.map((t) => t.id)).size).toBe(list.length);
    for (const t of list) {
      expect(t.title.length).toBeGreaterThan(3);
      expect(t.description.length).toBeGreaterThan(40);
      expect(t.duration).toMatch(/^\d+:\d\d$/);
      expect(t.src).toBe(`/tutorial/clips/${t.id}.mp4`);
    }
  });
});

describe('TutorialsPage', () => {
  it(
    'the arrow reveals the video and description, then hides them (100 runs)',
    { repeats: 99 },
    () => {
      const { container, unmount } = render(<TutorialsPage tutorial={SAMPLE} />);
      expect(row(container, 'a').querySelector('video')).toBeNull();
      fireEvent.click(arrow(container, 'a'));
      expect(arrow(container, 'a').getAttribute('aria-expanded')).toBe('true');
      expect(row(container, 'a').querySelector('video')?.getAttribute('src')).toBe(
        '/tutorial/clips/a.mp4',
      );
      expect(within(row(container, 'a')).getByText(/Type what was decided/)).toBeTruthy();
      fireEvent.click(arrow(container, 'a'));
      expect(arrow(container, 'a').getAttribute('aria-expanded')).toBe('false');
      expect(row(container, 'a').querySelector('video')).toBeNull();
      unmount();
    },
  );

  it('opening a topic closes the previous one and pauses the full guide', () => {
    const { container } = render(<TutorialsPage tutorial={SAMPLE} />);
    const full = container.querySelector('.tut-full video') as HTMLVideoElement;
    full.pause = vi.fn();
    fireEvent.click(arrow(container, 'a'));
    expect(full.pause).toHaveBeenCalled();
    fireEvent.click(arrow(container, 'b'));
    expect(row(container, 'a').querySelector('video')).toBeNull();
    expect(row(container, 'b').querySelector('video')).not.toBeNull();
  });

  it('the full guide does not download until played, and a missing file shows a message', () => {
    const { container } = render(<TutorialsPage tutorial={SAMPLE} />);
    const full = container.querySelector('.tut-full video') as HTMLVideoElement;
    expect(full.getAttribute('preload')).toBe('none');
    fireEvent.error(full);
    expect(
      within(container.querySelector('.tut-full') as HTMLElement).getByText(/could not be loaded/),
    ).toBeTruthy();
  });

  it('search narrows the list, and no match says so', () => {
    const { container } = render(<TutorialsPage tutorial={SAMPLE} />);
    const search = screen.getByLabelText('Learn one feature');
    fireEvent.change(search, { target: { value: 'three days' } });
    expect(container.querySelectorAll('.tut-topic').length).toBe(1);
    fireEvent.change(search, { target: { value: 'zzz' } });
    expect(screen.getByText('No topics match')).toBeTruthy();
  });
});
