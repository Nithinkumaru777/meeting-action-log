import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { AnimatedIcon } from '../../components/ui/animated-icon';
import { useShellStore } from '../../components/layout/app-shell';
import { toast } from '../../components/feedback/toast-store';

export interface TourStep {
  path: string;
  sel: string;
  alt?: string;
  pad?: number;
  title: ReactNode;
  body: string;
  tryit: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    path: '/',
    sel: '.figs',
    title: (
      <>
        The day at a <em>glance</em>
      </>
    ),
    body: 'Open actions, overdue, completion and decisions without tasks. Every number rolls like a meter when something changes.',
    tryit: 'Watch these numbers as you go',
  },
  {
    path: '/',
    sel: '.sec.late',
    title: (
      <>
        What is <em>slipping</em>
      </>
    ),
    body: 'Open actions past their due date, oldest first. The left column shows how many days late each one is.',
    tryit: 'Tick a box: the check draws, then a line strikes through',
  },
  {
    path: '/',
    sel: '.sec.dec',
    title: (
      <>
        Decisions with <em>no owner</em>
      </>
    ),
    body: 'The differentiating feature: decisions logged in a meeting that never became a task. Nothing gets lost after the meeting ends.',
    tryit: 'Next, we turn one into a task',
  },
  {
    path: '/decisions',
    sel: '.drow.pending .btn-dec, .drow',
    pad: 6,
    title: (
      <>
        Convert to <em>task</em>
      </>
    ),
    body: 'Pick an owner and a due date. The new task flies into the Open actions counter and the decision folds out of the inbox.',
    tryit: 'Press Convert to task, choose an owner, press Create task',
  },
  {
    path: '/decisions',
    sel: '#sideOpen',
    alt: '.tabbar [data-nav="meetings"]',
    pad: 10,
    title: (
      <>
        It <em>landed</em>
      </>
    ),
    body: 'The counter rolled up by one. Every change shows a toast with Undo, so nothing is final until you want it to be.',
    tryit: 'Try Undo in the toast',
  },
  {
    path: '/overdue',
    sel: '.sec.late, .figs',
    title: (
      <>
        Overdue, by <em>owner</em>
      </>
    ),
    body: 'Each person sees their own late work. +3 days moves the due date and the row leaves the list.',
    tryit: 'Press +3 days on any row',
  },
  {
    path: '/meetings',
    sel: '.tabs',
    pad: 8,
    title: (
      <>
        Every meeting, one <em>log</em>
      </>
    ),
    body: 'Filter by All, Upcoming or Held. Open a meeting to log decisions and add action items with an owner, date and priority.',
    tryit: 'Switch tabs, then open a meeting',
  },
  {
    path: '/meetings',
    sel: '#themeBtn',
    pad: 6,
    title: (
      <>
        Light or <em>dark</em>
      </>
    ),
    body: 'Both themes are designed, not inverted. Cloud Dancer paper by day, teal-black by night.',
    tryit: 'Toggle the theme',
  },
];

