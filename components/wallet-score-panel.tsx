"use client";

import { useState } from "react";
import { useAccount, useChainId, useConnect, useDisconnect, useSignMessage, useSwitchChain } from "wagmi";
import { base } from "wagmi/chains";
import { shortAddress } from "@/lib/address";
import type { WalletSlot } from "@/lib/types";

type WalletScorePanelProps = {
  xUserId: string;
  xHandle: string;
  walletSlot: WalletSlot;
  title: string;
  description: string;
  verifiedWallet?: string | null;
};

export function WalletScorePanel({ xUserId, xHandle, walletSlot, title, description, verifiedWallet }: WalletScorePanelProps) {
  const { address, isConnected } = useAccount();
  const connectedAddress = address?.toLowerCase();
  const verifiedAddress = verifiedWallet?.toLowerCase();
  const isDifferentWallet = Boolean(connectedAddress && verifiedAddress && connectedAddress !== verifiedAddress);
  const canVerifyWallet = isConnected && (!verifiedWallet || isDifferentWallet);
  const chainId = useChainId();
  const { connect, connectors, isPending: connectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function refreshScoreAfterVerification() {
    setStatus(`${title} verified. Recalculating combined OG score...`);
    const response = await fetch("/api/score/refresh", { method: "POST" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Score refresh failed");
    setStatus(`Score and receipt refreshed: ${payload.score} points across ${payload.nftCount} NFT(s).`);
    window.location.reload();
  }

  async function verifyWallet() {
    if (!address) return;
    setBusy(true);
    setStatus("Waiting for wallet signature...");

    try {
      const message = [
        "OG-Block wallet slot verification",
        `Wallet slot: ${walletSlot}`,
        `X user id: ${xUserId}`,
        `X handle: ${xHandle}`,
        `Wallet: ${address}`,
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
        body: JSON.stringify({ address, chainId: base.id, walletSlot, message, signature })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Wallet verification failed");
      await refreshScoreAfterVerification();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Wallet verification failed");
    } finally {
      setBusy(false);
    }
  }

  async function refreshScore() {
    setBusy(true);
    setStatus("Refreshing combined OG score...");
    try {
      const response = await fetch("/api/score/refresh", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Score refresh failed");
      setStatus(`Score and receipt refreshed: ${payload.score} points across ${payload.nftCount} NFT(s).`);
      window.location.reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Score refresh failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm text-black/60">{description}</p>
          <p className="mt-1 text-sm text-black/60">
            {verifiedWallet
              ? `Verified: ${shortAddress(verifiedWallet)}${isDifferentWallet ? ` / Connected: ${shortAddress(address)}` : ""}`
              : address
                ? `Connected: ${shortAddress(address)}`
                : `Connect Base and sign to register your ${walletSlot} wallet.`}
          </p>
        </div>
        {isConnected ? (
          <button
            className="focus-ring rounded-md border border-black/15 px-4 py-2 text-sm font-semibold hover:bg-black/5"
            onClick={() => disconnect()}
            type="button"
          >
            Disconnect
          </button>
        ) : (
          <button
            className="focus-ring rounded-md bg-baseblue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={connectPending || connectors.length === 0}
            onClick={() => connect({ connector: connectors[0] })}
            type="button"
          >
            Connect wallet
          </button>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className={`focus-ring rounded-md px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${verifiedWallet ? "bg-baseblue text-white" : "bg-ink text-white"}`}
          disabled={!canVerifyWallet || busy}
          onClick={verifyWallet}
          type="button"
        >
          {isDifferentWallet ? `Change ${walletSlot} wallet` : verifiedWallet ? `${title} verified` : `Verify ${walletSlot} wallet`}
        </button>
        <button
          className="focus-ring rounded-md border border-black/15 px-4 py-2 text-sm font-semibold hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!verifiedWallet || busy}
          onClick={refreshScore}
          type="button"
        >
          Refresh score & minting readiness
        </button>
      </div>
      {status ? <p className="mt-3 text-sm text-black/65">{status}</p> : null}
    </div>
  );
}
