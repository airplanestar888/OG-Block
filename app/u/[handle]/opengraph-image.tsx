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

  // Thin gray line grid (matches the profile page background). Satori can't
  // tile a background gradient, so draw the lines as thin absolute divs.
  const GRID = 84;
  const lineColor = "rgba(10,11,13,0.06)";
  const vLines: number[] = [];
  for (let x = 0; x <= 1200; x += GRID) vLines.push(x);
  const hLines: number[] = [];
  for (let y = 0; y <= 630; y += GRID) hLines.push(y);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f7f7f4",
          color: "#0A0B0D",
          padding: "64px",
          fontFamily: "sans-serif",
          position: "relative"
        }}
      >
        {/* thin gray grid lines */}
        {vLines.map((x) => (
          <div
            key={`v${x}`}
            style={{ position: "absolute", left: x, top: 0, width: 1, height: 630, background: lineColor }}
          />
        ))}
        {hLines.map((y) => (
          <div
            key={`h${y}`}
            style={{ position: "absolute", left: 0, top: y, width: 1200, height: 1, background: lineColor }}
          />
        ))}

        {/* blue spotlight */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "radial-gradient(circle at 25% 0%, rgba(0,0,255,0.14), transparent 55%)"
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
                border: "8px solid #0A0B0D",
                objectFit: "cover"
              }}
            />
          ) : (
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: 9999,
                border: "8px solid #0A0B0D",
                background: "#0000FF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 56,
                fontWeight: 700,
                color: "#ffffff"
              }}
            >
              {initial}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 46, fontWeight: 700 }}>{displayName}</span>
            <span style={{ fontSize: 28, color: "rgba(10,11,13,0.5)" }}>@{cleanHandle}</span>
          </div>
          {/* Verified on-chain — right aligned, text then blue circle check */}
          <div style={{ display: "flex", alignItems: "center", marginLeft: "auto", gap: "12px" }}>
            <span style={{ fontSize: 26, fontWeight: 700, color: "#0A0B0D" }}>Verified on-chain</span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 42,
                height: 42,
                borderRadius: 9999,
                background: "#0000FF"
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
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
              color: "rgba(10,11,13,0.4)"
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
                  color: "#ffffff",
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
                border: "2px solid rgba(10,11,13,0.1)",
                background: "#ffffff",
                borderRadius: 20,
                padding: "20px 24px"
              }}
            >
              <span style={{ fontSize: 20, color: "rgba(10,11,13,0.4)", letterSpacing: 3 }}>{cell.label}</span>
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
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: "#0000FF" }} />
            <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: 3 }}>OG BLOCK</span>
          </div>
          <span style={{ fontSize: 22, color: "rgba(10,11,13,0.35)" }}>Base culture score</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
