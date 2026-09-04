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
    <main className="relative min-h-screen overflow-hidden bg-[#08070D] px-4 py-12 text-ink">
      {/* Black-violet-blue gradient backdrop — static, cheap, no WebGL */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(88,28,135,0.55),transparent_45%),radial-gradient(circle_at_85%_20%,rgba(0,0,255,0.35),transparent_40%),radial-gradient(circle_at_50%_110%,rgba(30,27,75,0.8),transparent_55%),linear-gradient(180deg,#0B0714_0%,#0A0B1E_55%,#05060F_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(139,92,246,0.07)_1px,transparent_1px),linear-gradient(0deg,rgba(0,0,255,0.06)_1px,transparent_1px)] bg-[length:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_85%)]" />

      <div className="relative mx-auto w-full max-w-[400px] space-y-6 md:max-w-[880px]">
        {/* ── Identity card — the shareable profile hero ── */}
        <section className="relative overflow-hidden rounded-[1.5rem] border border-black/[0.07] bg-white text-ink shadow-[0_1px_2px_rgba(10,11,13,0.04)]">
          {/* Identity header */}
          <div className="relative px-6 pb-6 pt-8 md:px-9 md:pt-9">
            <div className="absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 text-[0.68rem] font-bold text-ink md:right-9 md:top-9 md:text-sm">
              Verified on-chain
              <span className="grid size-4 place-items-center rounded-full bg-[#0000FF] text-[0.55rem] text-white md:size-5 md:text-[0.7rem]">✓</span>
            </div>
            <div className="flex items-center gap-3.5">
              <ProfileCardAvatar src={avatarSrc} handle={cleanHandle} />
              <div className="min-w-0">
                <p className="truncate text-base font-semibold leading-tight text-ink md:text-2xl">{displayName}</p>
                <p className="truncate text-sm text-black/50 md:text-base">@{cleanHandle}</p>
              </div>
            </div>
          </div>

          {/* Culture score (dominant) + Rank (secondary anchor) */}
          <div className="flex items-end justify-between gap-4 border-t border-black/[0.07] px-6 py-6 md:px-9 md:py-7">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-black/40">
                Culture score
              </p>
              <p className="mt-1 text-5xl font-bold leading-none tracking-tight text-ink md:text-7xl">
                {formatCompactNumber(profile.score)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-black/40">Rank</p>
              <p className="mt-1 text-2xl font-bold leading-none tracking-tight text-ink md:text-4xl">
                {profile.rank ? (
                  <>
                    <span className="text-[#0000FF]">#</span>
                    {profile.rank}
                  </>
                ) : (
                  <span className="text-black/30">—</span>
                )}
              </p>
            </div>
          </div>

          {/* Compact stat row — hairlines and whitespace, no nested cards */}
          <div className="grid grid-cols-2 gap-y-5 border-t border-black/[0.07] px-4 py-5 md:grid-cols-4 md:divide-x md:divide-black/[0.07] md:px-6">
            <StatCell label="NFTs" value={profile.nftCount.toLocaleString()} />
            <StatCell
              label="Status"
              value={profile.tier ? profile.tier : profile.isOg ? "OG" : "Member"}
            />
            <StatCell
              label="Rare"
              value={`${rarePct}%`}
              caption={`${profile.rareCount} of ${profile.nftCount}`}
            />
            <StatCell
              label="Early"
              value={`${earlyPct}%`}
              caption={`${profile.earlyCount} of ${profile.nftCount}`}
            />
          </div>

          {/* Footer strip */}
          <div className="flex items-center justify-between border-t border-black/[0.07] px-6 py-3.5 md:px-9">
            <div className="flex items-center gap-2">
              <span className="inline-block size-4 rounded-[5px] bg-[#0000FF]" />
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink">OG BLOCK</p>
            </div>
            <p className="text-xs text-black/35">Base culture score</p>
          </div>
        </section>

        {/* ── NFT overview — editorial data section, no nested cards ── */}
        {profile.contractBreakdown && profile.contractBreakdown.total > 0 ? (
          <section className="rounded-[1.5rem] border border-black/[0.07] bg-white px-6 py-6 text-ink md:px-9">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="text-sm font-semibold text-ink">NFT overview</h3>
              <p className="text-xs text-black/50">
                {profile.contractBreakdown.total.toLocaleString()} NFTs discovered
              </p>
            </div>
            <p className="mt-1 text-xs text-black/45">
              {profile.contractBreakdown.verified.toLocaleString()} verified
              <span className="mx-1.5 text-black/25" aria-hidden="true">·</span>
              {profile.contractBreakdown.unverified.toLocaleString()} unverified
              <span className="mx-1.5 text-black/25" aria-hidden="true">·</span>
              {profile.contractBreakdown.spam.toLocaleString()} spam
            </p>

            <div className="mt-5 grid grid-cols-3 divide-x divide-black/[0.07] border-t border-black/[0.07] pt-5">
              <OverviewStat
                dot="bg-emerald-500"
                label="Verified"
                value={profile.contractBreakdown.verified}
                caption="counted toward score"
              />
              <OverviewStat
                dot="bg-amber-500"
                label="Unverified"
                value={profile.contractBreakdown.unverified}
                caption="not counted"
              />
              <OverviewStat
                dot="bg-rose-500"
                label="Spam"
                value={profile.contractBreakdown.spam}
                caption="excluded"
              />
            </div>

            <p className="mt-5 text-center text-[0.68rem] leading-4 text-black/40">
              Only verified NFTs count toward your culture score — others shown for transparency.
            </p>
          </section>
        ) : null}

        {/* ── Actions — Share primary, badge secondary ── */}
        <div className="mx-auto flex w-full max-w-[520px] items-stretch gap-2.5">
          <ShareProfileButton handle={cleanHandle} score={profile.score} rank={profile.rank} />
          <Link href="/og-card" className="btn-secondary flex-1">
            Get your badge{" "}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}

/* Flat stat cell — the hairline dividers live on the parent grid. */
function StatCell({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return (
    <div className="text-center">
      <p className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-black/40">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink md:text-xl">{value}</p>
      {caption ? <p className="text-[0.6rem] text-black/35">{caption}</p> : null}
    </div>
  );
}

/* Overview figure — number first, tiny colored dot as the only color code. */
function OverviewStat({
  dot,
  label,
  value,
  caption
}: {
  dot: string;
  label: string;
  value: number;
  caption: string;
}) {
  return (
    <div className="px-2 text-center md:px-4">
      <p className="text-xl font-semibold text-ink md:text-2xl">{value.toLocaleString()}</p>
      <p className="mt-1 flex items-center justify-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-black/40">
        <span className={`inline-block size-1.5 rounded-full ${dot}`} aria-hidden="true" />
        {label}
      </p>
      <p className="text-[0.62rem] text-black/35">{caption}</p>
    </div>
  );
}
