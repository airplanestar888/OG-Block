"use client";

import { useEffect, useState } from "react";
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { shortAddress } from "@/lib/address";
import { pickAvailableConnector } from "@/lib/wallet";
import { OgCardAbi } from "@/lib/og-card-abi";

const CARD_IMAGE = "/og-card.png";

// Base Builder attribution — appended to mint calldata so onchain activity
// is credited to our builder account (builder code bc_4va9iidy).
const BUILDER_DATA_SUFFIX = "0x62635f34766139696964790b0080218021802180218021802180218021" as `0x${string}`;

function chainForId(id: number) {
  return id === baseSepolia.id ? baseSepolia : base;
}
function explorerForId(id: number) {
  return id === baseSepolia.id ? "https://sepolia.basescan.org" : "https://basescan.org";
}

const MAX_SUPPLY = 1000;

function tierForNumber(n: number): string {
  if (n < 100) return "Genesis";
  if (n < 500) return "Early";
  return "Member";
}

type Claim = {
  id: string;
  wallet_address: string;
  claimed_at: string;
  token_id?: string | null;
  tier?: string | null;
  chain_id?: number | null;
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
  const [modalOpen, setModalOpen] = useState(false);
  const [mintedTokenId, setMintedTokenId] = useState<number | null>(null);

  // runtime config (DB-backed, editable in admin portal → no redeploy)
  const [contractAddress, setContractAddress] = useState<`0x${string}` | undefined>(undefined);
  const [targetChainId, setTargetChainId] = useState<number | undefined>(undefined);
  const [cardImage, setCardImage] = useState<string>("/api/og-card/image");
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/og-card/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.contractAddress) setContractAddress(data.contractAddress as `0x${string}`);
        if (data.chainId) setTargetChainId(Number(data.chainId));
        if (data.cardImageUrl) setCardImage("/api/og-card/image");
      })
      .catch(() => {})
      .finally(() => setConfigLoaded(true));
  }, []);

  const targetChain = targetChainId ? chainForId(targetChainId) : base;
  const explorer = explorerForId(targetChainId ?? base.id);
  const wrongChain = isConnected && targetChainId !== undefined && chainId !== targetChainId;

  // check on-chain claim
  const { data: hasClaimedOnChain, refetch: refetchOnChain } = useReadContract({
    address: contractAddress,
    abi: OgCardAbi,
    functionName: "hasClaimed",
    args: address ? [address] : undefined,
    chainId: targetChainId,
    query: { enabled: !!address && !!contractAddress && !!targetChainId }
  });

  // current supply → next token number + tier preview
  const { data: totalSupply } = useReadContract({
    address: contractAddress,
    abi: OgCardAbi,
    functionName: "totalSupply",
    chainId: targetChainId,
    query: { enabled: !!contractAddress && !!targetChainId }
  });

  // holder's token balance (to confirm ownership)
  const { data: ownedBalance } = useReadContract({
    address: contractAddress,
    abi: OgCardAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: targetChainId,
    query: { enabled: !!address && !!contractAddress && !!targetChainId }
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

  // after tx confirmed → record in Supabase + pop the success modal
  useEffect(() => {
    if (!txConfirmed || !address) return;
    setModalOpen(true);
    const body: Record<string, unknown> = { walletAddress: address };
    if (mintedTokenId !== null) {
      body.tokenId = String(mintedTokenId);
      body.tier = tierForNumber(mintedTokenId);
    }
    if (targetChainId) body.chainId = targetChainId;
    fetch("/api/og-card/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
      .then((r) => r.json())
      .then((data) => setClaim(data.claim))
      .catch(() => {})
      .finally(() => refetchOnChain());
  }, [txConfirmed, address, refetchOnChain, mintedTokenId, targetChainId]);

  // lock body scroll while the modal is open
  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  async function handleMint() {
    if (!contractAddress || !address || !targetChainId) return;
    setError("");
    // token id is assigned sequentially = current supply at mint time
    if (nextNumber !== undefined) setMintedTokenId(nextNumber);
    try {
      if (chainId !== targetChainId) {
        await switchChainAsync({ chainId: targetChainId });
      }
      writeContract({
        address: contractAddress,
        abi: OgCardAbi,
        functionName: "mint",
        chainId: targetChainId,
        dataSuffix: BUILDER_DATA_SUFFIX
      }, {
        onError: (err) => setError(err.message || "Mint failed")
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mint failed");
    }
  }

  if (status === "loading" || !mounted || !configLoaded) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-sm text-black/50">Loading…</p>
      </main>
    );
  }

  if (!session) return null;

  if (!contractAddress) {
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
  const soldOut = nextNumber !== undefined && nextNumber >= MAX_SUPPLY;
  const remaining = nextNumber !== undefined ? Math.max(MAX_SUPPLY - nextNumber, 0) : undefined;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f8fb] px-4 py-12 text-ink">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(0,82,255,0.14),transparent_30%),linear-gradient(90deg,rgba(0,82,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(0,82,255,0.035)_1px,transparent_1px)] bg-[length:auto,42px_42px,42px_42px]" />

      <div className="relative mx-auto max-w-2xl space-y-8">
      {/* header */}
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-baseblue">Exclusive</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
          Claim Your OG Card
        </h1>
        <p className="mt-2 text-sm leading-6 text-black/55">
          First OG Badge Genesis
        </p>
      </div>

      {/* card visual */}
      <div className="relative overflow-hidden rounded-[1.5rem] border border-black/10 bg-white p-6 shadow-sm sm:p-8">
        {/* card artwork */}
        <div className="relative mx-auto mb-6 aspect-square w-full max-w-sm overflow-hidden rounded-xl bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cardImage}
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
              className="size-14 rounded-full border border-black/10 object-cover"
            />
          ) : (
            <div className="grid size-14 place-items-center rounded-full bg-black/10 text-lg font-bold text-black/50">
              {userHandle.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-xs text-black/45">@{userHandle}</p>
            <p className="font-semibold text-ink">{userName}</p>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-3 text-center text-xs">
          <div className="rounded-lg border border-black/10 bg-[#f7f8fb] px-3 py-2.5">
            <p className="font-bold text-ink">
              {alreadyClaimed ? "OG" : nextNumber !== undefined ? `#${nextNumber}` : "OG"}
            </p>
            <p className="mt-0.5 text-black/45">{alreadyClaimed ? "Card Type" : "Token ID"}</p>
          </div>
          <div className="rounded-lg border border-black/10 bg-[#f7f8fb] px-3 py-2.5">
            <p className="font-bold text-ink">{previewTier ?? "—"}</p>
            <p className="mt-0.5 text-black/45">Tier</p>
          </div>
          <div className="rounded-lg border border-black/10 bg-[#f7f8fb] px-3 py-2.5">
            <p className="font-bold text-ink">
              {remaining !== undefined ? `${remaining}/${MAX_SUPPLY}` : `1 / ${MAX_SUPPLY}`}
            </p>
            <p className="mt-0.5 text-black/45">{remaining !== undefined ? "Remaining" : "Supply"}</p>
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
            href={`${explorer}/address/${contractAddress}`}
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
        ) : soldOut ? (
          <p className="text-center text-sm font-semibold text-black/70">Sold out — all {MAX_SUPPLY} OG Cards claimed.</p>
        ) : !isConnected ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-black/55">Connect your wallet to claim your OG Badge</p>
            <button
              className="focus-ring rounded-full bg-[#0000FF] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#141CB5]"
              onClick={async () => {
                const connector = await pickAvailableConnector(connectors);
                if (connector) {
                  connect({ connector });
                } else {
                  setError("No EVM wallet detected. Please install MetaMask, OKX, Bitget, or Trust Wallet.");
                }
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
                Wrong network. Minting will switch you to {targetChain.name}.
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
              href={`${explorer}/tx/${txHash}`}
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
      </div>

      {/* success modal — pops the NFT art when the mint confirms */}
      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-[1.5rem] border border-black/10 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="focus-ring absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full bg-black/40 text-white transition hover:bg-black/60"
              onClick={() => setModalOpen(false)}
              aria-label="Close"
              type="button"
            >
              ✕
            </button>

            {/* NFT art — same resource used for the on-chain image */}
            <div className="aspect-square w-full overflow-hidden bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={CARD_IMAGE} alt="OG Card" className="h-full w-full object-cover" />
            </div>

            <div className="space-y-3 p-6 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0000FF]">
                {txConfirmed ? "Minted" : "Minting"}
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-ink">
                OG Card{nextNumber !== undefined ? ` #${nextNumber}` : ""}
              </h2>
              <p className="text-sm leading-6 text-black/55">
                {txConfirmed
                  ? "Your OG Card is now on-chain. Welcome to the OG-Block network."
                  : "Confirming your mint on-chain…"}
              </p>

              <div className="flex flex-col gap-2 pt-2">
                {txHash ? (
                  <a
                    href={`${explorer}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring rounded-full bg-[#0000FF] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#141CB5]"
                  >
                    View transaction
                  </a>
                ) : null}
                <button
                  className="focus-ring rounded-full border border-black/15 px-6 py-3 text-sm font-semibold text-black/65 transition hover:bg-black/5"
                  onClick={() => setModalOpen(false)}
                  type="button"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
