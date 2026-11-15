import { Heart, Radio, Search, UserMinus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Creator, FollowRelationship } from '../types/livequeen';

interface FollowingViewProps {
  isSignedIn: boolean;
  loading: boolean;
  follows: FollowRelationship[];
  creatorsById: Record<string, Creator>;
  pendingCreatorId: string | null;
  onSignIn: () => void;
  onUnfollow: (creatorId: string) => void;
  onOpenRoom: (creator: Creator) => void;
  onExploreDiscover: () => void;
}

export function FollowingView({
  isSignedIn,
  loading,
  follows,
  creatorsById,
  pendingCreatorId,
  onSignIn,
  onUnfollow,
  onOpenRoom,
  onExploreDiscover,
}: FollowingViewProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'live'>('all');
  const [query, setQuery] = useState('');

  const enrichedList = useMemo(() => {
    const q = query.trim().toLowerCase();
    return follows
      .map((follow) => {
        const liveCreator = creatorsById[follow.creatorId];
        return {
          follow,
          creator: liveCreator ?? {
            creatorId: follow.creatorId,
            ownerUid: 'showcase',
            displayName: follow.creatorName,
            handle: follow.creatorHandle,
            bio: 'Followed creator channel.',
            category: follow.creatorCategory,
            coverUrl: follow.creatorCoverUrl,
            roomTitle: `${follow.creatorName} Studio`,
            isLive: false,
            isPublic: true,
            viewerCount: 0,
            followerCount: 1,
            diamondTotal: 0,
          },
        };
      })
      .filter(({ creator }) => {
        if (statusFilter === 'live' && !creator.isLive) return false;
        if (!q) return true;
        return (
          creator.displayName.toLowerCase().includes(q) ||
          creator.handle.toLowerCase().includes(q) ||
          creator.category.toLowerCase().includes(q)
        );
      });
  }, [follows, creatorsById, statusFilter, query]);

  const liveFollowedCount = useMemo(
    () => follows.filter((f) => creatorsById[f.creatorId]?.isLive).length,
    [follows, creatorsById]
  );

  if (!isSignedIn) {
    return (
      <section className="mx-auto max-w-3xl rounded-xl border border-[var(--lq-border)] bg-[var(--lq-surface)] p-8 text-center">
        <Heart className="mx-auto h-9 w-9 text-rose-500" />
        <h2 className="mt-4 font-display text-2xl font-semibold text-zinc-50">
          Your Following Roster
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
          Sign in with your account to follow 18+ creators, track when they go live, and sync your following list across devices via Cloud Firestore.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onSignIn}
            className="min-h-[42px] rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500 whitespace-nowrap"
          >
            Sign In to View Following
          </button>
          <button
            type="button"
            onClick={onExploreDiscover}
            className="min-h-[42px] rounded-lg border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 whitespace-nowrap"
          >
            Browse Creators
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-[var(--lq-border)]/80 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
            Creators You Follow
          </h1>
          <p className="mt-1.5 text-sm text-zinc-400 tabular-nums">
            <span className="font-mono text-zinc-200">{follows.length}</span> following
            <span aria-hidden="true" className="mx-2 text-zinc-600">
              ·
            </span>
            <span className="font-mono text-rose-400">{liveFollowedCount}</span> live right now
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter followed creators..."
              className="h-10 w-full rounded-lg border border-[var(--lq-border)] bg-[var(--lq-surface)] pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-rose-500 focus:outline-none sm:w-64"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-[var(--lq-border)] bg-[var(--lq-surface)] p-1">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`min-h-[32px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === 'all'
                  ? 'bg-zinc-800 text-zinc-50'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              All Followed
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('live')}
              className={`min-h-[32px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === 'live'
                  ? 'bg-zinc-800 text-zinc-50'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              Live Now
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="h-24 animate-pulse rounded-xl border border-[var(--lq-border)] bg-[var(--lq-surface)]"
            />
          ))}
        </div>
      ) : follows.length === 0 ? (
        <div className="rounded-xl border border-[var(--lq-border)] bg-[var(--lq-surface)] p-10 text-center">
          <Heart className="mx-auto h-8 w-8 text-zinc-500" />
          <h2 className="mt-3 font-display text-lg font-semibold text-zinc-100">
            You are not following any creators yet
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-zinc-400">
            Follow any creator from the Discover gallery or inside a live broadcast room to keep them in your personal roster.
          </p>
          <button
            type="button"
            onClick={onExploreDiscover}
            className="mt-5 min-h-[40px] rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-500 whitespace-nowrap"
          >
            Explore Live Creators
          </button>
        </div>
      ) : enrichedList.length === 0 ? (
        <div className="rounded-xl border border-[var(--lq-border)] bg-[var(--lq-surface)] p-8 text-center">
          <p className="text-sm text-zinc-400">
            No followed creators match your current filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setQuery('');
            }}
            className="mt-3 text-xs font-medium text-rose-400 hover:text-rose-300"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/80 overflow-hidden rounded-xl border border-[var(--lq-border)] bg-[var(--lq-surface)]">
          {enrichedList.map(({ follow, creator }) => {
            const isBusy = pendingCreatorId === follow.creatorId;
            return (
              <div
                key={follow.creatorId}
                className="flex flex-col justify-between gap-4 p-4 transition-colors hover:bg-zinc-900/50 sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <button
                    type="button"
                    onClick={() => onOpenRoom(creator)}
                    className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-zinc-900"
                  >
                    <img
                      src={creator.coverUrl}
                      alt={creator.displayName}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </button>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenRoom(creator)}
                        className="font-display text-base font-semibold text-zinc-50 hover:text-rose-400 truncate"
                      >
                        {creator.displayName}
                      </button>
                      <span className="font-mono text-xs text-zinc-400">
                        @{creator.handle}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400 tabular-nums">
                      <span
                        className={`font-semibold ${
                          creator.isLive ? 'text-rose-400' : 'text-zinc-500'
                        }`}
                      >
                        {creator.isLive ? 'Live' : 'Offline'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{creator.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-zinc-300">
                        {creator.followerCount.toLocaleString()} followers
                      </span>
                      {creator.isLive && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-zinc-300">
                            {creator.viewerCount.toLocaleString()} watching
                          </span>
                        </>
                      )}
                    </div>

                    <p className="mt-1 truncate text-xs text-zinc-400">
                      {creator.roomTitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenRoom(creator)}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-zinc-800 px-3.5 py-2 text-xs font-medium text-zinc-100 transition-colors hover:bg-zinc-700 whitespace-nowrap shrink-0"
                  >
                    <Radio className="h-3.5 w-3.5 text-rose-400" />
                    <span>{creator.isLive ? 'Watch Live' : 'Open Channel'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onUnfollow(follow.creatorId)}
                    disabled={isBusy}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-zinc-700/80 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-rose-500/60 hover:text-rose-300 disabled:opacity-60 whitespace-nowrap shrink-0"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                    <span>{isBusy ? 'Removing...' : 'Unfollow'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
