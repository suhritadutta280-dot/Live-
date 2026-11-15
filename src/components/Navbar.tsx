import { Compass, Heart, Radio, Wallet } from 'lucide-react';
import { AppView } from '../types/livequeen';

interface NavbarProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  isSignedIn: boolean;
  onSignIn: () => void;
  authBusy: boolean;
}

export function Navbar({
  activeView,
  onNavigate,
  isSignedIn,
  onSignIn,
  authBusy,
}: NavbarProps) {
  const navItems: { id: AppView; label: string }[] = [
    { id: 'discover', label: 'Discover' },
    { id: 'following', label: 'Following' },
    { id: 'studio', label: 'Live Studio' },
    { id: 'wallet', label: 'Wallet' },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[var(--lq-border)] bg-[var(--lq-bg-nav)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => onNavigate('discover')}
            className="font-display text-lg font-bold tracking-tight text-zinc-50 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-500"
          >
            LiveQueen
          </button>

          <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7">
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`relative py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-500 ${
                    isActive
                      ? 'text-zinc-50'
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-rose-500"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center shrink-0">
            {isSignedIn ? (
              <button
                type="button"
                onClick={() => onNavigate('studio')}
                className="min-h-[40px] rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-500 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
              >
                Go Live
              </button>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                disabled={authBusy}
                className="min-h-[40px] rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-60 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
              >
                {authBusy ? 'Connecting...' : 'Sign In'}
              </button>
            )}
          </div>
        </div>
      </header>

      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-40 grid h-14 grid-cols-4 border-t border-[var(--lq-border)] bg-[var(--lq-bg-nav)] backdrop-blur-md md:hidden"
      >
        <button
          type="button"
          onClick={() => onNavigate('discover')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            activeView === 'discover' ? 'text-rose-400' : 'text-zinc-400'
          }`}
        >
          <Compass className="h-4 w-4" />
          <span>Discover</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('following')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            activeView === 'following' ? 'text-rose-400' : 'text-zinc-400'
          }`}
        >
          <Heart className="h-4 w-4" />
          <span>Following</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('studio')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            activeView === 'studio' ? 'text-rose-400' : 'text-zinc-400'
          }`}
        >
          <Radio className="h-4 w-4" />
          <span>Studio</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('wallet')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            activeView === 'wallet' ? 'text-rose-400' : 'text-zinc-400'
          }`}
        >
          <Wallet className="h-4 w-4" />
          <span>Wallet</span>
        </button>
      </nav>
    </>
  );
}
