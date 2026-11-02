import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Link } from 'react-router';
import type { Priority } from '@mal/shared';
import { diffDaysISO, todayISO } from '@mal/shared';
import { cn } from '../../lib/cn';
import { burst } from '../../lib/motion';
import { AnimatedIcon, type IconName } from './animated-icon';

export type ActionPriority = Priority;

export const pad2 = (n: number): string => String(Math.abs(Math.trunc(n))).padStart(2, '0');

export function startOfLocalDay(d: Date = new Date()): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function toISODate(d: string | Date): string {
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return d;
  }
  const dt = toDate(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export function daysRelativeToToday(d: string | Date, today: Date = new Date()): number {
  return diffDaysISO(toISODate(d), todayISO(undefined, today));
}

export function toDate(d: string | Date): Date {
  if (d instanceof Date) return d;
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return new Date(`${d}T00:00:00`);
  }
  return new Date(d);
}

export function fmtShort(d: string | Date): string {
  return toDate(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function fmtLong(d: string | Date): string {
  return toDate(d).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function dateEyebrow(d: Date = new Date()): string {
  return fmtLong(d).replace(/,/g, '').toUpperCase();
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export interface MemberView {
  id: string;
  name: string;
  email?: string;
  role: string;
  avatarHue: number;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'line' | 'dec' | 'ghost' | 'demo';
  size?: 'md' | 'sm';
  iconOnly?: boolean;
  state?: 'idle' | 'loading' | 'success';
  icon?: IconName;
  children?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  iconOnly = false,
  state = 'idle',
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const variantCls =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'line'
        ? 'btn-line'
        : variant === 'dec'
          ? 'btn-line btn-dec'
          : variant === 'demo'
            ? 'btn-line btn-demo'
            : 'btn-ghost';

  return (
    <button
      className={cn(
        'btn ah',
        variantCls,
        size === 'sm' && 'btn-sm',
        iconOnly && 'btn-icon',
        className
      )}
      data-state={state === 'idle' ? undefined : state}
      aria-busy={state === 'loading' ? 'true' : undefined}
      disabled={disabled || state === 'loading'}
      {...rest}
    >
      {iconOnly ? (
        <>
          {icon && <AnimatedIcon name={icon} />}
          {children}
        </>
      ) : (
        <span className="lbl">
          {icon && <AnimatedIcon name={icon} />}
          {children}
        </span>
      )}
      {state === 'loading' && <span className="spin" aria-hidden="true" />}
      {state === 'success' && (
        <svg
          className="okmark"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      )}
    </button>
  );
}

export interface TagProps {
  tone?: 'default' | 'late' | 'soon' | 'done' | 'dec' | 'teal';
  outline?: boolean;
  icon?: IconName;
  loopIcon?: boolean;
  className?: string;
  children: ReactNode;
}

export function Tag({
  tone = 'default',
  outline = false,
  icon,
  loopIcon = false,
  className,
  children,
}: TagProps) {
  return (
    <span
      className={cn(
        'tag',
        tone !== 'default' && tone,
        outline && 'outline',
        className
      )}
    >
      {icon && <AnimatedIcon name={icon} loop={loopIcon} />}
      {children}
    </span>
  );
}

export const PRI_META: Record<ActionPriority, { cls: string; label: string }> = {
  low: { cls: 'p1', label: 'Low' },
  medium: { cls: 'p2', label: 'Medium' },
  high: { cls: 'p3', label: 'High' },
  critical: { cls: 'p4', label: 'Critical' },
};

export function PriorityBars({ priority }: { priority: ActionPriority }) {
  const meta = PRI_META[priority] ?? PRI_META.medium;
  return (
    <span className={cn('prio', meta.cls)} title={`${meta.label} priority`}>
      <i />
      <i />
      <i />
      <i />
      <span className="sr">{meta.label} priority</span>
    </span>
  );
}

export interface PriorityPickerProps {
  value: ActionPriority;
  onChange: (value: ActionPriority) => void;
  name?: string;
}

const PRIORITIES: ActionPriority[] = ['low', 'medium', 'high', 'critical'];

export function PriorityPicker({ value, onChange, name = 'priority' }: PriorityPickerProps) {
  const idx = Math.max(0, PRIORITIES.indexOf(value));
  return (
    <div className="prio-pick" role="radiogroup" aria-label="Priority">
      <span
        className="pp-ind"
        style={{
          width: '25%',
          transform: `translateX(${idx * 100}%)`,
        }}
      />
      {PRIORITIES.map((p) => {
        const id = `${name}-${p}`;
        return (
          <div key={p} style={{ display: 'contents' }}>
            <input
              type="radio"
              name={name}
              id={id}
              value={p}
              checked={value === p}
              onChange={() => onChange(p)}
            />
            <label htmlFor={id}>
              <PriorityBars priority={p} />
              {PRI_META[p].label}
            </label>
          </div>
        );
      })}
    </div>
  );
}

export function Avatar({
  member,
  size = 'md',
  index = 0,
}: {
  member?: Pick<MemberView, 'name' | 'avatarHue'> | null;
  size?: 'md' | 'lg';
  index?: number;
}) {
  const name = member?.name ?? 'Unknown';
  const hue = member?.avatarHue ?? 180;
  return (
    <span
      className={cn('av', size === 'lg' && 'lg')}
      style={{ '--h': hue, '--k': index } as CSSProperties}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({
  members,
  size = 'md',
}: {
  members: Array<Pick<MemberView, 'id' | 'name' | 'avatarHue'>>;
  size?: 'md' | 'lg';
}) {
  return (
    <span className="avstack">
      {members.map((m, k) => (
        <Avatar key={m.id} member={m} size={size} index={k} />
      ))}
    </span>
  );
}

export function Who({
  member,
  firstNameOnly = false,
}: {
  member?: Pick<MemberView, 'name' | 'avatarHue'> | null;
  firstNameOnly?: boolean;
}) {
  const name = member?.name ?? 'Unassigned';
  const display = firstNameOnly ? (name.split(' ')[0] ?? name) : name;
  return (
    <span className="who">
      <Avatar member={member} />
      {display}
    </span>
  );
}

export function Odometer({ value, suffix = '' }: { value: number; suffix?: string }) {
  const safeVal = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  const digits = String(safeVal).split('');
  return (
    <span className="odo" data-v={safeVal} role="img" aria-label={`${safeVal}${suffix}`}>
      {digits.map((d, idx) => (
        <span className="od" key={idx}>
          <span
            className="ods"
            style={{
              transform: `translateY(-${Number(d) * 10}%)`,
              transitionDelay: `${idx * 70}ms`,
            }}
          >
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <i key={n}>{n}</i>
            ))}
          </span>
        </span>
      ))}
      {suffix ? <span className="osuf">{suffix}</span> : null}
    </span>
  );
}

export function Ruler({ rate }: { rate: number }) {
  const on = Math.round(Math.min(100, Math.max(0, rate)) / 5);
  return (
    <span className="ruler" aria-hidden="true">
      {Array.from({ length: 20 }, (_, k) => (
        <i
          key={k}
          className={k < on ? 'on' : ''}
          style={{ '--k': k } as CSSProperties}
        />
      ))}
    </span>
  );
}

export function Masthead({
  eyebrow,
  title,
  dek,
  side,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  dek?: ReactNode;
  side?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mast">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {dek ? <p className="dek">{dek}</p> : null}
        {children}
      </div>
      {side ? <div className="mast-side">{side}</div> : null}
    </header>
  );
}

export function Section({
  tone = 'default',
  title,
  count,
  hotDot = false,
  right,
  note,
  index = 0,
  className,
  style,
  children,
}: {
  tone?: 'default' | 'late' | 'dec';
  title?: ReactNode;
  count?: number;
  hotDot?: boolean;
  right?: ReactNode;
  note?: ReactNode;
  index?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <section
      className={cn('sec st', tone !== 'default' && tone, className)}
      style={{ '--i': index, ...style } as CSSProperties}
    >
      {title && (
        <div className="sec-h">
          <h2>
            {hotDot && <span className="hot-dot" />}
            {title}
            {typeof count === 'number' && <span className="n">{pad2(count)}</span>}
          </h2>
          {right}
        </div>
      )}
      {note && <p className="sec-note">{note}</p>}
      {children}
    </section>
  );
}

export interface TabOption<T extends string> {
  key: T;
  label: string;
  count?: number;
}

export function Tabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indStyle, setIndStyle] = useState<{ width: number; left: number }>({ width: 0, left: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const activeBtn = el.querySelector<HTMLButtonElement>('button[aria-pressed="true"]');
    if (activeBtn) {
      setIndStyle({ width: activeBtn.offsetWidth, left: activeBtn.offsetLeft });
    }
  }, [value, options]);

  return (
    <div className="tabs" ref={containerRef} role="group" aria-label={ariaLabel}>
      <span
        className="tab-ind"
        style={{
          width: `${indStyle.width}px`,
          transform: `translateX(${indStyle.left}px)`,
        }}
      />
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          aria-pressed={value === opt.key}
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
          {typeof opt.count === 'number' && <span className="mono">{opt.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <svg className="empty-art" viewBox="0 0 120 120" aria-hidden="true">
        <rect className="ea-board" x="26" y="16" width="68" height="90" rx="4" />
        <path className="ea-l" d="M40 50l6 6 11-12" />
        <path className="ea-line" d="M66 51h16" />
        <path className="ea-l l2" d="M40 78l6 6 11-12" />
        <path className="ea-line" d="M66 79h16" />
      </svg>
      <h3>{title}</h3>
      <p>{description}</p>
      {action ? <div style={{ marginTop: '6px' }}>{action}</div> : null}
    </div>
  );
}

export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '44px 20px 1fr',
            gap: '12px',
            alignItems: 'center',
            padding: '10px 0',
            borderBottom: '1px solid var(--rule)',
          }}
        >
          <span className="skel" style={{ height: '22px' }} />
          <span className="skel" style={{ height: '20px' }} />
          <span className="skel" style={{ height: '12px' }} />
        </div>
      ))}
    </div>
  );
}

