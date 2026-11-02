import { useState } from 'react';
import { AnimatedIcon, type IconName } from '../../components/ui/animated-icon';
import {
  ActionRow,
  Button,
  EmptyState,
  Masthead,
  PRI_META,
  PriorityBars,
  Section,
  SkeletonRows,
  Tag,
  type ActionItemView,
  type ActionPriority,
} from '../../components/ui/primitives';
import { toast } from '../../components/feedback/toast-store';

const TOKENS = [
  ['--paper', 'Cloud Dancer', '#F0EEE9', 'Pantone Color of the Year 2026 · page ground'],
  [
    '--teal',
    'Transformative Teal',
    'Coloro 092-37-14',
    'WGSN / Coloro Color of the Year 2026 · brand, primary actions, spine',
  ],
  ['--ink', 'Teal ink', '#13201F', 'Text, rules. Near-black biased toward teal'],
  [
    '--coral-hi',
    'Signal coral',
    '#E0533A',
    'Overdue only. Complement of teal, so late work jumps out',
  ],
  [
    '--fuchsia-hi',
    'Electric fuchsia',
    '#D63C97',
    'Decisions without tasks. From WGSN S/S 26 key colours',
  ],
  [
    '--amber-hi',
    'Amber haze',
    '#E3A21A',
    'Due today or soon. From WGSN S/S 26 key colours',
  ],
  ['--done-hi', 'Done green', '#4E9B5C', 'Completed work, success'],
  ['--rule', 'Rule', '#D3CEC3', 'Hairlines between rows and sections'],
] as const;

const ICON_GALLERY: ReadonlyArray<readonly [IconName, string, string, string]> = [
  ['grid', 'grid symbol', 'pop', 'Dashboard nav'],
  ['calendar', 'calendar symbol', 'flip', 'Dates'],
  ['check', 'check mark', 'draw', 'Done'],
  ['flame', 'flame symbol', 'flicker', 'Overdue (loops on Overdue page)'],
  ['alarm', 'alarm symbol', 'shake', 'Due today'],
  ['clock', 'clock symbol', 'tick', 'Due in 1–3 days'],
  ['bulb', 'bulb symbol', 'glow', 'Decisions'],
  ['sparkles', 'sparkles symbol', 'twinkle', 'Convert to task'],
  ['link', 'link symbol', 'pop', 'From decision'],
  ['ban', 'ban symbol', 'pop', 'No action needed'],
  ['users', 'users symbol', 'slide', 'Attendees'],
  ['user', 'user symbol', 'pop', 'Owner'],
  ['doc', 'document symbol', 'draw', 'Agenda'],
  ['listcheck', 'checklist symbol', 'draw', 'Action items'],
  ['chart', 'chart symbol', 'grow', 'Charts'],
  ['alert', 'alert symbol', 'pulse', 'Errors'],
  ['trash', 'trash symbol', 'lid', 'Delete'],
  ['search', 'search symbol', 'scan', 'Search'],
  ['plus', 'plus symbol', 'turn 90 deg', 'Create'],
  ['arrow', 'arrow symbol', 'nudge', 'View all'],
  ['undo', 'undo symbol', 'undo', 'Undo'],
  ['x', 'close symbol', 'turn 90 deg', 'Close'],
  ['palette', 'palette symbol', 'shake', 'Design system'],
  ['moon', 'moon symbol', 'swap', 'Theme'],
];

const PRIORITIES: ActionPriority[] = ['low', 'medium', 'high', 'critical'];

