import { Loader2, Radio, Square } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { createLiveRoom, endLiveRoom } from '../services/livequeenService';
import { CreatorCategory, LiveRoom } from '../types/livequeen';

interface GoLiveButtonProps {
  uid: string;
  displayName: string;
  handle: string;
  bio: string;
  category: CreatorCategory;
  coverUrl: string;
  roomTitle: string;
  channelIsLive: boolean;
  onNotify: (msg: string, tone?: 'neutral' | 'error') => void;
}

export function GoLiveButton({
  uid,
  displayName,
  handle,
  bio,
  category,
  coverUrl,
  roomTitle,
  channelIsLive,
  onNotify,
}: GoLiveButtonProps) {
  const [loading, setLoading] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<string>('');

  useEffect(() => {
    const q = query(collection(db, 'liveRooms'), where('hostUid', '==', uid));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const liveRooms = snap.docs
          .map((d) => d.data() as LiveRoom)
          .filter((r) => r.status === 'live');
        if (liveRooms.length > 0) {
          setActiveRoomId(liveRooms[0].roomId);
        } else {
          setActiveRoomId('');
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'liveRooms');
      }
    );

    return () => unsubscribe();
  }, [uid]);

  const isLive = channelIsLive || Boolean(activeRoomId);

  async function handleStartLive() {
    setLoading(true);
    try {
      const result = await createLiveRoom(uid, {
        title: roomTitle || 'Welcome to my Live',
        displayName,
        handle,
        bio,
        category,
        coverUrl,
      });
      setActiveRoomId(result.roomId);
      onNotify('Live Room Created — Your live room is ready!');
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Unable to start live. Please try again.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleEndLive() {
    setLoading(true);
    try {
      await endLiveRoom(uid, activeRoomId);
      setActiveRoomId('');
      onNotify('Live Ended — Your live has ended.');
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Unable to end live room.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-[var(--lq-border)] bg-[var(--lq-surface-inset)] p-4">
      <button
        type="button"
        onClick={isLive ? handleEndLive : handleStartLive}
        disabled={loading}
        className={`inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-bold tracking-wide text-white transition-colors disabled:opacity-60 ${
          isLive
            ? 'bg-red-600 hover:bg-red-500'
            : 'bg-rose-600 hover:bg-rose-500'
        }`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isLive ? (
          <>
            <Square className="h-4 w-4 fill-current" />
            <span>END LIVE</span>
          </>
        ) : (
          <>
            <Radio className="h-4 w-4" />
            <span>GO LIVE</span>
          </>
        )}
      </button>

      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-xs font-medium text-zinc-300">
          {isLive ? 'Your live room is active' : 'Start sharing your moments'}
        </p>
        {activeRoomId && (
          <p className="font-mono text-[11px] text-zinc-400">
            Room ID: {activeRoomId} · Ready for LiveKit stream
          </p>
        )}
      </div>
    </div>
  );
}
