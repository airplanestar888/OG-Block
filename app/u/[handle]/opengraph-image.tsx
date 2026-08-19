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
          background: "#0A0B0D",
          color: "#ffffff",
          padding: "72px",
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
        <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt=""
              width={140}
              height={140}
              style={{
                width: 140,
                height: 140,
                borderRadius: 9999,
                border: "4px solid rgba(255,255,255,0.2)",
                objectFit: "cover"
              }}
            />
          ) : (
            <div
              style={{
                width: 140,
                height: 140,
                borderRadius: 9999,
                border: "4px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 64,
                fontWeight: 700
              }}
            >
              {initial}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 48, fontWeight: 700 }}>{displayName}</span>
            <span style={{ fontSize: 30, color: "rgba(255,255,255,0.55)" }}>@{cleanHandle}</span>
          </div>
        </div>

        {/* Score */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: "64px" }}>
          <span
            style={{
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.4)"
            }}
          >
            Culture score
          </span>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "28px", marginTop: "8px" }}>
            <span style={{ fontSize: 190, fontWeight: 800, lineHeight: 1 }}>
              {formatCompactNumber(score)}
            </span>
            {rank ? (
              <span
                style={{
                  display: "flex",
                  background: "#0000FF",
                  borderRadius: 9999,
                  padding: "14px 32px",
                  fontSize: 40,
                  fontWeight: 700,
                  marginBottom: "28px"
                }}
              >
                Rank #{rank}
              </span>
            ) : null}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: "24px", marginTop: "auto" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              border: "2px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)",
              borderRadius: 20,
              padding: "24px 28px"
            }}
          >
            <span style={{ fontSize: 24, color: "rgba(255,255,255,0.4)", letterSpacing: 3 }}>NFTS</span>
            <span style={{ fontSize: 44, fontWeight: 700, marginTop: "6px" }}>
              {nftCount.toLocaleString()}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              border: "2px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)",
              borderRadius: 20,
              padding: "24px 28px"
            }}
          >
            <span style={{ fontSize: 24, color: "rgba(255,255,255,0.4)", letterSpacing: 3 }}>STATUS</span>
            <span style={{ fontSize: 44, fontWeight: 700, marginTop: "6px" }}>
              {isOg ? "OG" : "Member"}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "flex-end",
              flex: 1
            }}
          >
            <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: 5 }}>OG-BLOCK</span>
            <span style={{ fontSize: 22, color: "rgba(255,255,255,0.35)" }}>Base culture score</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
