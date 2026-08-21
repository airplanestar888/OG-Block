import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "OG BLOCK — Base culture score";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Platform-level share card (used when joinog.xyz is shared without a profile).
export default function Image() {
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
          justifyContent: "center",
          alignItems: "flex-start",
          background: "#f7f7f4",
          color: "#0A0B0D",
          padding: "80px",
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
            background: "radial-gradient(circle at 25% 0%, rgba(0,0,255,0.16), transparent 55%)"
          }}
        />

        {/* wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 14, background: "#0000FF" }} />
          <span style={{ fontSize: 60, fontWeight: 800, letterSpacing: 2 }}>OG BLOCK</span>
        </div>

        {/* headline — two explicit lines */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 40 }}>
          <span style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.08 }}>Own status.</span>
          <span style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.08 }}>Prove culture.</span>
        </div>

        {/* subline */}
        <span style={{ fontSize: 32, color: "rgba(10,11,13,0.55)", marginTop: 30, maxWidth: 880 }}>
          Turn your Base NFT holdings into a public culture score and rank.
        </span>

        {/* url pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 44,
            background: "#0A0B0D",
            color: "#ffffff",
            fontSize: 30,
            fontWeight: 700,
            lineHeight: 1,
            padding: "12px 30px 18px",
            borderRadius: 9999
          }}
        >
          joinog.xyz
        </div>
      </div>
    ),
    { ...size }
  );
}
