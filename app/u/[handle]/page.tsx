import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicProfileByHandle } from "@/lib/public-profiles";
import { ShareProfileButton } from "@/components/share-profile-button";
import { ProfileCardAvatar } from "@/components/profile-card-avatar";

function formatCompactNumber(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (absValue >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return value.toLocaleString();
}

export async function generateMetadata(
  { params }: { params: Promise<{ handle: string }> }
): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getPublicProfileByHandle(handle).catch(() => null);

  if (!profile) {
    return {
      title: "Profile not found · OG BLOCK",
      description: "This OG BLOCK profile could not be found."
    };
  }

  const cleanHandle = profile.xHandle.replace(/^@/, "");
  const name = profile.xName || `@${cleanHandle}`;
  const title = `${name} · OG BLOCK`;
  const description = profile.rank
    ? `${formatCompactNumber(profile.score)} culture score · Rank #${profile.rank} · ${profile.nftCount} NFTs on OG BLOCK.`
    : `${formatCompactNumber(profile.score)} culture score · ${profile.nftCount} NFTs on OG BLOCK.`;
  const pageUrl = `/u/${cleanHandle}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "OG BLOCK",
      type: "profile"
    },
    twitter: {
      card: "summary_large_image",
      title,
      description
    }
  };
}

export default async function PublicProfilePage(
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;
  const profile = await getPublicProfileByHandle(handle).catch(() => null);

  if (!profile) notFound();

  const cleanHandle = profile.xHandle.replace(/^@/, "");
  const displayName = profile.xName || `@${cleanHandle}`;
  const avatarSrc = profile.xAvatar
    ? `/api/avatar-proxy?url=${encodeURIComponent(profile.xAvatar)}`
    : null;
  const rarePct = profile.nftCount > 0 ? Math.round((profile.rareCount / profile.nftCount) * 100) : 0;
  const earlyPct = profile.nftCount > 0 ? Math.round((profile.earlyCount / profile.nftCount) * 100) : 0;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f8fb] px-4 py-12 text-ink">
      {/* plain background — soft blue spotlight only */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,0,255,0.10),transparent_50%)]" />

      <div className="relative mx-auto w-full max-w-[400px] space-y-6 md:max-w-[880px]">
        {/* Culture score card — portrait on mobile, landscape on desktop */}
        <div className="relative flex flex-col overflow-hidden rounded-[1.5rem] border border-black/10 bg-white text-ink shadow-sm">
          {/* Header — thin gray grid + soft blue spotlight, like the X share card */}
          <div className="relative overflow-hidden px-6 pb-6 pt-8 md:px-9 md:pt-9">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(10,11,13,0.06)_1px,transparent_1px),linear-gradient(0deg,rgba(10,11,13,0.05)_1px,transparent_1px)] bg-[length:42px_42px]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_0%,rgba(0,0,255,0.12),transparent_55%)]" />
            <div className="absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 text-[0.68rem] font-bold text-ink md:right-9 md:top-9 md:text-sm">
              Verified on-chain
              <span className="grid size-4 place-items-center rounded-full bg-[#0000FF] text-[0.55rem] text-white md:size-5 md:text-[0.7rem]">✓</span>
            </div>
            <div className="relative flex items-center gap-3.5">
              <ProfileCardAvatar src={avatarSrc} handle={cleanHandle} />
              <div className="min-w-0">
                <p className="truncate text-base font-semibold leading-tight text-ink md:text-2xl">{displayName}</p>
                <p className="truncate text-sm text-black/50 md:text-base">@{cleanHandle}</p>
              </div>
            </div>
          </div>

          {/* Body — solid white */}
          <div className="relative space-y-5 bg-white px-6 pb-7 pt-6 md:px-9 md:pb-9 md:pt-7">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-black/40">
                  Culture score
                </p>
                <p className="mt-1 text-5xl font-bold leading-none tracking-tight text-ink md:text-7xl">
                  {formatCompactNumber(profile.score)}
                </p>
              </div>
              {profile.rank ? (
                <span className="rounded-full bg-[#0000FF] px-3 py-1.5 text-sm font-bold text-white md:px-5 md:py-2.5 md:text-lg">
                  Rank #{profile.rank}
                </span>
              ) : null}
            </div>

            {/* Stats — 2x2 on mobile, single row of 4 on desktop */}
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
              <div className="rounded-xl border border-black/10 bg-[#f7f8fb] p-3 md:p-4">
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-black/40">NFTs</p>
                <p className="mt-1 text-lg font-semibold text-ink md:text-2xl">{profile.nftCount.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-black/10 bg-[#f7f8fb] p-3 md:p-4">
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-black/40">Status</p>
                <p className="mt-1 text-lg font-semibold text-ink md:text-2xl">
                  {profile.tier ? profile.tier : profile.isOg ? "OG" : "Member"}
                </p>
              </div>
              <div className="rounded-xl border border-black/10 bg-[#f7f8fb] p-3 md:p-4">
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-black/40">Rare</p>
                <p className="mt-1 text-lg font-semibold text-ink md:text-2xl">{rarePct}%</p>
                <p className="text-[0.6rem] text-black/35">{profile.rareCount} of {profile.nftCount}</p>
              </div>
              <div className="rounded-xl border border-black/10 bg-[#f7f8fb] p-3 md:p-4">
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-black/40">Early</p>
                <p className="mt-1 text-lg font-semibold text-ink md:text-2xl">{earlyPct}%</p>
                <p className="text-[0.6rem] text-black/35">{profile.earlyCount} of {profile.nftCount}</p>
              </div>
            </div>
          </div>

          {/* Footer — solid white */}
          <div className="flex items-center justify-between border-t border-black/10 bg-white px-6 py-3.5 md:px-9">
            <div className="flex items-center gap-2">
              <span className="inline-block size-4 rounded-[5px] bg-[#0000FF]" />
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink">OG BLOCK</p>
            </div>
            <p className="text-xs text-black/35">Base culture score</p>
          </div>
        </div>

        {/* NFT overview — separate from OG card, durable wallet→NFT→registry→scoring */}
        {profile.contractBreakdown && profile.contractBreakdown.total > 0 ? (
          <div className="rounded-[1.5rem] border border-black/10 bg-white p-5 shadow-sm md:p-6">
            <h3 className="text-sm font-semibold text-ink">NFT overview</h3>
            <p className="mt-1 text-xs text-black/50">
              {profile.contractBreakdown.verified} of {profile.contractBreakdown.total} NFTs verified · {profile.nftCount} counted toward score
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2.5 text-center">
              <div className="rounded-xl border border-black/10 bg-[#f7f8fb] p-3">
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-black/40">Total</p>
                <p className="mt-1 text-xl font-semibold text-ink">{profile.contractBreakdown.total}</p>
                <p className="text-[0.65rem] text-black/40">NFTs</p>
              </div>
              <div className="rounded-xl border border-black/10 bg-[#f7f8fb] p-3">
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-black/40">Verified</p>
                <p className="mt-1 text-xl font-semibold text-ink">{profile.contractBreakdown.verified}</p>
                <p className="text-[0.65rem] text-black/40">counted</p>
              </div>
              <div className="rounded-xl border border-black/10 bg-[#f7f8fb] p-3">
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-black/40">Unverified</p>
                <p className="mt-1 text-xl font-semibold text-ink">{profile.contractBreakdown.unverified}</p>
                <p className="text-[0.65rem] text-black/40">not counted</p>
              </div>
              <div className="rounded-xl border border-black/10 bg-[#f7f8fb] p-3">
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-black/40">Spam</p>
                <p className="mt-1 text-xl font-semibold text-ink">{profile.contractBreakdown.spam}</p>
                <p className="text-[0.65rem] text-black/40">excluded</p>
              </div>
            </div>
            <p className="mt-3 text-center text-[0.68rem] leading-4 text-black/40">
              Only verified NFTs count toward your culture score — others shown for transparency.
            </p>
          </div>
        ) : null}

        {/* Actions */}
        <div className="space-y-2 md:mx-auto md:flex md:max-w-[520px] md:space-y-0 md:gap-3">
          <ShareProfileButton handle={cleanHandle} score={profile.score} rank={profile.rank} />
          <Link
            href="/"
            className="focus-ring inline-flex w-full items-center justify-center rounded-full border border-black/15 px-5 py-3 text-sm font-semibold text-black/70 transition hover:bg-black/5"
          >
            Get your own OG BLOCK card
          </Link>
        </div>
      </div>
    </main>
  );
}
