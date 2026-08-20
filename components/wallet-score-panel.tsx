"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount, useChainId, useConnect, useDisconnect, useSignMessage, useSwitchChain } from "wagmi";
import { base } from "wagmi/chains";
import { shortAddress } from "@/lib/address";
import type { WalletSlot } from "@/lib/types";
import { ScoreRevealModal } from "@/components/score-reveal-modal";
import { ConnectWalletModal } from "@/components/connect-wallet-modal";

type RevealResult = {
  score: number;
  rank: number | null;
  nftCount: number;
  isOg: boolean;
  tier: string | null;
};

type WalletScorePanelProps = {
  xUserId: string;
  xHandle: string;
  xName: string | null;
  xAvatar: string | null;
  walletSlot: WalletSlot;
  title: string;
  description: string;
  verifiedWallet?: string | null;
  allowBrowserConnect?: boolean;
};

export function WalletScorePanel({
  xUserId,
  xHandle,
  xName,
  xAvatar,
  walletSlot,
  title,
  description,
  verifiedWallet,
  allowBrowserConnect = true
}: WalletScorePanelProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { isPending: connectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [prefetchedResult, setPrefetchedResult] = useState<RevealResult | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const browserWalletReady = mounted && isConnected;
  const browserWalletAddress = mounted ? address : undefined;

  function openRevealModal() {
    setPrefetchedResult(null);
    setRevealOpen(true);
  }

  async function verifyWallet() {
    if (!allowBrowserConnect || !address) return;
    setBusy(true);
    setStatus("Waiting for wallet signature...");

    try {
      const nonceRes = await fetch("/api/wallet/nonce");
      if (!nonceRes.ok) throw new Error("Could not get verification nonce");
      const { nonce } = await nonceRes.json();

      const message = [
        "OG BLOCK wallet slot verification",
        `Wallet slot: ${walletSlot}`,
        `X user id: ${xUserId}`,
        `X handle: ${xHandle}`,
        `Wallet: ${address}`,
        `Nonce: ${nonce}`,
        `Timestamp: ${new Date().toISOString()}`
      ].join("\n");
      if (chainId !== base.id) {
        setStatus("Switching to Base...");
        await switchChainAsync({ chainId: base.id });
      }
      const signature = await signMessageAsync({ message });
      const response = await fetch("/api/wallet/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, chainId: base.id, walletSlot, message, signature, nonce })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Wallet verification failed");
      setStatus("Wallet verified. Generating your score card...");
      openRevealModal();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Wallet verification failed");
    } finally {
      setBusy(false);
    }
  }

  async function disconnectVerifiedWallet() {
    setBusy(true);
    setStatus(`Disconnecting ${walletSlot} wallet...`);

    try {
      const response = await fetch("/api/wallet/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletSlot })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Wallet disconnect failed");
      if (allowBrowserConnect && isConnected) disconnect();
      setStatus(`${title} disconnected. Combined OG score updated to ${payload.score}.`);
      window.location.reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Wallet disconnect failed");
    } finally {
      setBusy(false);
    }
  }

  async function refreshScore() {
    setBusy(true);
    try {
      openRevealModal();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-ink">{title}</h2>
            {verifiedWallet ? (
              <span className="rounded-full bg-baseblue/10 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.08em] text-baseblue">
                Verified
              </span>
            ) : (
              <span className="rounded-full bg-black/[0.05] px-2.5 py-1 text-xs font-bold uppercase tracking-[0.08em] text-black/45">
                Not connected
              </span>
            )}
          </div>
          <p className="mt-2 max-w-xl text-sm leading-6 text-black/60">{description}</p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-black/10 bg-[#fbfcff] p-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/40">
          {verifiedWallet ? "Verified wallet" : allowBrowserConnect ? "Wallet setup" : "Agent setup"}
        </p>
        {verifiedWallet ? (
          <p className="mt-2 font-mono text-sm font-semibold text-ink">{shortAddress(verifiedWallet)}</p>
        ) : allowBrowserConnect ? (
          <p className="mt-2 text-sm leading-6 text-black/65">
            {browserWalletAddress ? `Connected browser wallet: ${shortAddress(browserWalletAddress)}. Sign once to verify it as your wallet.` : "Connect a Base-capable EVM wallet, then sign once to verify it."}
          </p>
        ) : (
          <p className="mt-2 text-sm leading-6 text-black/65">
            Agent wallet must be verified from the agent flow or console. Browser wallet connect is disabled for this slot.
            <Link className="ml-1 font-semibold text-baseblue hover:underline" href="/agent-guide">
              View agent guide
            </Link>
          </p>
        )}
      </div>

      {allowBrowserConnect && !verifiedWallet && browserWalletReady && chainId !== base.id ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-medium">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Wrong Network: Your wallet is not on Base Mainnet.</span>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              try {
                setStatus("Switching network to Base...");
                await switchChainAsync({ chainId: base.id });
                setStatus("Switched to Base.");
              } catch (err) {
                setStatus(err instanceof Error ? err.message : "Network switch failed");
              }
            }}
            className="focus-ring rounded-full bg-[#0000FF] px-3.5 py-1 text-xs font-semibold text-white hover:bg-[#141CB5]"
          >
            Switch to Base
          </button>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {allowBrowserConnect && !verifiedWallet && !browserWalletReady ? (
          <button
            className="focus-ring rounded-full bg-baseblue px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!mounted || connectPending || busy}
            onClick={() => setConnectOpen(true)}
            type="button"
          >
            Connect wallet
          </button>
        ) : null}

        {allowBrowserConnect && !verifiedWallet && browserWalletReady ? (
          <>
            {chainId === base.id ? (
              <button
                className="focus-ring rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                disabled={busy}
                onClick={verifyWallet}
                type="button"
              >
                Verify wallet
              </button>
            ) : (
              <button
                className="focus-ring rounded-full bg-[#0000FF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#141CB5] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={busy}
                onClick={async () => {
                  try {
                    setStatus("Switching network to Base...");
                    await switchChainAsync({ chainId: base.id });
                    setStatus("Switched to Base. You can now verify your wallet.");
                  } catch (err) {
                    setStatus(err instanceof Error ? err.message : "Network switch failed");
                  }
                }}
                type="button"
              >
                Switch to Base & Verify
              </button>
            )}
            <button
              className="focus-ring rounded-full border border-black/15 px-4 py-2.5 text-sm font-semibold text-black/65 hover:bg-black/5"
              onClick={() => disconnect()}
              type="button"
            >
              Disconnect browser
            </button>
          </>
        ) : null}

        {verifiedWallet ? (
          <>
            <button
              className="focus-ring rounded-full border border-black/15 px-4 py-2.5 text-sm font-semibold text-black/70 hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy}
              onClick={refreshScore}
              type="button"
            >
              Refresh score
            </button>
            <button
              className="focus-ring rounded-full border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy}
              onClick={disconnectVerifiedWallet}
              type="button"
            >
              Disconnect wallet
            </button>
          </>
        ) : null}
      </div>

      {status ? <p className="mt-3 text-sm text-black/65">{status}</p> : null}

      <ConnectWalletModal open={connectOpen} onClose={() => setConnectOpen(false)} />

      <ScoreRevealModal
        open={revealOpen}
        onClose={() => {
          setRevealOpen(false);
          setPrefetchedResult(null);
        }}
        xHandle={xHandle}
        xName={xName}
        xAvatar={xAvatar}
        prefetchedResult={prefetchedResult}
      />
    </div>
  );
}
