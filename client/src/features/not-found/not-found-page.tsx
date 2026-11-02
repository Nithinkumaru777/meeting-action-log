import { Link } from 'react-router';
import { AnimatedIcon } from '../../components/ui/animated-icon';
import { Masthead } from '../../components/ui/primitives';

export function NotFoundPage() {
  return (
    <div>
      <Masthead
        eyebrow="404 · Page missing"
        title={
          <>
            This page is not in the <em>ledger</em>
          </>
        }
        dek="The address may be mistyped or the entry was removed."
      />
      <Link to="/" className="back ah">
        <AnimatedIcon name="back" />
        Back to Today
      </Link>
    </div>
  );
}
