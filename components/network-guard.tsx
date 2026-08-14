"use client";

import { useEffect, useState } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";

type NetworkGuardProps = {
  targetChainId?: number;
};

export function NetworkGuard({ targetChainId = base.id }: NetworkGuardProps) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending } = useSwitchChain();
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const targetChain = targetChainId === baseSepolia.id ? baseSepolia : base;
  const isWrongChain = mounted && isConnected && chainId !== targetChain.id;

  // Auto-reset dismissal if chain changes
  useEffect(() => {
    setDismissed(false);
    setErrorMsg("");
  }, [chainId]);

  if (!isWrongChain || dismissed) return null;

  async function handleSwitch() {
    setErrorMsg("");
    try {
      await switchChainAsync({ chainId: targetChain.id });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to switch network in wallet");
    }
  }

  return (
    <div className="relative z-50 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-ink backdrop-blur-md">
      <div className="page-container flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2 font-medium text-amber-900">
          <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <span>
            <strong>Wrong Network:</strong> Your wallet is not connected to <strong>{targetChain.name}</strong>.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={handleSwitch}
            className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-[#0000FF] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#141CB5] disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
          >
            {isPending ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Switching…</span>
              </>
            ) : (
              <span>Switch to {targetChain.name}</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-full p-1 text-amber-800/60 hover:bg-amber-500/15 hover:text-amber-900"
            title="Dismiss notification"
            aria-label="Dismiss notification"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {errorMsg ? (
        <div className="page-container mt-1 text-[0.7rem] text-red-600">
          {errorMsg}
        </div>
      ) : null}
    </div>
  );
}
