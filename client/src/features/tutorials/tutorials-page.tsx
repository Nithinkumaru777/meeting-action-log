import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatedIcon } from '../../components/ui/animated-icon';
import { EmptyState, Masthead, Section } from '../../components/ui/primitives';
import data from './topics.json';

export interface Topic {
  id: string;
  title: string;
  description: string;
  duration: string;
  src: string;
}
export interface TopicChapter {
  num: number;
  title: string;
  topics: Topic[];
}
export interface TutorialData {
  full: { src: string; poster: string; duration: string };
  chapters: TopicChapter[];
}

export const TUTORIALS: TutorialData = data;

/** Chapters holding topics that match every word of the query. Empty chapters are dropped. */
export function filterChapters(chapters: TopicChapter[], query: string): TopicChapter[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return chapters;
  return chapters
    .map((c) => ({
      ...c,
      topics: c.topics.filter((t) => {
        const text = `${c.title} ${t.title} ${t.description}`.toLowerCase();
        return words.every((w) => text.includes(w));
      }),
    }))
    .filter((c) => c.topics.length > 0);
}

/** Only one tutorial video plays at a time. */
function pauseOthers(current: HTMLVideoElement) {
  document.querySelectorAll<HTMLVideoElement>('.tut-root video').forEach((v) => {
    if (v !== current) v.pause();
  });
}

function TutorialVideo({ src, label, poster }: { src: string; label: string; poster?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="tut-video">
        <p className="tut-error">This video could not be loaded. Please try again later.</p>
      </div>
    );
  }
  return (
    <div className="tut-video">
      {/* Captions are part of the picture. */}
      <video
        controls
        playsInline
        src={src}
        poster={poster}
        preload={poster ? 'none' : 'metadata'}
        aria-label={label}
        onError={() => setFailed(true)}
        onPlay={(e) => pauseOthers(e.currentTarget)}
      />
    </div>
  );
}

function TopicRow({
  topic,
  open,
  onToggle,
}: {
  topic: Topic;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = `tut-panel-${topic.id}`;
  return (
    <article className="tut-topic" data-topic={topic.id}>
      <button
        type="button"
        className="tut-toggle ah"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className="tut-title">{topic.title}</span>
        <span className="tut-dur">{topic.duration}</span>
        <span className="tut-arrow" aria-hidden="true">
          <AnimatedIcon name="arrow" />
        </span>
      </button>
      {/* The clip only exists, and only downloads, while its topic is open. Closing removes it, which stops playback. */}
      <div className="tut-panel" id={panelId} hidden={!open}>
        {open && (
          <>
            <TutorialVideo src={topic.src} label={topic.title} />
            <p className="tut-desc">{topic.description}</p>
          </>
        )}
      </div>
    </article>
  );
}

export function TutorialsPage({ tutorial = TUTORIALS }: { tutorial?: TutorialData }) {
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const chapters = useMemo(() => filterChapters(tutorial.chapters, query), [tutorial, query]);

  // Opening a topic stops the full guide, so two voices never overlap.
  useEffect(() => {
    if (openId) rootRef.current?.querySelector<HTMLVideoElement>('.tut-full video')?.pause();
  }, [openId]);

  return (
    <div>
      <Masthead
        eyebrow="Learn the app"
        title={
          <>
            Tutorial <em>videos</em>
          </>
        }
        dek="Watch the full guide, or open one topic to see a short video and a written explanation of that feature."
      />
      <div className="tut-root" ref={rootRef}>
        <section className="tut-full">
          <TutorialVideo
            src={tutorial.full.src}
            poster={tutorial.full.poster}
            label="Full guide to MeetingActionLog"
          />
          <p className="tut-full-cap">
            Full guide, {tutorial.full.duration}. Every feature from start to finish.
          </p>
        </section>

        <div className="field tut-search">
          <label htmlFor="tutSearch">Learn one feature</label>
          <input
            className="input"
            id="tutSearch"
            type="search"
            placeholder="Search topics, such as overdue or convert"
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpenId(null);
            }}
          />
        </div>

        {chapters.length === 0 ? (
          <EmptyState
            title="No topics match"
            description="Try another word, such as a button or page name."
          />
        ) : (
          chapters.map((c) => (
            <Section key={c.num} title={c.title}>
              {c.topics.map((t) => (
                <TopicRow
                  key={t.id}
                  topic={t}
                  open={openId === t.id}
                  onToggle={() => setOpenId((cur) => (cur === t.id ? null : t.id))}
                />
              ))}
            </Section>
          ))
        )}
      </div>
    </div>
  );
}
