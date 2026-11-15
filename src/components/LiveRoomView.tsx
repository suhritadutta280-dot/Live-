import {
  ArrowLeft,
  Coins,
  Gem,
  Gift,
  Send,
  ShieldCheck,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import { GIFT_CATALOG } from '../data/showcaseCreators';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { sendDemoGift, sendRoomMessage } from '../services/livequeenService';
import { Creator, GiftCatalogItem, RoomMessage, UserProfile } from '../types/livequeen';

interface LiveRoomViewProps {
  creator: Creator;
  isSignedIn: boolean;
  userProfile: UserProfile | null;
  isFollowed: boolean;
  followPending: boolean;
  onBack: () => void;
  onSignIn: () => void;
  onToggleFollow: (creator: Creator) => void;
  onNotify: (msg: string, tone?: 'neutral' | 'error') => void;
}

function getTimestampMillis(ts: unknown): number {
  if (ts && typeof ts === 'object' && 'toMillis' in ts && typeof (ts as { toMillis: () => number }).toMillis === 'function') {
    return (ts as { toMillis: () => number }).toMillis();
  }
  return Date.now();
}

export function LiveRoomView({
  creator,
  isSignedIn,
  userProfile,
  isFollowed,
  followPending,
  onBack,
  onSignIn,
  onToggleFollow,
  onNotify,
}: LiveRoomViewProps) {
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [chatText, setChatText] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [sendingGiftId, setSendingGiftId] = useState<string | null>(null);
  const [showLiveKitInfo, setShowLiveKitInfo] = useState(false);

  useEffect(() => {
    if (!isSignedIn) {
      setMessages([]);
      return;
    }

    const msgPath = `creators/${creator.creatorId}/messages`;
    const q = query(
      collection(db, 'creators', creator.creatorId, 'messages'),
      where('creatorId', '==', creator.creatorId),
      limit(60)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as RoomMessage)
          .sort((a, b) => getTimestampMillis(a.createdAt) - getTimestampMillis(b.createdAt));
        setMessages(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, msgPath);
      }
    );

    return () => unsubscribe();
  }, [creator.creatorId, isSignedIn]);

  async function handleSendChat(e: FormEvent) {
    e.preventDefault();
    if (!isSignedIn || !userProfile) {
      onSignIn();
      return;
    }
    const trimmed = chatText.trim();
    if (!trimmed) return;

    setSendingChat(true);
    try {
      await sendRoomMessage(
        userProfile.uid,
        userProfile.displayName,
        creator.creatorId,
        trimmed
      );
      setChatText('');
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Could not post chat message.',
        'error'
      );
    } finally {
      setSendingChat(false);
    }
  }

  async function handleGift(gift: GiftCatalogItem) {
    if (!isSignedIn || !userProfile) {
      onSignIn();
      return;
    }
    setSendingGiftId(gift.id);
    try {
      await sendDemoGift(
        userProfile.uid,
        userProfile.displayName,
        creator,
        gift
      );
      onNotify(`Sent ${gift.name} to ${creator.displayName}`);
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Unable to send demo gift.',
        'error'
      );
    } finally {
      setSendingGiftId(null);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[var(--lq-border)] bg-[var(--lq-surface)] px-3.5 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-800 whitespace-nowrap"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Gallery</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowLiveKitInfo((v) => !v)}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[var(--lq-border)] bg-[var(--lq-surface)] px-3.5 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-700 whitespace-nowrap"
          >
            <ShieldCheck className="h-4 w-4 text-zinc-400" />
            <span>{showLiveKitInfo ? 'Hide Stream Notes' : 'LiveKit Room Architecture'}</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleFollow(creator)}
            disabled={followPending}
            aria-pressed={isFollowed}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              isFollowed
                ? 'border border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-rose-500/60 hover:text-rose-300'
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
                <span>{followPending ? 'Updating...' : 'Follow Creator'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {showLiveKitInfo && (
        <div className="rounded-xl border border-[var(--lq-border)] bg-[var(--lq-surface)] p-4 text-xs leading-relaxed text-zinc-300">
          <p className="font-semibold text-zinc-100">
            LiveKit Cloud Token Architecture (Starter Placeholder)
          </p>
          <p className="mt-1 text-zinc-400">
            Production real-time video requires a backend HTTPS callable that verifies Firebase Authentication, creator permissions, and 18+ confirmation before minting short-lived LiveKit room tokens. Never bundle LiveKit API secrets in client apps.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
        <div className="flex flex-col gap-5 lg:col-span-8">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-[var(--lq-border)] bg-zinc-950">
            <img
              src={creator.coverUrl}
              alt={`${creator.displayName} live broadcast stage`}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30"
            />

            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 text-xs">
              <div className="flex items-center gap-2 text-zinc-100 tabular-nums">
                <span className={creator.isLive ? 'font-semibold text-rose-400' : 'text-zinc-400'}>
                  {creator.isLive ? 'LIVE STAGE' : 'OFFLINE PREVIEW'}
                </span>
                <span aria-hidden="true" className="text-zinc-500">
                  ·
                </span>
                <span className="font-mono">room/{creator.creatorId}</span>
              </div>
              <span className="font-mono text-zinc-200 tabular-nums">
                {creator.viewerCount.toLocaleString()} viewers
              </span>
            </div>

            <div className="absolute inset-x-0 bottom-0 p-5">
              <h1 className="font-display text-xl font-bold text-white sm:text-2xl">
                {creator.roomTitle}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-300 tabular-nums">
                <span className="font-medium text-white">{creator.displayName}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">@{creator.handle}</span>
                <span aria-hidden="true">·</span>
                <span>{creator.category}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">
                  {creator.followerCount.toLocaleString()} followers
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-amber-400">
                  {creator.diamondTotal.toLocaleString()} demo diamonds
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--lq-border)] bg-[var(--lq-surface)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--lq-border)]/80 pb-3">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-rose-400" />
                <h2 className="font-display text-sm font-semibold text-zinc-100">
                  Send Demo Gift
                </h2>
                <span className="text-xs text-zinc-500">
                  · Atomic Firestore coin-to-diamond transaction
                </span>
              </div>

              {userProfile ? (
                <div className="flex items-center gap-4 text-xs tabular-nums">
                  <span className="inline-flex items-center gap-1.5 font-mono text-amber-400">
                    <Coins className="h-3.5 w-3.5" />
                    {userProfile.coinBalance.toLocaleString()} coins
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-mono text-zinc-300">
                    <Gem className="h-3.5 w-3.5 text-rose-400" />
                    {creator.diamondTotal.toLocaleString()} room diamonds
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onSignIn}
                  className="text-xs font-medium text-rose-400 hover:text-rose-300"
                >
                  Sign in to send gifts (500 demo coins)
                </button>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {GIFT_CATALOG.map((gift) => {
                const isBusy = sendingGiftId === gift.id;
                const insufficient =
                  !!userProfile && userProfile.coinBalance < gift.coinCost;
                return (
                  <button
                    key={gift.id}
                    type="button"
                    onClick={() => handleGift(gift)}
                    disabled={isBusy || insufficient}
                    className="flex flex-col items-start justify-between rounded-lg border border-[var(--lq-border)] bg-zinc-900/70 p-3 text-left transition-colors hover:border-rose-500/60 hover:bg-zinc-900 disabled:opacity-50"
                  >
                    <span className="text-xs font-semibold text-zinc-100">
                      {gift.name}
                    </span>
                    <span className="mt-1 text-[11px] text-zinc-400 line-clamp-1">
                      {gift.description}
                    </span>
                    <span className="mt-2.5 font-mono text-xs font-semibold text-amber-400 tabular-nums">
                      {isBusy ? 'Sending...' : `${gift.coinCost} Coins`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="flex h-[520px] flex-col overflow-hidden rounded-xl border border-[var(--lq-border)] bg-[var(--lq-surface)] lg:col-span-4 lg:h-auto">
          <div className="flex items-center justify-between border-b border-[var(--lq-border)] px-4 py-3">
            <h2 className="font-display text-sm font-semibold text-zinc-100">
              Live Room Chat
            </h2>
            <span className="text-xs text-zinc-400">18+ Moderated</span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {!isSignedIn ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-sm text-zinc-400">
                  Sign in to view and participate in real-time room chat.
                </p>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="mt-3 min-h-[40px] rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500"
                >
                  Sign In to Chat
                </button>
              </div>
            ) : messages.length === 0 ? (
              <p className="py-10 text-center text-xs text-zinc-500">
                No messages yet. Say hello to {creator.displayName}.
              </p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.messageId}
                  className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
                    msg.kind === 'gift'
                      ? 'border border-amber-500/30 bg-amber-500/10 text-amber-200'
                      : 'bg-zinc-900/70 text-zinc-200'
                  }`}
                >
                  <span className="font-semibold text-zinc-50">{msg.senderName}</span>
                  <span className="mx-1.5 text-zinc-500">·</span>
                  <span>{msg.text}</span>
                </div>
              ))
            )}
          </div>

          <form
            onSubmit={handleSendChat}
            className="flex items-center gap-2 border-t border-[var(--lq-border)] p-3"
          >
            <input
              type="text"
              value={chatText}
              maxLength={280}
              onChange={(e) => setChatText(e.target.value)}
              placeholder={isSignedIn ? 'Send a message...' : 'Sign in to chat'}
              disabled={!isSignedIn || sendingChat}
              className="h-10 flex-1 rounded-lg border border-[var(--lq-border)] bg-zinc-950 px-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-rose-500 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!isSignedIn || sendingChat || !chatText.trim()}
              aria-label="Send message"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-rose-600 text-white transition-colors hover:bg-rose-500 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </aside>
      </div>
    </section>
  );
}
