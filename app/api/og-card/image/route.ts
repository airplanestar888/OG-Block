import { NextResponse } from "next/server";
import { getAppImages } from "@/lib/app-config";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * Secure Server Gateway / Image Proxy for OG Card NFT
 *
 * External users / OpenSea / Wallets request: /api/og-card/image
 * Server resolves the secret image URL from Supabase Database (or local fallback)
 * and streams the binary image directly.
 *
 * Secrets, Supabase storage paths, and buckets are NEVER exposed to the public client.
 */
export async function GET() {
  try {
    const { cardImageUrl } = await getAppImages();

    // If configured as a remote URL (e.g. Supabase Storage), stream from server-side
    if (cardImageUrl && cardImageUrl.startsWith("http")) {
      const response = await fetch(cardImageUrl, {
        headers: { "Cache-Control": "no-cache" }
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type") || "image/png";
        const buffer = await response.arrayBuffer();

        return new NextResponse(buffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
          }
        });
      }
    }

    // Fallback: Read local static file from disk
    const localFilePath = path.join(process.cwd(), "public", "og-card.png");
    if (fs.existsSync(localFilePath)) {
      const fileBuffer = fs.readFileSync(localFilePath);
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
        }
      });
    }

    return new NextResponse("Image not found", { status: 404 });
  } catch (error) {
    console.error("Error serving secure OG Card image:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
