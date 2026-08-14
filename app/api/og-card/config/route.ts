import { NextResponse } from "next/server";
import { getOgCardConfig, getAppImages } from "@/lib/app-config";

// Public: the OG Card page reads contract + chain + dynamic images at runtime from here,
// so changing the address or images in the admin portal needs no redeploy.
export async function GET() {
  const [config, images] = await Promise.all([getOgCardConfig(), getAppImages()]);
  return NextResponse.json({ ...config, ...images }, {
    headers: { "Cache-Control": "no-store" }
  });
}
