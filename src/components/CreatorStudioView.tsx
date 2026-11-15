import { Camera, CameraOff, CheckCircle2, Radio, ShieldAlert } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { SHOWCASE_CREATORS } from '../data/showcaseCreators';
import { confirmAdultAge, upsertMyCreatorChannel } from '../services/livequeenService';
import { Creator, CreatorCategory, UserProfile } from '../types/livequeen';
import { GoLiveButton } from './GoLiveButton';

interface CreatorStudioViewProps {
  isSignedIn: boolean;
  userProfile: UserProfile | null;
  myCreator: Creator | null;
  onSignIn: () => void;
  onNotify: (msg: string, tone?: 'neutral' | 'error') => void;
}

const CATEGORIES: CreatorCategory[] = ['Music', 'Talk & Lounge', 'Art & Studio', 'Gaming'];

export function CreatorStudioView({
  isSignedIn,
  userProfile,
  myCreator,
  onSignIn,
  onNotify,
}: CreatorStudioViewProps) {
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [category, setCategory] = useState<CreatorCategory>('Music');
  const [roomTitle, setRoomTitle] = useState('');
  const [bio, setBio] = useState('');
  const [coverUrl, setCoverUrl] = useState(SHOWCASE_CREATORS[0].coverUrl);
  const [isLive, setIsLive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmingAge, setConfirmingAge] = useState(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (myCreator) {
      setDisplayName(myCreator.displayName);
      setHandle(myCreator.handle);
      setCategory(myCreator.category);
      setRoomTitle(myCreator.roomTitle);
      setBio(myCreator.bio);
      setCoverUrl(myCreator.coverUrl);
      setIsLive(myCreator.isLive);
    } else if (userProfile) {
      setDisplayName(userProfile.displayName);
      const baseHandle = userProfile.displayName
        .toLowerCase()
        .replace(/[^a-z0-9_.]/g, '')
        .slice(0, 24);
      setHandle(baseHandle.length >= 2 ? baseHandle : 'livequeen_host');
      setRoomTitle(`${userProfile.displayName} Live Session`);
      setBio('18+ live creator studio session on LiveQueen.');
    }
  }, [myCreator, userProfile]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  async function toggleCamera() {
    if (cameraActive) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setCameraActive(false);
      setCameraError(null);
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera preview is unavailable in this browser context.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setCameraError(null);
    } catch {
      setCameraError('Camera permission denied or no camera device detected.');
    }
  }

  async function handleConfirmAdult() {
    if (!userProfile) return;
    setConfirmingAge(true);
    try {
      await confirmAdultAge(userProfile.uid);
      onNotify('18+ adult creator eligibility confirmed.');
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Unable to save confirmation.',
        'error'
      );
    } finally {
      setConfirmingAge(false);
    }
  }

  async function handleSaveChannel(e: FormEvent, nextLiveState?: boolean) {
    e.preventDefault();
    if (!userProfile) return;

    const liveFlag = nextLiveState !== undefined ? nextLiveState : isLive;
    setSaving(true);
    try {
      await upsertMyCreatorChannel(userProfile.uid, {
        displayName,
        handle,
        bio,
        category,
        roomTitle,
        coverUrl,
        isLive: liveFlag,
      });
      setIsLive(liveFlag);
      onNotify(
        liveFlag
          ? 'Your creator channel is now live in Discover.'
          : 'Creator channel saved to Firestore.'
      );
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Failed to save creator channel.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  }

  if (!isSignedIn || !userProfile) {
    return (
      <section className="mx-auto max-w-3xl rounded-xl border border-[var(--lq-border)] bg-[var(--lq-surface)] p-8 text-center">
        <Radio className="mx-auto h-9 w-9 text-rose-500" />
        <h2 className="mt-4 font-display text-2xl font-semibold text-zinc-50">
          Creator Broadcast Studio
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
          Sign in to configure your 18+ creator channel, test your camera preview, and publish a live room that other members can follow.
        </p>
        <button
          type="button"
          onClick={onSignIn}
          className="mt-6 min-h-[42px] rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500 whitespace-nowrap"
        >
          Sign In to Open Studio
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="border-b border-[var(--lq-border)]/80 pb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
          Creator Broadcast Studio
        </h1>
        <p className="mt-1.5 text-sm text-zinc-400">
          Publish your public creator channel so viewers can follow your stream and send demo gifts.
        </p>
      </div>

      {!userProfile.isAdultConfirmed ? (
        <div className="rounded-xl border border-amber-500/30 bg-[var(--lq-surface)] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <div>
                <h2 className="font-display text-base font-semibold text-zinc-100">
                  18+ Adult Creator Confirmation Required
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-400">
                  Only adults (18+) may create earning-creator accounts. For your privacy and security, LiveQueen never collects or stores raw payment cards, UPI PINs, banking passwords, or government identity documents in Firestore.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleConfirmAdult}
              disabled={confirmingAge}
              className="min-h-[42px] shrink-0 rounded-lg bg-rose-600 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-60 whitespace-nowrap"
            >
              {confirmingAge ? 'Confirming...' : 'I Confirm I Am 18+'}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={(e) => handleSaveChannel(e)}
            className="space-y-4 rounded-xl border border-[var(--lq-border)] bg-[var(--lq-surface)] p-6 lg:col-span-7"
          >
            <div className="flex items-center justify-between border-b border-[var(--lq-border)] pb-3">
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>18+ Adult Attestation Verified</span>
              </div>
              {myCreator && (
                <span className="font-mono text-xs text-zinc-400 tabular-nums">
                  {myCreator.followerCount.toLocaleString()} followers ·{' '}
                  {myCreator.diamondTotal.toLocaleString()} diamonds
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="studio-name"
                  className="block text-xs font-medium text-zinc-300"
                >
                  Display Name
                </label>
                <input
                  id="studio-name"
                  type="text"
                  required
                  minLength={2}
                  maxLength={80}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-[var(--lq-border)] bg-[var(--lq-surface-inset)] px-3 text-sm text-zinc-100 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="studio-handle"
                  className="block text-xs font-medium text-zinc-300"
                >
                  Channel Handle
                </label>
                <input
                  id="studio-handle"
                  type="text"
                  required
                  minLength={2}
                  maxLength={40}
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="aria.vance"
                  className="mt-1.5 h-10 w-full rounded-lg border border-[var(--lq-border)] bg-[var(--lq-surface-inset)] px-3 font-mono text-sm text-zinc-100 focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="studio-category"
                  className="block text-xs font-medium text-zinc-300"
                >
                  Category
                </label>
                <select
                  id="studio-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CreatorCategory)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-[var(--lq-border)] bg-[var(--lq-surface-inset)] px-3 text-sm text-zinc-100 focus:border-rose-500 focus:outline-none"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="studio-cover"
                  className="block text-xs font-medium text-zinc-300"
                >
                  Studio Cover Backdrop
                </label>
                <select
                  id="studio-cover"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-[var(--lq-border)] bg-[var(--lq-surface-inset)] px-3 text-sm text-zinc-100 focus:border-rose-500 focus:outline-none"
                >
                  {SHOWCASE_CREATORS.map((sc) => (
                    <option key={sc.creatorId} value={sc.coverUrl}>
                      {sc.category} Studio Backdrop
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="studio-title"
                className="block text-xs font-medium text-zinc-300"
              >
                Live Room Title
              </label>
              <input
                id="studio-title"
                type="text"
                required
                minLength={2}
                maxLength={120}
                value={roomTitle}
                onChange={(e) => setRoomTitle(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-[var(--lq-border)] bg-[var(--lq-surface-inset)] px-3 text-sm text-zinc-100 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="studio-bio"
                className="block text-xs font-medium text-zinc-300"
              >
                Creator Bio
              </label>
              <textarea
                id="studio-bio"
                required
                rows={3}
                maxLength={280}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--lq-border)] bg-[var(--lq-surface-inset)] p-3 text-sm text-zinc-100 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="min-h-[40px] rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-100 transition-colors hover:bg-zinc-800 disabled:opacity-60 whitespace-nowrap"
              >
                {saving ? 'Saving...' : 'Save Channel'}
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={(e) => handleSaveChannel(e, !isLive)}
                className={`min-h-[40px] rounded-lg px-5 py-2 text-xs font-semibold transition-colors disabled:opacity-60 whitespace-nowrap ${
                  isLive
                    ? 'border border-rose-500/60 bg-zinc-900 text-rose-300 hover:bg-zinc-800'
                    : 'bg-rose-600 text-white hover:bg-rose-500'
                }`}
              >
                {isLive ? 'End Live Broadcast' : 'Publish & Go Live'}
              </button>
            </div>
          </form>

          <div className="flex flex-col justify-between gap-4 rounded-xl border border-[var(--lq-border)] bg-[var(--lq-surface)] p-6 lg:col-span-5">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold text-zinc-100">
                  Local Stage Preview
                </h2>
                <span
                  className={`text-xs font-semibold ${
                    isLive ? 'text-rose-400' : 'text-zinc-500'
                  }`}
                >
                  {isLive ? 'Live on Discover' : 'Offline Draft'}
                </span>
              </div>

              <div className="relative mt-3 aspect-video w-full overflow-hidden rounded-lg border border-[var(--lq-border)] bg-[var(--lq-surface-inset)]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`h-full w-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                />
                {!cameraActive && (
                  <img
                    src={coverUrl}
                    alt="Creator studio preview"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover opacity-85"
                  />
                )}
              </div>

              {cameraError && (
                <p className="mt-2 text-xs text-amber-400">{cameraError}</p>
              )}
            </div>

            <div className="space-y-4 border-t border-[var(--lq-border)] pt-4">
              <GoLiveButton
                uid={userProfile.uid}
                displayName={displayName}
                handle={handle}
                bio={bio}
                category={category}
                coverUrl={coverUrl}
                roomTitle={roomTitle}
                channelIsLive={isLive}
                onNotify={onNotify}
              />

              <button
                type="button"
                onClick={toggleCamera}
                className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-100 transition-colors hover:bg-zinc-800"
              >
                {cameraActive ? (
                  <>
                    <CameraOff className="h-4 w-4 text-rose-400" />
                    <span>Stop Camera Preview</span>
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4" />
                    <span>Test Local Camera Preview</span>
                  </>
                )}
              </button>
              <p className="text-xs leading-relaxed text-zinc-500">
                Real multi-viewer streaming connects this stage to LiveKit Cloud using short-lived room tokens minted on a verified backend callable.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
