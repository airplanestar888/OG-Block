import { NextResponse } from "next/server";
import { getOgCardConfig } from "@/lib/app-config";

// Public: the OG Card page reads contract + chain at runtime from here,
// so changing the address in the admin portal needs no redeploy.
export async function GET() {
  const config = await getOgCardConfig();
  return NextResponse.json(config, {
    headers: { "Cache-Control": "no-store" }
  });
}
