import { NextResponse } from "next/server";
import { getAppImages } from "@/lib/app-config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import fs from "fs";
import path from "path";

// Cache the rendered image at the edge for a long time so BaseScan/OpenSea
// image crawlers (which time out after a few seconds) almost always hit a
// fast cached response instead of triggering an 8s cold Supabase fetch.
export const revalidate = 3600;

function parseSupabaseStorageUrl(url: string): { bucket: string; path: string } | null {
  try {
    const match = url.match(/\/storage\/v1\/object\/(?:sign|public|authenticated)\/([^/?#]+)\/([^?#]+)/i);
    if (match && match[1] && match[2]) {
      return {
        bucket: decodeURIComponent(match[1]),
        path: decodeURIComponent(match[2])
      };
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Secure Server Gateway / Image Proxy for OG Card NFT
 *
 * External users / OpenSea / Wallets request: /api/og-card/image
 * Server resolves the secret image from Supabase Storage (via Service Role SDK or URL)
 * and streams the binary image directly.
 *
 * Secrets, Supabase storage paths, and buckets are NEVER exposed to the public client.
 */
export async function GET() {
  try {
    const { cardImageUrl } = await getAppImages();

    // Fast path: if the configured image is a PUBLIC Supabase (or any public)
    // URL, redirect to it. The CDN serves the small optimized image directly —
    // far faster than re-streaming through this function, and BaseScan/OpenSea
    // crawlers follow the redirect. No secret to hide for a public bucket.
    if (cardImageUrl && cardImageUrl.includes("/storage/v1/object/public/")) {
      return NextResponse.redirect(cardImageUrl, { status: 308 });
    }

    if (cardImageUrl && cardImageUrl.startsWith("http")) {
      // 1. Try direct Supabase Storage SDK download using Service Role Key (most secure & reliable)
      const parsedStorage = parseSupabaseStorageUrl(cardImageUrl);
      if (parsedStorage) {
        try {
          const supabase = getSupabaseAdmin();
          const { data: blob, error: downloadError } = await supabase.storage
            .from(parsedStorage.bucket)
            .download(parsedStorage.path);

          if (blob && !downloadError) {
            const buffer = await blob.arrayBuffer();
            const contentType = blob.type || "image/png";

            return new NextResponse(buffer, {
              headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=1209600"
              }
            });
          }
        } catch (sdkError) {
          console.warn("Supabase SDK storage download error, falling back to HTTP fetch:", sdkError);
        }
      }

      // 2. Fallback: HTTP fetch with browser headers
      try {
        const response = await fetch(cardImageUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Cache-Control": "no-cache"
          }
        });

        if (response.ok) {
          const contentType = response.headers.get("content-type") || "image/png";
          const buffer = await response.arrayBuffer();

          return new NextResponse(buffer, {
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=1209600"
            }
          });
        }
      } catch (fetchError) {
        console.warn("HTTP fetch error for card image:", fetchError);
      }
    }

    // 3. Fallback: Read local static file from disk
    const localFilePath = path.join(process.cwd(), "public", "og-card.png");
    if (fs.existsSync(localFilePath)) {
      const fileBuffer = fs.readFileSync(localFilePath);
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=1209600"
        }
      });
    }

    return new NextResponse("Image not found", { status: 404 });
  } catch (error) {
    console.error("Error serving secure OG Card image:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
