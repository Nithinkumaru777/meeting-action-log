import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type IconName =
  | 'grid'
  | 'calendar'
  | 'check'
  | 'alarm'
  | 'flame'
  | 'bulb'
  | 'sparkles'
  | 'users'
  | 'user'
  | 'doc'
  | 'listcheck'
  | 'chart'
  | 'alert'
  | 'trash'
  | 'search'
  | 'plus'
  | 'arrow'
  | 'back'
  | 'chevron'
  | 'clock'
  | 'link'
  | 'ban'
  | 'undo'
  | 'palette'
  | 'x'
  | 'sun'
  | 'moon'
  | 'play'
  | 'pointer'
  | 'help'
  | 'info'
  | 'lock'
  | 'logout';

export type IconAnimation =
  | 'pop'
  | 'flip'
  | 'draw'
  | 'shake'
  | 'flicker'
  | 'glow'
  | 'twinkle'
  | 'slide'
  | 'grow'
  | 'pulse'
  | 'lid'
  | 'scan'
  | 'turn'
  | 'nudge'
  | 'nudgeL'
  | 'tick'
  | 'undo';

interface IconDef {
  a: IconAnimation;
  render: () => ReactNode;
}

export const ICON_DEFS: Record<IconName, IconDef> = {
  grid: {
    a: 'pop',
    render: () => (
      <>
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </>
    ),
  },
  calendar: {
    a: 'flip',
    render: () => (
      <>
        <g className="p1">
          <path d="M8 2v4" />
          <path d="M16 2v4" />
        </g>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M3 10h18" />
      </>
    ),
  },
  check: {
    a: 'draw',
    render: () => (
      <>
        <circle cx="12" cy="12" r="10" />
        <path className="draw" d="m8 12.5 2.8 2.8L16.5 9.5" />
      </>
    ),
  },
  alarm: {
    a: 'shake',
    render: () => (
      <>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2 2" />
        <path d="M5 3 2 6" />
        <path d="m22 6-3-3" />
      </>
    ),
  },
  flame: {
    a: 'flicker',
    render: () => (
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    ),
  },
  bulb: {
    a: 'glow',
    render: () => (
      <>
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
        <path d="M9 18h6" />
        <path d="M10 22h4" />
      </>
    ),
  },
  sparkles: {
    a: 'twinkle',
    render: () => (
      <>
        <path
          className="main"
          d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0l1.58 6.14a2 2 0 0 0 1.44 1.44l6.14 1.58a.5.5 0 0 1 0 .96l-6.14 1.58a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z"
        />
        <g className="star2">
          <path d="M20 3v4" />
          <path d="M22 5h-4" />
        </g>
      </>
    ),
  },
  users: {
    a: 'slide',
    render: () => (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <g className="p2">
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </g>
      </>
    ),
  },
  user: {
    a: 'pop',
    render: () => (
      <>
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
  },
  doc: {
    a: 'draw',
    render: () => (
      <>
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        <path className="draw" d="M8 13h8" />
        <path className="draw" d="M8 17h5" />
      </>
    ),
  },
  listcheck: {
    a: 'draw',
    render: () => (
      <>
        <path className="draw" d="m3 17 2 2 4-4" />
        <path className="draw" d="m3 7 2 2 4-4" />
        <path d="M13 6h8" />
        <path d="M13 12h8" />
        <path d="M13 18h8" />
      </>
    ),
  },
  chart: {
    a: 'grow',
    render: () => (
      <>
        <path d="M3 3v18h18" />
        <path className="bar" d="M8 17v-4" />
        <path className="bar" d="M13 17V9" />
        <path className="bar" d="M18 17V5" />
      </>
    ),
  },
  alert: {
    a: 'pulse',
    render: () => (
      <>
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </>
    ),
  },
  trash: {
    a: 'lid',
    render: () => (
      <>
        <g className="lid">
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </g>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      </>
    ),
  },
  search: {
    a: 'scan',
    render: () => (
      <g className="lens">
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </g>
    ),
  },
  plus: {
    a: 'turn',
    render: () => (
      <>
        <path d="M5 12h14" />
        <path d="M12 5v14" />
      </>
    ),
  },
  arrow: {
    a: 'nudge',
    render: () => (
      <>
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </>
    ),
  },
  back: {
    a: 'nudgeL',
    render: () => (
      <>
        <path d="m12 19-7-7 7-7" />
        <path d="M19 12H5" />
      </>
    ),
  },
  chevron: {
    a: 'nudge',
    render: () => <path d="m9 18 6-6-6-6" />,
  },
  clock: {
    a: 'tick',
    render: () => (
      <>
        <circle cx="12" cy="12" r="10" />
        <g className="hand">
          <path d="M12 6v6l4 2" />
        </g>
      </>
    ),
  },
  link: {
    a: 'pop',
    render: () => (
      <>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </>
    ),
  },
  ban: {
    a: 'pop',
    render: () => (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="m4.9 4.9 14.2 14.2" />
      </>
    ),
  },
  undo: {
    a: 'undo',
    render: () => (
      <>
        <path d="M9 14 4 9l5-5" />
        <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
      </>
    ),
  },
  palette: {
    a: 'shake',
    render: () => (
      <>
        <circle cx="13.5" cy="6.5" r="1" fill="currentColor" />
        <circle cx="17.5" cy="10.5" r="1" fill="currentColor" />
        <circle cx="8.5" cy="7.5" r="1" fill="currentColor" />
        <circle cx="6.5" cy="12.5" r="1" fill="currentColor" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.55-2.5 5.55-5.55C21.97 6.01 17.46 2 12 2z" />
      </>
    ),
  },
  x: {
    a: 'turn',
    render: () => (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
  },
  sun: {
    a: 'tick',
    render: () => (
      <>
        <circle cx="12" cy="12" r="4" />
        <g className="hand">
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </g>
      </>
    ),
  },
  moon: {
    a: 'shake',
    render: () => <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
  },
  play: {
    a: 'nudge',
    render: () => (
      <path d="M6 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L7.5 3.64A1 1 0 0 0 6 4.5Z" />
    ),
  },
  pointer: {
    a: 'pop',
    render: () => (
      <>
        <path d="M9 9.5 13.5 21l1.8-5.2 5.2-1.8L9 9.5Z" />
        <path d="M5 5l2.5 2.5" />
        <path d="M11 3v3" />
        <path d="M3 11h3" />
      </>
    ),
  },
  help: {
    a: 'pop',
    render: () => (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <path d="M12 17h.01" />
      </>
    ),
  },
  info: {
    a: 'pop',
    render: () => (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </>
    ),
  },
  lock: {
    a: 'pop',
    render: () => (
      <>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </>
    ),
  },
  logout: {
    a: 'nudge',
    render: () => (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </>
    ),
  },
};

export interface AnimatedIconProps {
  name: IconName;
  loop?: boolean;
  play?: boolean;
  className?: string;
}

export function AnimatedIcon({ name, loop = false, play = false, className }: AnimatedIconProps) {
  const def = ICON_DEFS[name];
  return (
    <svg
      className={cn('ico', loop && 'loop', play && 'play', className)}
      data-a={def.a}
      data-icon={name}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {def.render()}
    </svg>
  );
}
