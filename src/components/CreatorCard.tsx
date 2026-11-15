import { Radio, UserCheck, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Creator } from '../types/livequeen';

interface CreatorCardProps {
  creator: Creator;
  isFollowed: boolean;
  followPending: boolean;
  onToggleFollow: (creator: Creator) => void;
  onOpenRoom: (creator: Creator) => void;
}

export function CreatorCard({
  creator,
  isFollowed,
  followPending,
  onToggleFollow,
  onOpenRoom,
}: CreatorCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-[var(--lq-border)] bg-[var(--lq-surface)] transition-colors hover:border-zinc-500/60">
      <button
        type="button"
        onClick={() => onOpenRoom(creator)}
        className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-900 text-left focus-visible:outline-2 focus-visible:outline-rose-500"
      >
        {!imgError && creator.coverUrl ? (
          <img
            src={creator.coverUrl}
            alt={`${creator.displayName} live studio`}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950 p-4 text-zinc-400">
            <Radio className="h-8 w-8 text-rose-500/80" />
            <span className="text-xs font-medium text-zinc-300">{creator.displayName}</span>
          </div>
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent"
        />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="flex items-center gap-2 text-xs text-zinc-200 tabular-nums">
            <span
              className={`font-semibold ${
                creator.isLive ? 'text-rose-400' : 'text-zinc-400'
              }`}
            >
              {creator.isLive ? 'Live' : 'Offline'}
            </span>
            <span aria-hidden="true" className="text-zinc-500">
              ·
            </span>
            <span>{creator.category}</span>
            {creator.isLive && (
              <>
                <span aria-hidden="true" className="text-zinc-500">
                  ·
                </span>
                <span className="font-mono">{creator.viewerCount.toLocaleString()} watching</span>
              </>
            )}
          </div>
          <p className="mt-1 line-clamp-1 text-sm font-medium text-white">
            {creator.roomTitle}
          </p>
        </div>
      </button>

      <div className="flex flex-1 flex-col justify-between gap-4 p-4">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-display text-base font-semibold text-zinc-50 truncate">
              {creator.displayName}
            </h3>
            <span className="text-xs text-zinc-400 font-mono truncate">
              @{creator.handle}
            </span>
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-zinc-400">
            {creator.bio}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--lq-border)] pt-3">
          <div className="flex items-center gap-2 text-xs text-zinc-400 tabular-nums">
            <span className="font-mono text-zinc-200">
              {creator.followerCount.toLocaleString()}
            </span>
            <span>{creator.followerCount === 1 ? 'follower' : 'followers'}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenRoom(creator)}
              className="min-h-[40px] rounded-lg border border-[var(--lq-border)] bg-[var(--lq-surface-alt)] px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:brightness-110 whitespace-nowrap shrink-0"
            >
              Enter Room
            </button>
            <button
              type="button"
              onClick={() => onToggleFollow(creator)}
              disabled={followPending}
              aria-pressed={isFollowed}
              className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-60 ${
                isFollowed
                  ? 'border border-[var(--lq-border)] bg-[var(--lq-surface-alt)] text-zinc-100 hover:border-rose-500/60 hover:text-rose-300'
                  : 'bg-rose-600 text-white hover:bg-rose-500'
              }`}
            >
              {isFollowed ? (
                <>
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>{followPending ? 'Updating...' : 'Following'}</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>{followPending ? 'Updating...' : 'Follow'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
