import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOrCreateCurrentUser } from "@/lib/users";

const profileRoleSchema = z.object({
  profileRole: z.enum(["human", "agent"])
});

export async function POST(request: NextRequest) {
  const user = await getOrCreateCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = profileRoleSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: "Invalid profile role" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .update({ profile_role: payload.data.profileRole })
    .eq("id", user.id)
    .select("profile_role")
    .single();

  if (error) throw error;

  return NextResponse.json({ profileRole: data.profile_role });
}
