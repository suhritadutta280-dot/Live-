import { Check, Copy, Download, Smartphone, X } from 'lucide-react';
import { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (isInstalled) {
    return null;
  }

  async function handleClick() {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) return;
    }
    setShowGuide(true);
  }

  async function handleCopyUrl() {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopiedUrl(true);
      window.setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      setCopiedUrl(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-[var(--lq-surface)] px-2.5 py-1 text-[11px] font-medium text-zinc-200 transition-colors hover:border-rose-500/60 hover:text-white whitespace-nowrap"
      >
        <Download className="h-3.5 w-3.5 text-rose-400" />
        <span>Install App</span>
      </button>

      {showGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-xl border border-[var(--lq-border)] bg-[var(--lq-surface)] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-600/15 text-rose-400">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 id="pwa-install-title" className="font-display text-base font-bold text-zinc-50">
                    Install LiveQueen on Your Phone
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Add to Home Screen without APK or GitHub
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install guide"
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="mt-4 space-y-2 text-xs leading-relaxed text-zinc-300">
                <li>1. Open this app link directly in Safari on iPhone or iPad.</li>
                <li>2. Tap the <strong className="text-zinc-100">Share</strong> button in Safari&apos;s toolbar.</li>
                <li>3. Scroll down and tap <strong className="text-zinc-100">Add to Home Screen</strong>.</li>
              </ol>
            ) : (
              <ol className="mt-4 space-y-2 text-xs leading-relaxed text-zinc-300">
                <li>1. Open the app URL directly in <strong className="text-zinc-100">Google Chrome</strong> on Android (not inside an embedded preview frame).</li>
                <li>2. Tap Chrome&apos;s <strong className="text-zinc-100">⋮ Menu</strong> at the top-right corner.</li>
                <li>3. Select <strong className="text-zinc-100">Install app</strong> or <strong className="text-zinc-100">Add to Home screen</strong>.</li>
              </ol>
            )}

            <div className="mt-4 flex items-center gap-2 rounded-lg border border-zinc-800 bg-[var(--lq-bg)] px-3 py-2">
              <span className="flex-1 truncate font-mono text-[11px] text-zinc-400">
                {typeof window !== 'undefined' ? window.location.origin : ''}
              </span>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-200 hover:bg-zinc-700 whitespace-nowrap"
              >
                {copiedUrl ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full rounded-lg bg-rose-600 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-rose-500"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
