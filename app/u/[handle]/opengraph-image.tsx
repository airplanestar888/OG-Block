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

// Deterministic PRNG so each handle gets a stable particle layout.
function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const PARTICLE_COLORS = ["#0000FF", "#FF4B33", "#F5C518", "#3AD44B", "#FF9ECB", "#C2A878"];

// Build a decorative grid of squares/diamonds for the right side. Most cells
// are light gray; a seeded few are colored — Base-style pixel field.
function buildParticles(handle: string) {
  const rand = seeded(
    Array.from(handle).reduce((acc, ch) => acc + ch.charCodeAt(0), 7)
  );
  const cols = 9;
  const rows = 11;
  const cell = 52;
  const gap = 8;
  const originX = 640;
  const originY = 40;
  const cells: Array<{ x: number; y: number; size: number; color: string; diamond: boolean }> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const roll = rand();
      const colored = roll > 0.78;
      const size = 30;
      cells.push({
        x: originX + c * (cell + gap),
        y: originY + r * (cell + gap),
        size,
        color: colored ? PARTICLE_COLORS[Math.floor(rand() * PARTICLE_COLORS.length)] : "#ececf0",
        diamond: colored && rand() > 0.55
      });
    }
  }
  return cells;
}

export default async function Image({ params }: { params: { handle: string } }) {
  const profile = await getPublicProfileByHandle(params.handle).catch(() => null);

  const cleanHandle = (profile?.xHandle || params.handle).replace(/^@/, "");
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
  const particles = buildParticles(cleanHandle);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f7f7f4",
          color: "#0A0B0D",
          fontFamily: "sans-serif",
          position: "relative"
        }}
      >
        {/* Right-side decorative particle field */}
        {particles.map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              background: p.color,
              borderRadius: 6,
              transform: p.diamond ? "rotate(45deg)" : "none"
            }}
          />
        ))}

        {/* Avatar with thick ring, right-center */}
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt=""
            width={300}
            height={300}
            style={{
              position: "absolute",
              right: 96,
              top: 165,
              width: 300,
              height: 300,
              borderRadius: 9999,
              border: "10px solid #0A0B0D",
              objectFit: "cover"
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              right: 96,
              top: 165,
              width: 300,
              height: 300,
              borderRadius: 9999,
              border: "10px solid #0A0B0D",
              background: "#0000FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 120,
              fontWeight: 800,
              color: "#fff"
            }}
          >
            {initial}
          </div>
        )}

        {/* Left content column */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            width: 640,
            height: "100%",
            padding: "56px 56px 0 64px"
          }}
        >
          {/* Base-style wordmark */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "#0000FF" }} />
            <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1 }}>OG BLOCK</span>
          </div>

          {/* Headline */}
          <div style={{ display: "flex", marginTop: 70 }}>
            <span style={{ fontSize: 128, fontWeight: 800, letterSpacing: 4, lineHeight: 1 }}>
              I&apos;M OG
            </span>
          </div>

          {/* Score line */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 20, marginTop: 34 }}>
            <span style={{ fontSize: 84, fontWeight: 800, lineHeight: 1 }}>{formatCompactNumber(score)}</span>
            <span style={{ fontSize: 26, fontWeight: 700, color: "#0A0B0D99", marginBottom: 12 }}>
              culture score
            </span>
            {rank ? (
              <span
                style={{
                  display: "flex",
                  marginBottom: 10,
                  background: "#0000FF",
                  color: "#fff",
                  borderRadius: 9999,
                  padding: "10px 22px",
                  fontSize: 28,
                  fontWeight: 700
                }}
              >
                Rank #{rank}
              </span>
            ) : null}
          </div>

          {/* Stat chips */}
          <div style={{ display: "flex", gap: 12, marginTop: 30 }}>
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
                  border: "2px solid rgba(10,11,13,0.1)",
                  background: "#ffffff",
                  borderRadius: 14,
                  padding: "12px 16px"
                }}
              >
                <span style={{ fontSize: 15, color: "#0A0B0D66", letterSpacing: 2 }}>{cell.label}</span>
                <span style={{ fontSize: 28, fontWeight: 800, marginTop: 2 }}>{cell.value}</span>
              </div>
            ))}
          </div>

          {/* Handle pill, bottom-left */}
          <div style={{ display: "flex", marginTop: "auto", marginBottom: 46 }}>
            <span
              style={{
                background: "#0A0B0D",
                color: "#fff",
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: 1,
                padding: "12px 26px"
              }}
            >
              @{cleanHandle.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
