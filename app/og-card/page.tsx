"use client";

import { useEffect, useState } from "react";
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { shortAddress } from "@/lib/address";
import { OgCardAbi } from "@/lib/og-card-abi";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_OG_CARD_CONTRACT as `0x${string}` | undefined;
// which chain the contract lives on — set to 84532 (Base Sepolia) for testnet, 8453 for mainnet
const TARGET_CHAIN_ID = Number(process.env.NEXT_PUBLIC_OG_CARD_CHAIN_ID ?? "8453");
const TARGET_CHAIN = TARGET_CHAIN_ID === baseSepolia.id ? baseSepolia : base;
const EXPLORER = TARGET_CHAIN_ID === baseSepolia.id ? "https://sepolia.basescan.org" : "https://basescan.org";
const CARD_IMAGE = "/og-card.png";

function tierForNumber(n: number): string {
  if (n < 100) return "Genesis";
  if (n < 1000) return "Early";
  return "Member";
}

type Claim = {
  id: string;
  wallet_address: string;
  claimed_at: string;
};

export default function OgCardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();

  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  const wrongChain = isConnected && chainId !== TARGET_CHAIN_ID;

  // check on-chain claim
  const { data: hasClaimedOnChain, refetch: refetchOnChain } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: OgCardAbi,
    functionName: "hasClaimed",
    args: address ? [address] : undefined,
    chainId: TARGET_CHAIN_ID,
    query: { enabled: !!address && !!CONTRACT_ADDRESS }
  });

  // current supply → next token number + tier preview
  const { data: totalSupply } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: OgCardAbi,
    functionName: "totalSupply",
    chainId: TARGET_CHAIN_ID,
    query: { enabled: !!CONTRACT_ADDRESS }
  });

  // holder's token balance (to confirm ownership)
  const { data: ownedBalance } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: OgCardAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: TARGET_CHAIN_ID,
    query: { enabled: !!address && !!CONTRACT_ADDRESS }
  });

  // mint tx
  const { writeContract, data: txHash, isPending: txPending } = useWriteContract();
  const { isLoading: txConfirming, isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const busy = txPending || txConfirming;

  useEffect(() => setMounted(true), []);

  // redirect if not logged in
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // fetch existing claim from DB
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/og-card/claim")
      .then((r) => r.json())
      .then((data) => setClaim(data.claim))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status]);

  // after tx confirmed → record in Supabase
  useEffect(() => {
    if (!txConfirmed || !address) return;
    fetch("/api/og-card/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: address })
    })
      .then((r) => r.json())
      .then((data) => setClaim(data.claim))
      .catch(() => {})
      .finally(() => refetchOnChain());
  }, [txConfirmed, address, refetchOnChain]);

  async function handleMint() {
    if (!CONTRACT_ADDRESS || !address) return;
    setError("");
    try {
      if (chainId !== TARGET_CHAIN_ID) {
        await switchChainAsync({ chainId: TARGET_CHAIN_ID });
      }
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: OgCardAbi,
        functionName: "mint",
        chainId: TARGET_CHAIN_ID
      }, {
        onError: (err) => setError(err.message || "Mint failed")
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mint failed");
    }
  }

  if (status === "loading" || !mounted) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-sm text-black/50">Loading…</p>
      </main>
    );
  }

  if (!session) return null;

  if (!CONTRACT_ADDRESS) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-sm text-red-600">OG Card contract not configured.</p>
      </main>
    );
  }

  const userHandle = session.user.xHandle ?? "og";
  const userName = session.user.xName ?? userHandle;
  const userAvatar = session.user.xAvatar;
  const alreadyClaimed = !!claim || !!hasClaimedOnChain;
  const nextNumber = totalSupply !== undefined ? Number(totalSupply) : undefined;
  const previewTier = nextNumber !== undefined ? tierForNumber(nextNumber) : undefined;

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-12">
      {/* header */}
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0000FF]">Exclusive</p>
        <h1
          className="mt-3 font-extrabold tracking-tight text-ink"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "clamp(2.4rem, 5vw, 3.6rem)",
            letterSpacing: "0.01em"
          }}
        >
          Claim Your OG Card
        </h1>
        <p className="mt-2 text-sm leading-6 text-black/55">
          One OG Card NFT per wallet. Metadata lives on-chain — this is a real ERC-721 on Base.
        </p>
      </div>

      {/* card visual */}
      <div className="relative overflow-hidden rounded-2xl border border-[#0000FF]/15 bg-gradient-to-br from-[#0000FF]/[0.04] to-white p-6 shadow-sm sm:p-8">
        <div className="absolute -right-10 -top-10 size-40 rounded-full bg-[#0000FF]/[0.06]" />
        <div className="absolute -bottom-8 -left-8 size-32 rounded-full bg-[#0000FF]/[0.04]" />

        {/* card artwork */}
        <div className="relative mx-auto mb-6 aspect-square w-full max-w-xs overflow-hidden rounded-xl border border-black/10 bg-[#050914]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={CARD_IMAGE}
            alt="OG Card"
            className="h-full w-full object-cover"
            onError={(e) => {
              // graceful fallback until final art is dropped into public/og-card.png
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>

        <div className="relative flex items-center gap-4">
          {userAvatar ? (
            <img
              src={userAvatar}
              alt=""
              className="size-14 rounded-full border-2 border-[#0000FF]/20 object-cover"
            />
          ) : (
            <div className="grid size-14 place-items-center rounded-full bg-[#0000FF] text-lg font-bold text-white">
              {userHandle.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-xs text-black/45">@{userHandle}</p>
            <p className="font-semibold text-ink">{userName}</p>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-3 text-center text-xs">
          <div className="rounded-lg border border-black/8 bg-white/60 px-3 py-2.5">
            <p className="font-bold text-ink">
              {alreadyClaimed ? "OG" : nextNumber !== undefined ? `#${nextNumber}` : "OG"}
            </p>
            <p className="mt-0.5 text-black/45">{alreadyClaimed ? "Card Type" : "Your Number"}</p>
          </div>
          <div className="rounded-lg border border-black/8 bg-white/60 px-3 py-2.5">
            <p className="font-bold text-ink">{previewTier ?? "—"}</p>
            <p className="mt-0.5 text-black/45">Tier</p>
          </div>
          <div className="rounded-lg border border-black/8 bg-white/60 px-3 py-2.5">
            <p className="font-bold text-ink">1 / 1</p>
            <p className="mt-0.5 text-black/45">Per Wallet</p>
          </div>
        </div>

        {alreadyClaimed && claim ? (
          <div className="relative mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-center">
            <p className="text-sm font-semibold text-green-700">
              ✓ Claimed{ownedBalance !== undefined && Number(ownedBalance) > 0 ? " · held on-chain" : ""}
            </p>
            <p className="mt-1 font-mono text-xs text-green-600/80">
              {shortAddress(claim.wallet_address) ?? claim.wallet_address}
            </p>
            <p className="mt-0.5 text-[0.65rem] text-green-600/60">
              {new Date(claim.claimed_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric"
              })}
            </p>
          </div>
        ) : null}

        <div className="relative mt-4 text-center">
          <a
            href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.65rem] text-[#0000FF]/60 underline decoration-dotted underline-offset-2 hover:text-[#0000FF]"
          >
            View contract on BaseScan →
          </a>
        </div>
      </div>

      {/* action area */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-center text-sm text-black/50">Checking claim status…</p>
        ) : alreadyClaimed ? (
          <p className="text-center text-sm text-black/55">You already claimed your OG Card.</p>
        ) : !isConnected ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-black/55">Connect your wallet to mint.</p>
            <button
              className="focus-ring rounded-full bg-[#0000FF] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#141CB5]"
              onClick={() => {
                const connector = connectors[0];
                if (connector) connect({ connector });
              }}
              type="button"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <div className="space-y-3 text-center">
            <p className="font-mono text-xs text-black/45">{shortAddress(address) ?? address}</p>
            {wrongChain ? (
              <p className="text-xs text-ember">
                Wrong network. Minting will switch you to {TARGET_CHAIN.name}.
              </p>
            ) : null}
            <div className="flex items-center justify-center gap-3">
              <button
                className="focus-ring rounded-full bg-[#0000FF] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#141CB5] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={busy}
                onClick={handleMint}
                type="button"
              >
                {txPending ? "Confirm in wallet…" : txConfirming ? "Minting…" : "Mint OG Card"}
              </button>
              <button
                className="focus-ring rounded-full border border-black/15 px-4 py-3 text-sm font-semibold text-black/60 transition hover:bg-black/5"
                onClick={() => disconnect()}
                type="button"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {txHash ? (
          <p className="text-center">
            <a
              href={`${EXPLORER}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#0000FF] underline decoration-dotted underline-offset-2 hover:text-[#141CB5]"
            >
              View transaction →
            </a>
          </p>
        ) : null}

        {txConfirmed && !claim ? (
          <p className="text-center text-sm text-black/50">Recording claim…</p>
        ) : null}

        {error ? (
          <p className="text-center text-sm text-red-600">{error}</p>
        ) : null}
      </div>
    </main>
  );
}
