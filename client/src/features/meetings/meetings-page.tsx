import { useMemo, useState } from 'react';
import { todayISO } from '@mal/shared';
import { AnimatedIcon } from '../../components/ui/animated-icon';
import {
  Button,
  EmptyState,
  ErrorState,
  Masthead,
  MeetingRow,
  SkeletonRows,
  Tabs,
  Tag,
  dateEyebrow,
} from '../../components/ui/primitives';
import { useShellStore } from '../../components/layout/app-shell';
import { toMeetingView } from '../../lib/mappers';
import { useMembersQuery } from '../members/hooks';
import { useMeetingsQuery } from './hooks';

export type MeetingFilterTab = 'all' | 'upcoming' | 'past';

export function MeetingsPage() {
  const [filter, setFilter] = useState<MeetingFilterTab>('all');
  const { searchQuery, setSearchQuery } = useShellStore();
  const meetingsQuery = useMeetingsQuery({ filter: 'all' });
  const membersQuery = useMembersQuery();

  const membersMap = useMemo(() => {
    const map = new Map<string, NonNullable<typeof membersQuery.data>[number]>();
    for (const m of membersQuery.data ?? []) {
      map.set(m.id, m);
    }
    return map;
  }, [membersQuery.data]);

  const allMeetings = useMemo(() => {
    return (meetingsQuery.data?.data ?? []).map((m) => toMeetingView(m, membersMap));
  }, [meetingsQuery.data, membersMap]);

  const today = todayISO();

  const counts = useMemo(() => {
    const upcoming = allMeetings.filter((m) => String(m.date) >= today).length;
    const past = allMeetings.filter((m) => String(m.date) < today).length;
    return {
      all: allMeetings.length,
      upcoming,
      past,
    };
  }, [allMeetings, today]);

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = [...allMeetings].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    if (filter === 'upcoming') {
      list = list.filter((m) => String(m.date) >= today).reverse();
    } else if (filter === 'past') {
      list = list.filter((m) => String(m.date) < today);
    }
    if (q) {
      list = list.filter((m) => `${m.title} ${m.agenda}`.toLowerCase().includes(q));
    }
    return list;
  }, [allMeetings, filter, searchQuery, today]);

  return (
    <div>
      <Masthead
        eyebrow={dateEyebrow()}
        title="Meetings"
        dek="Each meeting keeps its own decisions and the actions they produced."
      />

      <div className="toolbar">
        <Tabs<MeetingFilterTab>
          ariaLabel="Filter meetings"
          value={filter}
          onChange={setFilter}
          options={[
            { key: 'all', label: 'All', count: counts.all },
            { key: 'upcoming', label: 'Upcoming', count: counts.upcoming },
            { key: 'past', label: 'Held', count: counts.past },
          ]}
        />
        {searchQuery.trim() && (
          <Tag tone="teal" icon="search">
            “{searchQuery}”
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              icon="x"
              aria-label="Clear search"
              style={{ '--bh': '20px' } as React.CSSProperties}
              onClick={() => setSearchQuery('')}
            />
          </Tag>
        )}
      </div>

      <div id="mList">
        {meetingsQuery.isLoading ? (
          <SkeletonRows count={4} />
        ) : meetingsQuery.isError ? (
          <ErrorState
            message={
              meetingsQuery.error instanceof Error
                ? meetingsQuery.error.message
                : 'Could not load meetings.'
            }
            onRetry={() => void meetingsQuery.refetch()}
          />
        ) : filteredList.length > 0 ? (
          filteredList.map((m, i) => <MeetingRow key={m.id} meeting={m} index={i} />)
        ) : (
          <EmptyState
            title="No meetings match"
            description="Try another word, or clear the search."
            action={
              searchQuery.trim() ? (
                <Button variant="line" size="sm" onClick={() => setSearchQuery('')}>
                  <AnimatedIcon name="x" />
                  Clear search
                </Button>
              ) : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