export function DesignSystemPage() {
  const [saveState, setSaveState] = useState<'idle' | 'loading' | 'success'>('idle');
  const [motionRunning, setMotionRunning] = useState(false);
  const [playingIcons, setPlayingIcons] = useState(false);
  const [demoDone, setDemoDone] = useState(false);
  const [demoInput, setDemoInput] = useState('');
  const [demoError, setDemoError] = useState<string | null>(null);
  const [showSkel, setShowSkel] = useState(false);

  const demoAction: ActionItemView = {
    id: 'demo-act',
    meetingId: 'mt4',
    title: 'Prepare launch checklist doc',
    ownerId: 'm3',
    owner: { id: 'm3', name: 'Meera Iyer', role: 'Designer', avatarHue: 320 },
    dueDate: new Date(),
    priority: 'high',
    status: demoDone ? 'done' : 'open',
    completedAt: demoDone ? new Date() : null,
  };

  const handleAsyncSave = () => {
    if (saveState !== 'idle') return;
    setSaveState('loading');
    setTimeout(() => {
      setSaveState('success');
      toast({ title: 'Changes saved' });
      setTimeout(() => setSaveState('idle'), 500);
    }, 320);
  };

  const handlePlayIcons = () => {
    setPlayingIcons(true);
    setTimeout(() => setPlayingIcons(false), 1100);
  };

  const handleValidateDemo = () => {
    if (demoInput.trim().length < 3) {
      setDemoError('Add a title of at least 3 characters.');
    } else {
      setDemoError(null);
      toast({ title: 'Looks good', body: demoInput.trim() });
    }
  };

  const handleReplaySkeleton = () => {
    setShowSkel(true);
    setTimeout(() => setShowSkel(false), 900);
  };

  return (
    <div>
      <Masthead
        eyebrow="Signal Ledger · v2"
        title="The design system"
        dek="Every token here traces back to a source: the 2026 colour forecasts for palette, Linear, Plausible and Todoist for layout, and Nielsen Norman Group timing for motion."
      />

      <Section
        index={0}
        title="Palette, with sources"
        right={<Tag>Updates with theme</Tag>}
      >
        <div className="swatches">
          {TOKENS.map(([tok, name, hex, usage]) => (
            <div className="sw" key={tok}>
              <i style={{ background: `var(${tok})` }} />
              <div>
                <b>{name}</b>
                <code>
                  {tok} · {hex}
                </code>
                <span className="src">{usage}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section index={1} title="References for layout">
        <div className="refs">
          <div className="ref">
            <h3>Linear</h3>
            <p>
              Dense list rows that stay calm: softer borders, quieter separation, high
              information density. Used for the ledger rows and the spine.
            </p>
            <p className="eyebrow">Ledger rows · sidebar</p>
          </div>
          <div className="ref">
            <h3>Plausible</h3>
            <p>
              A one-page dashboard with restrained charts and plain numbers. Used for the
              figures strip and single-line charts.
            </p>
            <p className="eyebrow">Figures strip · charts</p>
          </div>
          <div className="ref">
            <h3>Todoist</h3>
            <p>
              Hairlines and captions on one colour note, like ink on paper. Used for the
              rules-not-boxes sections on Cloud Dancer.
            </p>
            <p className="eyebrow">Hairlines · paper</p>
          </div>
        </div>
      </Section>

      <Section index={2} title="Type">
        <div className="trow">
          <code>Display · Newsreader 500 · 52/52 · opsz</code>
          <span
            style={{
              font: '500 52px/1 var(--f-display)',
              letterSpacing: '-.025em',
            }}
          >
            Who owns <em style={{ color: 'var(--teal)' }}>what</em>
          </span>
        </div>
        <div className="trow">
          <code>Figure · Newsreader 500 · 64 · tabular</code>
          <span
            style={{
              font: '500 64px/1 var(--f-display)',
              letterSpacing: '-.03em',
            }}
          >
            04
          </span>
        </div>
        <div className="trow">
          <code>Decision quote · Newsreader italic 19</code>
          <span className="dq">“Cut the signup form down to three fields”</span>
        </div>
        <div className="trow">
          <code>UI · Schibsted Grotesk 400–600 · 15</code>
          <span>Renew the SSL certificate for the API domain before Friday.</span>
        </div>
        <div className="trow">
          <code>Data · IBM Plex Mono 500 · 11–13 · caps</code>
          <span className="eyebrow" style={{ fontSize: '12.5px', color: 'var(--ink)' }}>
            04 NOV · 10:00 · 45 MIN · 3D LATE
          </span>
        </div>
      </Section>

      <Section index={3} title="Buttons" right={<Tag>Hover them</Tag>}>
        <div className="brow">
          <span className="eyebrow">
            Ink wipe: fill sweeps left to right in 220ms, press sinks 1px
          </span>
          <Button variant="primary" icon="plus">
            New meeting
          </Button>
          <Button variant="line" icon="calendar">
            Reschedule
          </Button>
          <Button variant="dec" icon="sparkles">
            Convert to task
          </Button>
          <Button variant="ghost">No action</Button>
          <Button variant="line" iconOnly icon="x" aria-label="Close" />
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
        <div className="brow">
          <span className="eyebrow">
            Async: label fades, spinner, then a check draws
          </span>
          <Button
            variant="primary"
            icon="check"
            state={saveState}
            onClick={handleAsyncSave}
          >
            Save changes
          </Button>
        </div>
      </Section>

      <Section
        index={4}
        title="Motion timing"
        right={
          <Button
            variant="line"
            size="sm"
            icon="arrow"
            onClick={() => setMotionRunning((v) => !v)}
          >
            Run
          </Button>
        }
        note="Feedback around 100ms, state changes 200–300ms, bigger moves up to ~400ms, longer the further something travels. Enters a little slower than exits."
      >
        <div id="tracks">
          {(
            [
              ['feedback · 100ms', '100ms', 'var(--e-out)'],
              ['state · 220ms', '220ms', 'var(--e-out)'],
              ['layout · 360ms', '360ms', 'var(--e-out)'],
              ['travel (ghost to counter) · 650ms', '650ms', 'var(--e-io)'],
            ] as const
          ).map(([label, dur, easing]) => (
            <div className="track" key={label}>
              <code>{label}</code>
              <div className="lane">
                <span
                  className="ball"
                  style={{
                    transition: `transform ${dur} ${easing}`,
                    transform: motionRunning ? 'translateX(220px)' : 'translateX(0)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        index={5}
        title="Animated icons replace every emoji"
        right={
          <Button variant="line" size="sm" icon="sparkles" onClick={handlePlayIcons}>
            Play all
          </Button>
        }
      >
        <div className="igrid">
          {ICON_GALLERY.map(([name, replaced, anim, usage]) => (
            <div className="icell ah" key={name}>
              <span className="big">
                <AnimatedIcon name={name} play={playingIcons} />
              </span>
              <b>{name}</b>
              <span>{usage}</span>
              <span className="was">
                {anim} · replaces {replaced}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section index={6} title="Components">
        <div className="demo-grid">
          <div className="demo">
            <h3>Tags and priority</h3>
            <div className="chips">
              <Tag tone="late" icon="flame">
                3d overdue
              </Tag>
              <Tag tone="soon" icon="alarm">
                Due today
              </Tag>
              <Tag icon="calendar">Due 12 Nov</Tag>
              <Tag tone="done" icon="check">
                Done
              </Tag>
              <Tag tone="dec">No task · 6d</Tag>
              <Tag tone="teal">In progress</Tag>
            </div>
            <div className="chips" style={{ marginTop: '12px', gap: '16px' }}>
              {PRIORITIES.map((p) => (
                <span className="who" key={p}>
                  <PriorityBars priority={p} />
                  {PRI_META[p].label}
                </span>
              ))}
            </div>
          </div>

          <div className="demo">
            <h3>Done: tick draws, strike draws</h3>
            <ActionRow
              action={demoAction}
              hideMeeting
              onToggle={() => setDemoDone((v) => !v)}
            />
          </div>

          <div className="demo">
            <h3>Field error</h3>
            <div className={`field ${demoError ? 'err' : ''}`} id="f-demo">
              <label htmlFor="demoIn">Task title</label>
              <input
                className="input"
                id="demoIn"
                placeholder="Leave empty, press Validate"
                value={demoInput}
                aria-invalid={demoError ? 'true' : undefined}
                onChange={(e) => {
                  setDemoInput(e.target.value);
                  if (demoError) setDemoError(null);
                }}
              />
              <p className="ferr" id="e-demo">
                {demoError && (
                  <>
                    <AnimatedIcon name="alert" />
                    {demoError}
                  </>
                )}
              </p>
            </div>
            <Button
              variant="line"
              size="sm"
              icon="alert"
              style={{ marginTop: '10px' }}
              onClick={handleValidateDemo}
            >
              Validate
            </Button>
          </div>

          <div className="demo">
            <h3>Toasts</h3>
            <div className="chips">
              <Button
                variant="line"
                size="sm"
                onClick={() =>
                  toast({
                    title: 'Task created',
                    body: 'Meera Iyer · due 8 Nov',
                    tone: 'ok',
                    undo: () => {},
                  })
                }
              >
                Success
              </Button>
              <Button
                variant="line"
                size="sm"
                onClick={() =>
                  toast({
                    title: 'Due date falls on a Sunday',
                    body: 'Keep it, or pick a weekday.',
                    tone: 'warn',
                  })
                }
              >
                Warning
              </Button>
              <Button
                variant="line"
                size="sm"
                onClick={() =>
                  toast({
                    title: 'Could not save the meeting',
                    body: 'The server did not answer. Check the API is running, then try again.',
                    tone: 'err',
                  })
                }
              >
                Error
              </Button>
            </div>
          </div>

          <div className="demo">
            <h3>Loading</h3>
            <div id="skelBox">
              {showSkel ? (
                <SkeletonRows count={3} />
              ) : (
                <ActionRow action={demoAction} hideMeeting />
              )}
            </div>
            <Button
              variant="line"
              size="sm"
              icon="undo"
              style={{ marginTop: '10px' }}
              onClick={handleReplaySkeleton}
            >
              Replay
            </Button>
          </div>

          <div className="demo">
            <h3>Empty state</h3>
            <EmptyState
              title="Every decision has an owner"
              description="Two ticks draw in, hold, fade."
            />
          </div>
        </div>
      </Section>

      <Section index={7} title="What this design refuses">
        <ul className="avoid">
          <li>Purple-to-blue gradients and glassy hero blobs</li>
          <li>Inter or another default system sans</li>
          <li>Grids of identical rounded cards with soft shadows</li>
          <li>Centered hero with a three-icon feature row</li>
          <li>Emoji as icons or section markers</li>
          <li>Colour as decoration: every hue here means a state</li>
          <li>Animations longer than ~400ms for routine feedback</li>
          <li>Motion without a cause the user can see</li>
        </ul>
      </Section>
    </div>
  );
}
