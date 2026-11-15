import { Coins, Gem, Moon, RefreshCw, ShieldCheck, SunDim } from 'lucide-react';
import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { claimDemoTopUp } from '../services/livequeenService';
import { Creator, GiftTransaction, ThemePreference, UserProfile } from '../types/livequeen';

interface WalletLedgerViewProps {
  isSignedIn: boolean;
  userProfile: UserProfile | null;
  myCreator: Creator | null;
  followingCount: number;
  activeTheme: ThemePreference;
  onChangeTheme: (theme: ThemePreference) => void;
  onSignIn: () => void;
  onNotify: (msg: string, tone?: 'neutral' | 'error') => void;
}

function getTimestampMillis(ts: unknown): number {
  if (ts && typeof ts === 'object' && 'toMillis' in ts && typeof (ts as { toMillis: () => number }).toMillis === 'function') {
    return (ts as { toMillis: () => number }).toMillis();
  }
  return Date.now();
}

export function WalletLedgerView({
  isSignedIn,
  userProfile,
  myCreator,
  followingCount,
  activeTheme,
  onChangeTheme,
  onSignIn,
  onNotify,
}: WalletLedgerViewProps) {
  const [transactions, setTransactions] = useState<GiftTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [toppingUp, setToppingUp] = useState(false);

  useEffect(() => {
    if (!isSignedIn || !userProfile) {
      setTransactions([]);
      return;
    }

    setLoading(true);
    const txPath = `users/${userProfile.uid}/giftTransactions`;
    const q = query(
      collection(db, 'users', userProfile.uid, 'giftTransactions'),
      where('senderUid', '==', userProfile.uid),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as GiftTransaction)
          .sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
        setTransactions(list);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, txPath);
      }
    );

    return () => unsubscribe();
  }, [isSignedIn, userProfile]);

  async function handleTopUp() {
    if (!userProfile) return;
    setToppingUp(true);
    try {
      await claimDemoTopUp(userProfile.uid);
      onNotify('Added +250 demo coins to your wallet.');
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Unable to claim demo coins.',
        'error'
      );
    } finally {
      setToppingUp(false);
    }
  }

  if (!isSignedIn || !userProfile) {
    return (
      <section className="mx-auto max-w-3xl rounded-xl border border-[var(--lq-border)] bg-[var(--lq-surface)] p-8 text-center">
        <Coins className="mx-auto h-9 w-9 text-amber-400" />
        <h2 className="mt-4 font-display text-2xl font-semibold text-zinc-50">
          Demo Coin Wallet &amp; Gift Ledger
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
          Sign in to receive 500 starter demo coins, customize your Midnight or Dim theme preference, and audit your Firestore gift ledger.
        </p>
        <button
          type="button"
          onClick={onSignIn}
          className="mt-6 min-h-[42px] rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500 whitespace-nowrap"
        >
          Sign In to Open Wallet
        </button>
      </section>
    );
  }

  const creatorDiamonds = myCreator?.diamondTotal ?? userProfile.diamondBalance;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-[var(--lq-border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
            Wallet, Ledger &amp; Preferences
          </h1>
          <p className="mt-1.5 text-sm text-zinc-400">
            Atomic Firestore coin-to-diamond transaction log and profile appearance settings. Demo values only — not real currency.
          </p>
        </div>

        <button
          type="button"
          onClick={handleTopUp}
          disabled={toppingUp || userProfile.coinBalance >= 100}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[var(--lq-border)] bg-[var(--lq-surface-alt)] px-4 py-2 text-xs font-medium text-zinc-100 transition-colors hover:brightness-110 disabled:opacity-45 whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${toppingUp ? 'animate-spin' : ''}`} />
          <span>
            {userProfile.coinBalance >= 100
              ? 'Demo Top-Up (< 100 coins)'
              : 'Claim +250 Demo Coins'}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--lq-border)] bg-[var(--lq-surface)] p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Demo Coin Balance</span>
            <Coins className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-zinc-50 tabular-nums">
            {userProfile.coinBalance.toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--lq-border)] bg-[var(--lq-surface)] p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Creator Demo Diamonds</span>
            <Gem className="h-4 w-4 text-rose-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-zinc-50 tabular-nums">
            {creatorDiamonds.toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--lq-border)] bg-[var(--lq-surface)] p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Creators Followed</span>
            <ShieldCheck className="h-4 w-4 text-zinc-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-zinc-50 tabular-nums">
            {followingCount.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-4 rounded-xl border border-[var(--lq-border)] bg-[var(--lq-surface)] p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-sm font-semibold text-zinc-100">
            Appearance Theme
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Choose between deep obsidian Midnight or softer muted slate Dim. Saved to your Firestore profile.
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-[var(--lq-border)] bg-[var(--lq-surface-inset)] p-1 shrink-0">
          <button
            type="button"
            onClick={() => onChangeTheme('midnight')}
            aria-pressed={activeTheme === 'midnight'}
            className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              activeTheme === 'midnight'
                ? 'bg-zinc-800 text-zinc-50'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <Moon className="h-3.5 w-3.5" />
            <span>Midnight</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeTheme('dim')}
            aria-pressed={activeTheme === 'dim'}
            className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              activeTheme === 'dim'
                ? 'bg-slate-700 text-zinc-50'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <SunDim className="h-3.5 w-3.5" />
            <span>Dim</span>
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--lq-border)] bg-[var(--lq-surface)]">
        <div className="border-b border-[var(--lq-border)] px-5 py-3.5">
          <h2 className="font-display text-sm font-semibold text-zinc-100">
            Gift Transaction History
          </h2>
        </div>

        {loading ? (
          <div className="space-y-2 p-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-zinc-900" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-400">
            No demo gifts sent yet. Enter any creator room to send a gift from your starter balance.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--lq-border)] bg-[var(--lq-surface-inset)] text-zinc-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Gift</th>
                  <th className="px-5 py-3 font-medium">Creator</th>
                  <th className="px-5 py-3 text-right font-medium">Coins Spent</th>
                  <th className="px-5 py-3 text-right font-medium">Diamonds Credited</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--lq-border)] tabular-nums">
                {transactions.map((tx) => (
                  <tr key={tx.txId} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-3 font-medium text-zinc-100">
                      {tx.giftName}
                    </td>
                    <td className="px-5 py-3 text-zinc-300">{tx.creatorName}</td>
                    <td className="px-5 py-3 text-right font-mono text-amber-400">
                      -{tx.coinCost.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-rose-400">
                      +{tx.diamondsCredited.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
