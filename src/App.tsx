import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { collection, doc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { Bell, LogOut, Moon, Radio, Search, ShieldCheck, SunDim, UserCheck, UserPlus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CreatorCard } from './components/CreatorCard';
import { CreatorStudioView } from './components/CreatorStudioView';
import { FollowingView } from './components/FollowingView';
import { LiveRoomView } from './components/LiveRoomView';
import { Navbar } from './components/Navbar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { WalletLedgerView } from './components/WalletLedgerView';
import { SHOWCASE_CREATORS } from './data/showcaseCreators';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './lib/firebase';
import {
  confirmAdultAge,
  ensureShowcaseCreators,
  ensureUserProfile,
  followCreator,
  subscribeToFollowedCreatorsLiveStatus,
  unfollowCreator,
  updateThemePreference,
} from './services/livequeenService';
import { AppView, Creator, CreatorCategory, FollowRelationship, ThemePreference, UserProfile } from './types/livequeen';

const CATEGORY_TABS: ('All' | CreatorCategory)[] = [
  'All',
  'Music',
  'Talk & Lounge',
  'Art & Studio',
  'Gaming',
];

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [creators, setCreators] = useState<Creator[]>(SHOWCASE_CREATORS);
  const [follows, setFollows] = useState<FollowRelationship[]>([]);
  const [followsLoading, setFollowsLoading] = useState(false);
  const [pendingFollowId, setPendingFollowId] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<AppView>('discover');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'All' | CreatorCategory>('All');
  const [onlyFollowedFilter, setOnlyFollowedFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [themeOverride, setThemeOverride] = useState<ThemePreference | null>(null);
  const [savingTheme, setSavingTheme] = useState(false);

  const activeTheme: ThemePreference =
    themeOverride ?? userProfile?.themePreference ?? 'midnight';

  useEffect(() => {
    if (activeTheme === 'dim') {
      document.documentElement.setAttribute('data-theme', 'dim');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [activeTheme]);

  const [toast, setToast] = useState<{
    message: string;
    tone: 'neutral' | 'error' | 'live';
    creatorId?: string;
  } | null>(null);
  const [browserAlertPerm, setBrowserAlertPerm] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });

  function notify(
    message: string,
    tone: 'neutral' | 'error' | 'live' = 'neutral',
    creatorId?: string
  ) {
    setToast({ message, tone, creatorId });
    window.setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, tone === 'live' ? 6000 : 3600);
  }

  async function handleEnableBrowserAlerts() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      notify('Browser notifications are not supported in this browser.', 'error');
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setBrowserAlertPerm(result);
      if (result === 'granted') {
        notify('Live creator browser alerts enabled.');
      } else {
        notify('Browser notifications were not granted.', 'error');
      }
    } catch {
      notify('Unable to request notification permission.', 'error');
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      setAuthReady(true);

      if (user) {
        try {
          await ensureUserProfile(user);
          await ensureShowcaseCreators();
        } catch (err) {
          console.error(err);
        }
      } else {
        setUserProfile(null);
        setFollows([]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady) return;

    const creatorsQuery = query(
      collection(db, 'creators'),
      where('isPublic', '==', true)
    );

    if (authUser) {
      const unsub = onSnapshot(
        creatorsQuery,
        (snap) => {
          const list = snap.docs.map((d) => d.data() as Creator);
          if (list.length > 0) {
            list.sort((a, b) => Number(b.isLive) - Number(a.isLive) || b.viewerCount - a.viewerCount);
            setCreators(list);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'creators');
        }
      );
      return () => unsub();
    } else {
      getDocs(creatorsQuery)
        .then((snap) => {
          const list = snap.docs.map((d) => d.data() as Creator);
          if (list.length > 0) {
            list.sort((a, b) => Number(b.isLive) - Number(a.isLive) || b.viewerCount - a.viewerCount);
            setCreators(list);
          }
        })
        .catch(() => {
          setCreators(SHOWCASE_CREATORS);
        });
    }
  }, [authReady, authUser]);

  useEffect(() => {
    if (!authReady || !authUser) {
      setUserProfile(null);
      setFollows([]);
      return;
    }

    const userDocPath = `users/${authUser.uid}`;
    const unsubUser = onSnapshot(
      doc(db, 'users', authUser.uid),
      (snap) => {
        if (snap.exists()) {
          const profile = snap.data() as UserProfile;
          setUserProfile(profile);
          setThemeOverride(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, userDocPath);
      }
    );

    setFollowsLoading(true);
    const followsPath = `users/${authUser.uid}/following`;
    const followsQuery = query(
      collection(db, 'users', authUser.uid, 'following'),
      where('userId', '==', authUser.uid)
    );

    const unsubFollows = onSnapshot(
      followsQuery,
      (snap) => {
        setFollows(snap.docs.map((d) => d.data() as FollowRelationship));
        setFollowsLoading(false);
      },
      (error) => {
        setFollowsLoading(false);
        handleFirestoreError(error, OperationType.LIST, followsPath);
      }
    );

    const unsubLiveAlerts = subscribeToFollowedCreatorsLiveStatus(
      authUser.uid,
      (liveCreator) => {
        notify(
          `${liveCreator.displayName} is now live: ${liveCreator.roomTitle}`,
          'live',
          liveCreator.creatorId
        );
        if (
          typeof window !== 'undefined' &&
          'Notification' in window &&
          Notification.permission === 'granted'
        ) {
          try {
            const browserNotice = new Notification(`${liveCreator.displayName} is Live`, {
              body: liveCreator.roomTitle,
            });
            browserNotice.onclick = () => {
              window.focus();
              setSelectedRoomId(liveCreator.creatorId);
              browserNotice.close();
            };
          } catch {
            // In-app toast already shown
          }
        }
      }
    );

    return () => {
      unsubUser();
      unsubFollows();
      unsubLiveAlerts();
    };
  }, [authReady, authUser]);

  async function handleSignIn() {
    setAuthBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
      notify('Signed in to LiveQueen.');
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'Sign-in was cancelled or failed.',
        'error'
      );
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut(auth);
      setSelectedRoomId(null);
      notify('Signed out.');
    } catch {
      notify('Unable to sign out right now.', 'error');
    }
  }

  const followedIdSet = useMemo(
    () => new Set(follows.map((f) => f.creatorId)),
    [follows]
  );

  const creatorsById = useMemo(() => {
    const map: Record<string, Creator> = {};
    for (const c of creators) {
      map[c.creatorId] = c;
    }
    return map;
  }, [creators]);

  const myCreator = useMemo(() => {
    if (!authUser) return null;
    return creators.find((c) => c.creatorId === authUser.uid) ?? null;
  }, [creators, authUser]);

  const activeRoomCreator = useMemo(
    () => (selectedRoomId ? creatorsById[selectedRoomId] ?? null : null),
    [selectedRoomId, creatorsById]
  );

  const featuredCreator = useMemo(
    () => creators.find((c) => c.isLive) ?? creators[0] ?? SHOWCASE_CREATORS[0],
    [creators]
  );

  const filteredCreators = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return creators.filter((creator) => {
      if (categoryFilter !== 'All' && creator.category !== categoryFilter) return false;
      if (onlyFollowedFilter && !followedIdSet.has(creator.creatorId)) return false;
      if (!q) return true;
      return (
        creator.displayName.toLowerCase().includes(q) ||
        creator.handle.toLowerCase().includes(q) ||
        creator.roomTitle.toLowerCase().includes(q) ||
        creator.category.toLowerCase().includes(q)
      );
    });
  }, [creators, categoryFilter, onlyFollowedFilter, searchQuery, followedIdSet]);

  async function handleToggleFollow(creator: Creator) {
    if (!authUser) {
      await handleSignIn();
      return;
    }

    setPendingFollowId(creator.creatorId);
    try {
      if (followedIdSet.has(creator.creatorId)) {
        await unfollowCreator(authUser.uid, creator.creatorId);
        notify(`Unfollowed ${creator.displayName}`);
      } else {
        await followCreator(authUser.uid, creator);
        notify(`Now following ${creator.displayName}`);
      }
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'Unable to update follow relationship.',
        'error'
      );
    } finally {
      setPendingFollowId(null);
    }
  }

  async function handleUnfollowById(creatorId: string) {
    if (!authUser) return;
    setPendingFollowId(creatorId);
    try {
      await unfollowCreator(authUser.uid, creatorId);
      notify('Removed creator from your following list.');
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'Unable to unfollow creator.',
        'error'
      );
    } finally {
      setPendingFollowId(null);
    }
  }

  async function handleQuickAgeConfirm() {
    if (!authUser) return;
    try {
      await confirmAdultAge(authUser.uid);
      notify('18+ confirmation recorded.');
    } catch {
      notify('Could not update 18+ confirmation.', 'error');
    }
  }

  async function handleChangeTheme(nextTheme: ThemePreference) {
    if (nextTheme === activeTheme) return;
    setThemeOverride(nextTheme);

    if (!authUser) {
      notify(
        `Previewing ${nextTheme === 'dim' ? 'Dim' : 'Midnight'} theme. Sign in to save to your profile.`
      );
      return;
    }

    setSavingTheme(true);
    try {
      await updateThemePreference(authUser.uid, nextTheme);
      notify(`Theme saved: ${nextTheme === 'dim' ? 'Dim' : 'Midnight'}`);
    } catch (err) {
      setThemeOverride(null);
      notify(
        err instanceof Error ? err.message : 'Unable to save theme preference.',
        'error'
      );
    } finally {
      setSavingTheme(false);
    }
  }

  function handleNavigate(view: AppView) {
    setSelectedRoomId(null);
    setActiveView(view);
  }

  return (
    <div className="min-h-screen bg-[var(--lq-bg)] text-[var(--lq-text)] pb-20 md:pb-12 transition-colors duration-200">
      <Navbar
        activeView={activeView}
        onNavigate={handleNavigate}
        isSignedIn={!!authUser}
        onSignIn={handleSignIn}
        authBusy={authBusy}
      />

      <OfflineIndicator />

      {toast && (
        <div
          role="status"
          className={`fixed bottom-20 right-4 z-50 flex max-w-sm items-center gap-3 rounded-lg border px-4 py-3 text-xs font-medium shadow-xl md:bottom-6 md:right-6 ${
            toast.tone === 'error'
              ? 'border-rose-500/50 bg-zinc-950 text-rose-300'
              : toast.tone === 'live'
                ? 'border-rose-500/70 bg-[#141418] text-zinc-100'
                : 'border-zinc-700 bg-zinc-900 text-zinc-100'
          }`}
        >
          {toast.tone === 'live' && (
            <Radio className="h-4 w-4 shrink-0 text-rose-400" />
          )}
          <span className="flex-1 leading-snug">{toast.message}</span>
          {toast.tone === 'live' && toast.creatorId && (
            <button
              type="button"
              onClick={() => {
                setSelectedRoomId(toast.creatorId!);
                setToast(null);
              }}
              className="rounded-md bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-500 whitespace-nowrap shrink-0"
            >
              Watch
            </button>
          )}
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="text-zinc-400 hover:text-zinc-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--lq-border)] pb-4 text-xs">
          {authUser && userProfile ? (
            <div className="flex flex-wrap items-center gap-2 text-zinc-300 tabular-nums">
              <span className="font-semibold text-zinc-50">{userProfile.displayName}</span>
              <span aria-hidden="true" className="text-zinc-600">
                ·
              </span>
              <button
                type="button"
                onClick={() => handleNavigate('following')}
                className="font-mono text-zinc-200 hover:text-rose-400"
              >
                {follows.length} following
              </button>
              <span aria-hidden="true" className="text-zinc-600">
                ·
              </span>
              <button
                type="button"
                onClick={() => handleNavigate('wallet')}
                className="font-mono text-amber-400 hover:text-amber-300"
              >
                {userProfile.coinBalance.toLocaleString()} demo coins
              </button>
              {browserAlertPerm === 'default' && (
                <>
                  <span aria-hidden="true" className="text-zinc-600">
                    ·
                  </span>
                  <button
                    type="button"
                    onClick={handleEnableBrowserAlerts}
                    className="inline-flex items-center gap-1 font-medium text-zinc-300 hover:text-rose-400"
                  >
                    <Bell className="h-3.5 w-3.5" />
                    <span>Enable Live Alerts</span>
                  </button>
                </>
              )}
              {!userProfile.isAdultConfirmed && (
                <>
                  <span aria-hidden="true" className="text-zinc-600">
                    ·
                  </span>
                  <button
                    type="button"
                    onClick={handleQuickAgeConfirm}
                    className="inline-flex items-center gap-1 font-medium text-rose-400 hover:text-rose-300"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Confirm 18+ Status</span>
                  </button>
                </>
              )}
            </div>
          ) : (
            <p className="text-zinc-400">
              Sign in to save your following roster, demo coins, and theme preference.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <PWAInstallButton />

            <div
              role="group"
              aria-label="Theme preference"
              className="flex items-center gap-1 rounded-lg border border-[var(--lq-border)] bg-[var(--lq-surface)] p-0.5"
            >
              <button
                type="button"
                onClick={() => handleChangeTheme('midnight')}
                disabled={savingTheme}
                aria-pressed={activeTheme === 'midnight'}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                  activeTheme === 'midnight'
                    ? 'bg-zinc-800 text-zinc-50'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <Moon className="h-3 w-3" />
                <span>Midnight</span>
              </button>
              <button
                type="button"
                onClick={() => handleChangeTheme('dim')}
                disabled={savingTheme}
                aria-pressed={activeTheme === 'dim'}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                  activeTheme === 'dim'
                    ? 'bg-slate-700 text-zinc-50'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <SunDim className="h-3 w-3" />
                <span>Dim</span>
              </button>
            </div>

            {authUser && (
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 text-zinc-400 transition-colors hover:text-zinc-100 whitespace-nowrap"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {activeRoomCreator ? (
          <LiveRoomView
            creator={activeRoomCreator}
            isSignedIn={!!authUser}
            userProfile={userProfile}
            isFollowed={followedIdSet.has(activeRoomCreator.creatorId)}
            followPending={pendingFollowId === activeRoomCreator.creatorId}
            onBack={() => setSelectedRoomId(null)}
            onSignIn={handleSignIn}
            onToggleFollow={handleToggleFollow}
            onNotify={notify}
          />
        ) : activeView === 'following' ? (
          <FollowingView
            isSignedIn={!!authUser}
            loading={followsLoading}
            follows={follows}
            creatorsById={creatorsById}
            pendingCreatorId={pendingFollowId}
            onSignIn={handleSignIn}
            onUnfollow={handleUnfollowById}
            onOpenRoom={(creator) => setSelectedRoomId(creator.creatorId)}
            onExploreDiscover={() => setActiveView('discover')}
          />
        ) : activeView === 'studio' ? (
          <CreatorStudioView
            isSignedIn={!!authUser}
            userProfile={userProfile}
            myCreator={myCreator}
            onSignIn={handleSignIn}
            onNotify={notify}
          />
        ) : activeView === 'wallet' ? (
          <WalletLedgerView
            isSignedIn={!!authUser}
            userProfile={userProfile}
            myCreator={myCreator}
            followingCount={follows.length}
            activeTheme={activeTheme}
            onChangeTheme={handleChangeTheme}
            onSignIn={handleSignIn}
            onNotify={notify}
          />
        ) : (
          <div className="space-y-10">
            <section className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
              <div className="flex flex-col justify-center space-y-5 lg:col-span-6">
                <p className="text-xs font-medium text-rose-400">
                  18+ Creator Live Rooms · Demo Coin &amp; Follow Starter
                </p>
                <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.12] [text-wrap:balance]">
                  Follow live creators and join real-time broadcast studios.
                </h1>
                <p className="max-w-xl text-base leading-relaxed text-zinc-400">
                  Discover independent musicians, late-night hosts, and studio artists. Build your personal following roster in Cloud Firestore, participate in live room chat, and send atomic demo gifts.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedRoomId(featuredCreator.creatorId)}
                    className="min-h-[44px] rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500 whitespace-nowrap"
                  >
                    Watch Featured Live Room
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView('following')}
                    className="min-h-[44px] rounded-lg border border-zinc-700 bg-[var(--lq-surface)] px-5 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 whitespace-nowrap"
                  >
                    {authUser
                      ? `My Following (${follows.length})`
                      : 'View Following List'}
                  </button>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="relative flex h-full min-h-[300px] flex-col justify-end overflow-hidden rounded-xl border border-[var(--lq-border)] bg-[var(--lq-surface)]">
                  <img
                    src={featuredCreator.coverUrl}
                    alt={`${featuredCreator.displayName} featured live studio`}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/15"
                  />
                  <div className="relative z-10 p-6">
                    <div className="flex items-center gap-2 text-xs text-zinc-200 tabular-nums">
                      <span className="font-semibold text-rose-400">
                        {featuredCreator.isLive ? 'Featured Live' : 'Featured Creator'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{featuredCreator.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">
                        {featuredCreator.viewerCount.toLocaleString()} watching
                      </span>
                    </div>
                    <h2 className="mt-1.5 font-display text-xl font-bold text-white">
                      {featuredCreator.roomTitle}
                    </h2>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs text-zinc-300">
                        Hosted by{' '}
                        <strong className="font-semibold text-white">
                          {featuredCreator.displayName}
                        </strong>{' '}
                        <span className="font-mono text-zinc-400">
                          @{featuredCreator.handle}
                        </span>
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleFollow(featuredCreator)}
                          disabled={pendingFollowId === featuredCreator.creatorId}
                          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                            followedIdSet.has(featuredCreator.creatorId)
                              ? 'border border-zinc-600 bg-zinc-900/90 text-zinc-100 hover:border-rose-500/70'
                              : 'bg-white text-zinc-950 hover:bg-zinc-200'
                          }`}
                        >
                          {followedIdSet.has(featuredCreator.creatorId) ? (
                            <>
                              <UserCheck className="h-3.5 w-3.5" />
                              <span>Following</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-3.5 w-3.5" />
                              <span>Follow</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex flex-col gap-4 border-b border-[var(--lq-border)]/80 pb-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[var(--lq-border)] bg-[var(--lq-surface)] p-1">
                  {CATEGORY_TABS.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`min-h-[34px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        categoryFilter === cat
                          ? 'bg-zinc-800 text-zinc-50'
                          : 'text-zinc-400 hover:text-zinc-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {authUser && (
                    <button
                      type="button"
                      onClick={() => setOnlyFollowedFilter((v) => !v)}
                      aria-pressed={onlyFollowedFilter}
                      className={`min-h-[40px] rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        onlyFollowedFilter
                          ? 'border-rose-500/60 bg-rose-600/15 text-rose-300'
                          : 'border-[var(--lq-border)] bg-[var(--lq-surface)] text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      Following Only ({follows.length})
                    </button>
                  )}

                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search creators or rooms..."
                      className="h-10 w-full rounded-lg border border-[var(--lq-border)] bg-[var(--lq-surface)] pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-rose-500 focus:outline-none sm:w-64"
                    />
                  </div>
                </div>
              </div>

              {filteredCreators.length === 0 ? (
                <div className="rounded-xl border border-[var(--lq-border)] bg-[var(--lq-surface)] p-10 text-center">
                  <p className="text-sm text-zinc-400">
                    No creators match your current filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryFilter('All');
                      setOnlyFollowedFilter(false);
                      setSearchQuery('');
                    }}
                    className="mt-3 text-xs font-medium text-rose-400 hover:text-rose-300"
                  >
                    Reset all filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredCreators.map((creator) => (
                    <CreatorCard
                      key={creator.creatorId}
                      creator={creator}
                      isFollowed={followedIdSet.has(creator.creatorId)}
                      followPending={pendingFollowId === creator.creatorId}
                      onToggleFollow={handleToggleFollow}
                      onOpenRoom={(c) => setSelectedRoomId(c.creatorId)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      <footer className="mx-auto mt-12 max-w-7xl border-t border-zinc-800/80 px-4 py-6 text-xs text-zinc-500 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <p>
            LiveQueen — 18+ Creator Live-Streaming &amp; Following Starter
          </p>
          <p>
            Demo coins &amp; diamonds have no monetary value. No payment credentials or ID documents are stored.
          </p>
        </div>
      </footer>
    </div>
  );
}
