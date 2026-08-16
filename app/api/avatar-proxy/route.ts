import { NextRequest, NextResponse } from "next/server";

// Same-origin proxy for cross-origin avatar images (e.g. X/CDN pbs.twimg.com),
// so client-side PNG capture (html-to-image) can embed the avatar without
// canvas tainting. Returns the raw image bytes with a long cache header.
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Unsupported scheme" }, { status: 400 });
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: { "user-agent": "og-block-avatar-proxy" },
      signal: AbortSignal.timeout(8_000)
    });

    if (!upstream.ok || !upstream.body) {
      return new NextResponse(null, { status: 404 });
    }

    const contentType = upstream.headers.get("content-type") || "image/*";
    const arrayBuffer = await upstream.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=86400, immutable",
        "access-control-allow-origin": "*"
      }
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
