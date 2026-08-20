import { ImageResponse } from "next/og";
import { getPublicProfileByHandle } from "@/lib/public-profiles";

export const runtime = "nodejs";
export const alt = "OG BLOCK culture score card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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

async function fetchAvatarDataUrl(url?: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "og-block-og-image" },
      signal: AbortSignal.timeout(5_000)
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: { handle: string } }) {
  const profile = await getPublicProfileByHandle(params.handle).catch(() => null);

  const cleanHandle = (profile?.xHandle || params.handle).replace(/^@/, "");
  const displayName = profile?.xName || `@${cleanHandle}`;
  const score = profile?.score ?? 0;
  const rank = profile?.rank ?? null;
  const nftCount = profile?.nftCount ?? 0;
  const isOg = Boolean(profile?.isOg);
  const tier = profile?.tier ?? null;
  const statusLabel = tier ? tier : isOg ? "OG" : "Member";
  const rareCount = profile?.rareCount ?? 0;
  const earlyCount = profile?.earlyCount ?? 0;
  const rarePct = nftCount > 0 ? Math.round((rareCount / nftCount) * 100) : 0;
  const earlyPct = nftCount > 0 ? Math.round((earlyCount / nftCount) * 100) : 0;
  const initial = (cleanHandle || "?").charAt(0).toUpperCase();
  const avatar = await fetchAvatarDataUrl(profile?.xAvatar);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0A0B0D",
          color: "#ffffff",
          padding: "64px",
          fontFamily: "sans-serif",
          position: "relative"
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "radial-gradient(circle at 25% 0%, rgba(0,0,255,0.55), transparent 55%)"
          }}
        />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt=""
              width={120}
              height={120}
              style={{
                width: 120,
                height: 120,
                borderRadius: 9999,
                border: "4px solid rgba(255,255,255,0.2)",
                objectFit: "cover"
              }}
            />
          ) : (
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: 9999,
                border: "4px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 56,
                fontWeight: 700
              }}
            >
              {initial}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 46, fontWeight: 700 }}>{displayName}</span>
            <span style={{ fontSize: 28, color: "rgba(255,255,255,0.55)" }}>@{cleanHandle}</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginLeft: "auto",
              gap: "10px",
              background: "rgba(45,212,191,0.15)",
              border: "2px solid rgba(45,212,191,0.35)",
              color: "#5eead4",
              borderRadius: 9999,
              padding: "12px 22px",
              fontSize: 24,
              fontWeight: 700
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="#5eead4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Verified on-chain
          </div>
        </div>

        {/* Score */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.4)"
            }}
          >
            Culture score
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "28px", marginTop: "6px" }}>
            <span style={{ fontSize: 128, fontWeight: 800, lineHeight: 1 }}>
              {formatCompactNumber(score)}
            </span>
            {rank ? (
              <span
                style={{
                  display: "flex",
                  background: "#0000FF",
                  borderRadius: 9999,
                  padding: "12px 28px",
                  fontSize: 34,
                  fontWeight: 700
                }}
              >
                Rank #{rank}
              </span>
            ) : null}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: "16px" }}>
          {[
            { label: "NFTS", value: nftCount.toLocaleString() },
            { label: "RARE", value: `${rarePct}%` },
            { label: "EARLY", value: `${earlyPct}%` },
            { label: "STATUS", value: statusLabel }
          ].map((cell) => (
            <div
              key={cell.label}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                border: "2px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
                borderRadius: 20,
                padding: "20px 24px"
              }}
            >
              <span style={{ fontSize: 20, color: "rgba(255,255,255,0.4)", letterSpacing: 3 }}>{cell.label}</span>
              <span style={{ fontSize: 38, fontWeight: 700, marginTop: "6px" }}>{cell.value}</span>
            </div>
          ))}
        </div>

        {/* Wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: 5 }}>OG BLOCK</span>
          <span style={{ fontSize: 22, color: "rgba(255,255,255,0.35)" }}>Base culture score</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
