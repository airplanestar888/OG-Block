import { NextRequest, NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import net from "node:net";
import { rateLimit } from "@/lib/rate-limit";

// Force Node.js runtime — we need node:dns / node:net for SSRF host resolution.
export const runtime = "nodejs";

// Only X/Twitter avatar CDNs are ever proxied. Any other host is rejected so
// this endpoint can't be turned into a generic server-side request forwarder.
const ALLOWED_HOSTS = new Set(["pbs.twimg.com", "abs.twimg.com"]);

// Max redirects we will manually follow (each hop is re-validated).
const MAX_REDIRECTS = 3;

function isAllowedHost(hostname: string): boolean {
  return ALLOWED_HOSTS.has(hostname.toLowerCase());
}

/**
 * Reject any address that resolves into a private, loopback, link-local, or
 * otherwise internal range. This is the core SSRF guard: even if a hostname is
 * allow-listed, we re-check where it actually points before connecting.
 */
function isPrivateAddress(ip: string): boolean {
  const type = net.isIP(ip);

  if (type === 4) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 0) return true; // 0.0.0.0/8 "this network"
    if (a === 127) return true; // loopback 127.0.0.0/8
    if (a === 10) return true; // private 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // private 172.16.0.0/12
    if (a === 192 && b === 168) return true; // private 192.168.0.0/16
    if (a === 169 && b === 254) return true; // link-local 169.254.0.0/16 (incl. cloud metadata 169.254.169.254)
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
    if (a >= 224) return true; // multicast/reserved 224.0.0.0/4 and up
    return false;
  }

  if (type === 6) {
    const normalized = ip.toLowerCase();

    // IPv4-mapped IPv6 (::ffff:a.b.c.d) — validate the embedded IPv4.
    const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);

    if (normalized === "::1" || normalized === "::") return true; // loopback / unspecified
    if (normalized.startsWith("fe80")) return true; // link-local fe80::/10
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // unique local fc00::/7
    if (normalized.startsWith("ff")) return true; // multicast ff00::/8
    return false;
  }

  // Not a parseable IP → treat as unsafe.
  return true;
}

/**
 * Validate a URL string: must be https to an allow-listed host that resolves
 * only to public addresses.
 */
async function validateUrl(
  raw: string
): Promise<{ ok: true; url: URL } | { ok: false; reason: string }> {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, reason: "Invalid url" };
  }

  // X avatar CDNs are always https; refusing http also blocks http-only
  // internal services.
  if (parsed.protocol !== "https:") {
    return { ok: false, reason: "Unsupported scheme" };
  }

  if (!isAllowedHost(parsed.hostname)) {
    return { ok: false, reason: "Host not allowed" };
  }

  // Resolve every address the host maps to and reject if ANY is internal —
  // this defeats DNS records that point an allow-listed name at a private IP.
  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(parsed.hostname, { all: true });
  } catch {
    return { ok: false, reason: "DNS resolution failed" };
  }

  if (addresses.length === 0) {
    return { ok: false, reason: "DNS resolution failed" };
  }

  for (const { address } of addresses) {
    if (isPrivateAddress(address)) {
      return { ok: false, reason: "Resolved to a private address" };
    }
  }

  return { ok: true, url: parsed };
}

// Same-origin proxy for cross-origin avatar images (e.g. X/CDN pbs.twimg.com),
// so client-side PNG capture (html-to-image) can embed the avatar without
// canvas tainting. Returns the raw image bytes with a long cache header.
export async function GET(request: NextRequest) {
  // Rate limit per client IP — this endpoint is unauthenticated, so cap abuse.
  const clientKey = `avatar-proxy:${request.headers.get("x-forwarded-for") || "local"}`;
  if (!rateLimit(clientKey, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  // Follow redirects manually so each hop is re-validated against the
  // allow-list and private-IP guard (auto-follow could bounce us elsewhere).
  let currentUrl = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const validated = await validateUrl(currentUrl);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.reason }, { status: 400 });
    }

    let upstream: Response;
    try {
      upstream = await fetch(validated.url.toString(), {
        headers: { "user-agent": "og-block-avatar-proxy" },
        redirect: "manual",
        signal: AbortSignal.timeout(8_000)
      });
    } catch {
      return new NextResponse(null, { status: 404 });
    }

    // Redirect → validate the Location target and loop.
    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get("location");
      if (!location) {
        return new NextResponse(null, { status: 404 });
      }
      // Resolve relative redirects against the current URL.
      currentUrl = new URL(location, validated.url).toString();
      continue;
    }

    if (!upstream.ok || !upstream.body) {
      return new NextResponse(null, { status: 404 });
    }

    const contentType = upstream.headers.get("content-type") || "image/*";
    // Defense in depth: only stream back actual images.
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Not an image" }, { status: 400 });
    }

    const arrayBuffer = await upstream.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=86400, immutable",
        "access-control-allow-origin": "*"
      }
    });
  }

  return NextResponse.json({ error: "Too many redirects" }, { status: 400 });
}