export function ErrorState({
  title = 'Could not load ledger data',
  message = 'Check that the server is running and try again.',
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="err-banner" role="alert">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <AnimatedIcon name="alert" />
        <h3>{title}</h3>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        {message}
      </p>
      {onRetry && (
        <div>
          <Button variant="line" size="sm" icon="undo" onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}

export function DrawerSheet({
  open,
  onClose,
  eyebrow,
  title,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow: string;
  title: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (open) {
      document.body.classList.add('dw-open');
      const timer = setTimeout(() => {
        const first = drawerRef.current?.querySelector<HTMLElement>(
          'input:not([type=radio]):not([type=checkbox]), select, textarea'
        );
        first?.focus({ preventScroll: true });
      }, 60);
      return () => {
        clearTimeout(timer);
        document.body.classList.remove('dw-open');
      };
    } else {
      document.body.classList.remove('dw-open');
      return undefined;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  return (
    <>
      <div className={cn('scrim', open && 'on')} onClick={onClose} aria-hidden="true" />
      <aside
        ref={drawerRef}
        className={cn('drawer', open && 'open')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dwTitle"
      >
        <div className="handle" />
        <div className="dw-h">
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="eyebrow">{eyebrow}</p>
            <h2 id="dwTitle">{title}</h2>
          </div>
          <Button variant="ghost" iconOnly icon="x" onClick={onClose} aria-label="Close" />
        </div>
        <div className="dw-b">{children}</div>
        {footer && <div className="dw-f">{footer}</div>}
      </aside>
    </>
  );
}

export interface ActionItemView {
  id: string;
  meetingId: string;
  meetingTitle?: string;
  decisionId?: string | null;
  title: string;
  ownerId: string;
  owner?: MemberView | null;
  dueDate: string | Date;
  priority: ActionPriority;
  status: 'open' | 'in-progress' | 'blocked' | 'done';
  completedAt?: string | Date | null;
  notes?: string;
}

export function getDueParts(action: ActionItemView, loopOverdue = false) {
  const today = startOfLocalDay(new Date());
  if (action.status === 'done') {
    const doneDate = action.completedAt ? toDate(action.completedAt) : today;
    return {
      cls: 'done',
      big: pad2(doneDate.getDate()),
      small: 'done',
      tag: (
        <Tag tone="done" icon="check">
          Done {fmtShort(doneDate)}
        </Tag>
      ),
    };
  }
  const due = toDate(action.dueDate);
  const n = daysRelativeToToday(due, today);
  if (n < 0) {
    return {
      cls: 'late',
      big: pad2(-n),
      small: 'd late',
      tag: (
        <Tag tone="late" icon="flame" loopIcon={loopOverdue}>
          {-n}d overdue
        </Tag>
      ),
    };
  }
  if (n === 0) {
    return {
      cls: 'soon',
      big: '00',
      small: 'today',
      tag: (
        <Tag tone="soon" icon="alarm" loopIcon={loopOverdue}>
          Due today
        </Tag>
      ),
    };
  }
  if (n <= 3) {
    return {
      cls: 'soon',
      big: pad2(n),
      small: 'd left',
      tag: (
        <Tag tone="soon" icon="clock">
          Due in {n}d
        </Tag>
      ),
    };
  }
  return {
    cls: '',
    big: pad2(due.getDate()),
    small: due.toLocaleDateString('en-GB', { month: 'short' }),
    tag: <Tag icon="calendar">Due {fmtShort(due)}</Tag>,
  };
}

export function ActionRow({
  action,
  index = 0,
  hideMeeting = false,
  showQuickExtend = false,
  loopOverdue = false,
  flash = false,
  onToggle,
  onExtend,
  onDelete,
}: {
  action: ActionItemView;
  index?: number;
  hideMeeting?: boolean;
  showQuickExtend?: boolean;
  loopOverdue?: boolean;
  flash?: boolean;
  onToggle?: (action: ActionItemView, btnEl: HTMLButtonElement) => void;
  onExtend?: (action: ActionItemView, rowEl: HTMLDivElement | null) => void;
  onDelete?: (action: ActionItemView) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const done = action.status === 'done';
  const parts = getDueParts(action, loopOverdue);

  return (
    <div
      ref={rowRef}
      className={cn('lrow st ah', done && 'is-done', flash && 'flash')}
      style={{ '--i': index } as CSSProperties}
      data-row={action.id}
    >
      <div className={cn('lday', parts.cls)}>
        <b>{parts.big}</b>
        <small>{parts.small}</small>
      </div>
      <button
        type="button"
        className="chk"
        role="checkbox"
        aria-checked={done}
        aria-label={`Mark "${action.title}" ${done ? 'not done' : 'done'}`}
        onClick={(e) => {
          const btn = e.currentTarget;
          if (!done) {
            burst(btn);
          }
          onToggle?.(action, btn);
        }}
      >
        <svg viewBox="0 0 24 24">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </button>
      <div>
        <div className="atitle">
          <span className="t">{action.title}</span>
        </div>
        <div className="ameta">
          <PriorityBars priority={action.priority} />
          {!hideMeeting && action.meetingTitle && (
            <Link to={`/meetings/${action.meetingId}`}>{action.meetingTitle}</Link>
          )}
          {action.decisionId && (
            <Tag tone="dec" outline icon="link">
              From decision
            </Tag>
          )}
          {action.status === 'in-progress' && <Tag tone="teal">In progress</Tag>}
        </div>
      </div>
      <div className="lside">
        <div className="lowner">
          <Who member={action.owner} />
        </div>
        <div className="ldue">
          {parts.tag}
          {showQuickExtend && !done && onExtend && (
            <Button
              variant="line"
              size="sm"
              icon="calendar"
              onClick={() => onExtend(action, rowRef.current)}
            >
              +3 days
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              icon="trash"
              aria-label={`Delete ${action.title}`}
              onClick={() => onDelete(action)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export interface DecisionItemView {
  id: string;
  meetingId: string;
  meetingTitle?: string;
  summary: string;
  decidedBy: string;
  decidedByMember?: MemberView | null;
  decidedAt: string | Date;
  status: 'pending' | 'converted' | 'no-action' | 'dismissed';
  dismissReason?: string;
  linkedActionCount?: number;
}

export function DecisionRow({
  decision,
  index = 0,
  hideMeeting = false,
  flash = false,
  onConvert,
  onDismiss,
  onReopen,
}: {
  decision: DecisionItemView;
  index?: number;
  hideMeeting?: boolean;
  flash?: boolean;
  onConvert?: (decision: DecisionItemView, cardEl: HTMLElement | null) => void;
  onDismiss?: (decision: DecisionItemView, cardEl: HTMLElement | null) => void;
  onReopen?: (decision: DecisionItemView) => void;
}) {
  const cardRef = useRef<HTMLElement>(null);
  const age = Math.max(0, -daysRelativeToToday(toDate(decision.decidedAt)));
  const linkedCount = decision.linkedActionCount ?? 1;
  const isDismissed = decision.status === 'dismissed' || decision.status === 'no-action';
  const rowStatusCls = isDismissed ? 'dismissed' : decision.status;

  return (
    <article
      ref={cardRef}
      className={cn('drow st ah', rowStatusCls, flash && 'flash')}
      style={{ '--i': index } as CSSProperties}
      data-card={decision.id}
    >
      <span className="dmark">
        <AnimatedIcon
          name={
            decision.status === 'converted'
              ? 'check'
              : isDismissed
                ? 'ban'
                : 'bulb'
          }
        />
      </span>
      <div>
        <p className="dq">“{decision.summary}”</p>
        <div className="ameta">
          <Who member={decision.decidedByMember} />
          {!hideMeeting && decision.meetingTitle && (
            <Link to={`/meetings/${decision.meetingId}`}>{decision.meetingTitle}</Link>
          )}
          <span className="mono" style={{ fontSize: '11.5px' }}>
            {age === 0 ? 'TODAY' : `${age}D AGO`}
          </span>
        </div>
      </div>
      <div className="dact">
        {decision.status === 'pending' && <Tag tone="dec">No task · {age}d</Tag>}
        {decision.status === 'converted' && (
          <Tag tone="done" icon="link">
            {linkedCount} task{linkedCount === 1 ? '' : 's'}
          </Tag>
        )}
        {isDismissed && <Tag icon="ban">No action needed</Tag>}
        {decision.status === 'pending' && (
          <div className="row">
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDismiss(decision, cardRef.current)}
              >
                No action
              </Button>
            )}
            {onConvert && (
              <Button
                variant="dec"
                size="sm"
                icon="sparkles"
                onClick={() => onConvert(decision, cardRef.current)}
              >
                Convert to task
              </Button>
            )}
          </div>
        )}
        {isDismissed && onReopen && (
          <div className="row">
            <Button variant="ghost" size="sm" icon="undo" onClick={() => onReopen(decision)}>
              Reopen
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

export interface MeetingItemView {
  id: string;
  title: string;
  date: string | Date;
  startTime: string;
  durationMin: number;
  attendeeIds: string[];
  attendees: MemberView[];
  agenda: string;
  totalActions?: number;
  doneActions?: number;
  overdueActions?: number;
  pendingDecisions?: number;
}

export function MeetingRow({
  meeting,
  index = 0,
}: {
  meeting: MeetingItemView;
  index?: number;
}) {
  const dt = toDate(meeting.date);
  const today = startOfLocalDay(new Date());
  const isUpcoming = dt >= today;
  const wd = dt.toLocaleDateString('en-GB', { weekday: 'short' });
  const mo = dt.toLocaleDateString('en-GB', { month: 'short' });
  const total = meeting.totalActions ?? 0;
  const done = meeting.doneActions ?? 0;
  const over = meeting.overdueActions ?? 0;
  const pend = meeting.pendingDecisions ?? 0;
  const progress = total > 0 ? done / total : 0;

  return (
    <Link
      to={`/meetings/${meeting.id}`}
      className="mrow st ah"
      style={{ '--i': index } as CSSProperties}
    >
      <div className="mday">
        <b>{pad2(dt.getDate())}</b>
        <span>
          {mo} · {wd}
        </span>
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="mt">{meeting.title}</div>
        <div className="ma">{meeting.agenda || 'No agenda yet.'}</div>
        <div className="mflags">
          {isUpcoming && <Tag tone="teal">Upcoming</Tag>}
          {over > 0 && (
            <Tag tone="late" icon="flame">
              {over} overdue
            </Tag>
          )}
          {pend > 0 && (
            <Tag tone="dec" icon="bulb">
              {pend} without task
            </Tag>
          )}
        </div>
      </div>
      <div className="mtime">
        {meeting.startTime}
        <br />
        <span>{meeting.durationMin} MIN</span>
      </div>
      <AvatarStack members={meeting.attendees} />
      <div className="mstat">
        <div className="meter">
          <i style={{ '--p': progress } as CSSProperties} />
        </div>
        <span>
          {done}/{total} actions done
        </span>
      </div>
      <AnimatedIcon name="chevron" />
    </Link>
  );
}
