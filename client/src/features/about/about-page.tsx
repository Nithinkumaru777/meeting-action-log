import type { CSSProperties } from 'react';
import { AnimatedIcon } from '../../components/ui/animated-icon';
import { Button, Masthead, dateEyebrow } from '../../components/ui/primitives';
import { useShellStore } from '../../components/layout/app-shell';

export function AboutPage() {
  const { startTour } = useShellStore();

  return (
    <div className="about-root st" style={{ '--i': 0 } as CSSProperties}>
      <Masthead
        eyebrow={dateEyebrow()}
        title={
          <>
            About this <em>project</em>
          </>
        }
        dek="System overview, student details, architectural specifications, and practical applications."
      />

      <div className="about-grid">
        <div className="about-panel">
          <dl className="about-dl">
            <dt>Project</dt>
            <dd>
              MeetingActionLog: Meeting decisions, action items, and ownership tracking system
            </dd>

            <dt>Course</dt>
            <dd>Backend Development, CIA-II</dd>

            <dt>Topic</dt>
            <dd>Meeting decisions, assigned actions, and ownership tracking (MERN Full Stack)</dd>

            <dt>Student</dt>
            <dd>
              <b>Nithin Kumar U</b>
            </dd>

            <dt>USN</dt>
            <dd>
              <span className="mono bold">2102508611</span>
            </dd>

            <dt>Built with</dt>
            <dd>
              Antigravity (planning, orchestration, browser testing) and Claude Code (implementation
              and tests)
            </dd>

            <dt>Differentiators</dt>
            <dd>
              (1) Overdue actions grouped by owner with +3 days quick-chase; (2) Decision inbox for
              unconverted meeting decisions with one-click task conversion
            </dd>

            <dt>Stack</dt>
            <dd>
              React 19, TypeScript, TanStack Query v5, Node.js, Express.js, MongoDB / Mongoose, Zod
              v4, Server-Sent Events (SSE)
            </dd>
          </dl>

          <div className="about-actions">
            <Button variant="primary" icon="play" onClick={startTour}>
              Start guided demo
            </Button>
            <a
              href="/api/health"
              target="_blank"
              rel="noreferrer"
              className="btn btn-line ah"
              id="apiHealthBtn"
            >
              <AnimatedIcon name="check" />
              <span>API Health Check</span>
            </a>
          </div>
        </div>

        <div className="about-panel">
          <h2 className="about-subtitle">Practical uses</h2>
          <ul className="about-uses">
            <li>
              <b>Sprint ceremonies:</b> Engineering and product teams tracking commitments,
              decisions, and action items from standups and planning.
            </li>
            <li>
              <b>Accountability:</b> Project managers ensuring every decision leaves the room with
              an explicit owner and due date.
            </li>
            <li>
              <b>Centralized workload:</b> Team members reviewing upcoming and overdue tasks across
              all meetings in one unified ledger.
            </li>
            <li>
              <b>Decision triage:</b> Leadership identifying and converting unassigned decisions
              before they slip through the cracks.
            </li>
            <li>
              <b>Real-time collaboration:</b> Multi-client synchronization across teammate desks via
              Server-Sent Events (SSE).
            </li>
          </ul>

          <h2 className="about-subtitle" style={{ marginTop: '28px' }}>
            System guarantees
          </h2>
          <ul className="about-uses">
            <li>
              <b>Zero emojis:</b> 31 purposeful SVG icons with crafted micro-animations.
            </li>
            <li>
              <b>Shared validation:</b> Client forms and REST endpoints validate against identical
              Zod v4 schemas from <code>@mal/shared</code>.
            </li>
            <li>
              <b>Optimistic UI:</b> Instant state updates with one-click undo toasts and automatic
              cache rollback.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
