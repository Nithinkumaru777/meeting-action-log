import type { CSSProperties } from 'react';
import { EmptyState, Who, type MemberView } from '../ui/primitives';

export function Sparkline({ values }: { values: number[] }) {
  const safe = values.length >= 2 ? values : [3, 5, 4, 7, 6, 8, 5, 9];
  const W = 420;
  const H = 130;
  const px = 26;
  const py = 16;
  const max = Math.max(1, ...safe);
  const X = (i: number) => px + (i * (W - px * 2)) / (safe.length - 1);
  const Y = (n: number) => H - py - (n / max) * (H - py * 2 - 12);
  const pts = safe.map((n, i) => `${X(i).toFixed(1)},${Y(n).toFixed(1)}`).join(' ');
  const area = `M${X(0)},${H - py} L${pts.replace(/ /g, ' L')} L${X(safe.length - 1)},${H - py} Z`;
  const first = safe[0] ?? 0;
  const last = safe[safe.length - 1] ?? 0;

  return (
    <svg
      className="spark"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Completed actions per week, from ${first} to ${last}`}
    >
      <line
        className="gr"
        x1={px}
        x2={W - px}
        y1={Y(max)}
        y2={Y(max)}
        strokeDasharray="2 4"
      />
      <line className="gr" x1={px} x2={W - px} y1={H - py} y2={H - py} />
      <text x={px} y={Y(max) - 6}>
        {max}
      </text>
      <text x={px} y={H - 2}>
        8 WK AGO
      </text>
      <text x={W - px} y={H - 2} textAnchor="end">
        THIS WEEK
      </text>
      <path className="ar" d={area} />
      <polyline className="ln" points={pts} />
      <circle className="end" cx={X(safe.length - 1)} cy={Y(last)} r="5.5" />
    </svg>
  );
}

export interface OwnerBarItem {
  member: MemberView;
  count: number;
}

export function BarList({ items }: { items: OwnerBarItem[] }) {
  const active = items.filter((x) => x.count > 0).sort((a, b) => b.count - a.count);
  if (active.length === 0) {
    return (
      <EmptyState
        title="No one is behind"
        description="Owners with overdue actions appear here."
      />
    );
  }
  const max = Math.max(1, ...active.map((x) => x.count));
  return (
    <div className="hbars">
      {active.map((x, k) => (
        <div className="hbar" key={x.member.id}>
          <Who member={x.member} firstNameOnly />
          <span className="t">
            <i style={{ '--p': x.count / max, '--k': k } as CSSProperties} />
          </span>
          <b>{x.count}</b>
        </div>
      ))}
    </div>
  );
}