export function GuidedTourOverlay() {
  const { tourStep, setTourStep, endTour } = useShellStore();
  const location = useLocation();
  const navigate = useNavigate();
  const popRef = useRef<HTMLDivElement>(null);

  const [ringStyle, setRingStyle] = useState<CSSProperties>({});
  const [popStyle, setPopStyle] = useState<CSSProperties>({});
  const [placement, setPlacement] = useState<'below' | 'above'>('below');

  const active = tourStep >= 0 && tourStep < TOUR_STEPS.length;
  const current = active ? TOUR_STEPS[tourStep]! : null;

  const findTarget = useCallback((st: TourStep): HTMLElement | null => {
    if (typeof document === 'undefined') return null;
    const isVis = (el: HTMLElement | null) =>
      Boolean(el && (el.offsetParent !== null || el.getBoundingClientRect().width > 0));
    let el = document.querySelector<HTMLElement>(st.sel);
    if (!isVis(el) && st.alt) {
      el = document.querySelector<HTMLElement>(st.alt);
    }
    if (!el) {
      el = document.querySelector<HTMLElement>('.mast') ?? document.body;
    }
    return el;
  }, []);

  const place = useCallback(() => {
    if (!current || typeof window === 'undefined') return;
    const el = findTarget(current);
    if (!el) return;
    const pad = current.pad ?? 10;
    const r = el.getBoundingClientRect();
    setRingStyle({
      left: `${r.left - pad}px`,
      top: `${r.top - pad}px`,
      width: `${r.width + pad * 2}px`,
      height: `${r.height + pad * 2}px`,
    });

    const pw = popRef.current?.offsetWidth || 340;
    const ph = popRef.current?.offsetHeight || 200;
    const gap = 16;
    const winW = window.innerWidth || 1280;
    const winH = window.innerHeight || 800;

    let left = Math.min(Math.max(16, r.left + r.width / 2 - pw / 2), winW - pw - 16);
    if (r.width > pw * 1.4) {
      left = Math.min(Math.max(16, r.left), winW - pw - 16);
    }
    const below = r.bottom + pad + gap + ph < winH - 8 || r.top - pad - gap - ph < 8;
    let top = below ? r.bottom + pad + gap : r.top - pad - gap - ph;
    top = Math.min(Math.max(8, top), Math.max(8, winH - ph - 8));
    const cx = Math.min(Math.max(14, r.left + Math.min(r.width, pw) / 2 - left), pw - 26);

    setPlacement(below ? 'below' : 'above');
    setPopStyle({
      left: `${left}px`,
      top: `${top}px`,
      '--cx': `${cx}px`,
    } as CSSProperties);
  }, [current, findTarget]);

  useEffect(() => {
    if (!active || !current) return;
    if (location.pathname !== current.path) {
      navigate(current.path);
    }
    const timer = setTimeout(() => {
      place();
    }, 60);
    return () => clearTimeout(timer);
  }, [active, current, location.pathname, navigate, place]);

  useEffect(() => {
    if (!active) return;
    const onResizeScroll = () => place();
    window.addEventListener('scroll', onResizeScroll, { passive: true });
    window.addEventListener('resize', onResizeScroll);
    return () => {
      window.removeEventListener('scroll', onResizeScroll);
      window.removeEventListener('resize', onResizeScroll);
    };
  }, [active, place]);

  const handleFinish = useCallback(
    (completed: boolean) => {
      endTour();
      if (completed) {
        toast({
          title: 'Demo finished',
          body: 'You have toured the complete Signal Ledger workflow.',
          tone: 'ok',
        });
      }
    },
    [endTour]
  );

  const handleNext = useCallback(() => {
    if (tourStep + 1 >= TOUR_STEPS.length) {
      handleFinish(true);
    } else {
      setTourStep(tourStep + 1);
    }
  }, [handleFinish, setTourStep, tourStep]);

  const handleBack = useCallback(() => {
    if (tourStep > 0) {
      setTourStep(tourStep - 1);
    }
  }, [setTourStep, tourStep]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (document.body.classList.contains('dw-open')) return;
      const target = e.target as HTMLElement | null;
      if (target && /input|textarea|select/i.test(target.tagName)) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        handleFinish(false);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleBack();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [active, handleBack, handleFinish, handleNext]);

  if (!active || !current) {
    return (
      <>
        <div className="tour-ring" id="tourRing" aria-hidden="true" />
        <div
          className="tour-pop"
          id="tourPop"
          role="dialog"
          aria-modal="false"
          aria-hidden="true"
        />
      </>
    );
  }

  const isLast = tourStep === TOUR_STEPS.length - 1;

  return (
    <>
      <div
        className="tour-ring on"
        id="tourRing"
        style={ringStyle}
        aria-hidden="true"
      />
      <div
        ref={popRef}
        className={`tour-pop on ${placement}`}
        id="tourPop"
        style={popStyle}
        role="dialog"
        aria-modal="false"
        aria-labelledby="tourTitle"
        aria-describedby="tourBody"
      >
        <span className="caret" />
        <p className="eyebrow">
          Step {tourStep + 1} of {TOUR_STEPS.length}
        </p>
        <h3 id="tourTitle">{current.title}</h3>
        <p id="tourBody">{current.body}</p>
        {current.tryit && (
          <div className="try">
            <AnimatedIcon name="pointer" play />
            <span>{current.tryit}</span>
          </div>
        )}
        <div className="tour-foot">
          <span className="tour-ticks" aria-hidden="true">
            {TOUR_STEPS.map((_, k) => (
              <i key={k} className={k <= tourStep ? 'on' : ''} />
            ))}
          </span>
          {tourStep > 0 && (
            <button
              type="button"
              className="btn btn-ghost btn-sm ah"
              id="tourBack"
              onClick={handleBack}
            >
              <span className="lbl">Back</span>
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm ah"
            id="tourEnd"
            onClick={() => handleFinish(false)}
          >
            <span className="lbl">End</span>
          </button>
          <button
            type="button"
            className="btn tour-next btn-sm ah"
            id="tourNext"
            onClick={handleNext}
          >
            <span className="lbl">
              {isLast ? 'Finish' : 'Next'}
              <AnimatedIcon name={isLast ? 'check' : 'arrow'} />
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
