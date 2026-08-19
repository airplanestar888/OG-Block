import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicProfileByHandle } from "@/lib/public-profiles";
import { ShareProfileButton } from "@/components/share-profile-button";

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
  const initial = (cleanHandle || "?").charAt(0).toUpperCase();
  const avatarSrc = profile.xAvatar
    ? `/api/avatar-proxy?url=${encodeURIComponent(profile.xAvatar)}`
    : null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f8fb] px-4 py-12 text-ink">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(0,82,255,0.14),transparent_30%),linear-gradient(90deg,rgba(0,82,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(0,82,255,0.035)_1px,transparent_1px)] bg-[length:auto,42px_42px,42px_42px]" />

      <div className="relative mx-auto w-full max-w-[400px] space-y-6">
        {/* Culture score card */}
        <div className="relative flex flex-col overflow-hidden rounded-[1.5rem] border border-black/10 bg-[#0A0B0D] text-white shadow-sm">
          {/* Header */}
          <div className="relative overflow-hidden px-6 pb-6 pt-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(0,82,255,0.55),transparent_55%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,82,255,0.12)_1px,transparent_1px),linear-gradient(0deg,rgba(0,82,255,0.08)_1px,transparent_1px)] bg-[length:32px_32px]" />
            <div className="relative flex items-center gap-3.5">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt={cleanHandle}
                  className="size-16 shrink-0 rounded-full border-2 border-white/20 object-cover"
                />
              ) : (
                <div className="grid size-16 shrink-0 place-items-center rounded-full border-2 border-white/20 bg-white/10 text-2xl font-bold">
                  {initial}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-base font-semibold leading-tight">{displayName}</p>
                <p className="truncate text-sm text-white/55">@{cleanHandle}</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="relative space-y-5 px-6 pb-7 pt-2">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-white/40">
                  Culture score
                </p>
                <p className="mt-1 text-5xl font-bold leading-none tracking-tight">
                  {formatCompactNumber(profile.score)}
                </p>
              </div>
              {profile.rank ? (
                <span className="rounded-full bg-baseblue px-3 py-1.5 text-sm font-bold">
                  Rank #{profile.rank}
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-white/40">NFTs</p>
                <p className="mt-1 text-lg font-semibold">{profile.nftCount.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-white/40">Status</p>
                <p className="mt-1 text-lg font-semibold">{profile.isOg ? "OG" : "Member"}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-white/10 px-6 py-3.5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">OG BLOCK</p>
            <p className="text-xs text-white/35">Base culture score</p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
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
