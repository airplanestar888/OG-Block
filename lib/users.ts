import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type ProfileRole = "human" | "agent";

export type AppUser = {
  id: string;
  x_user_id: string;
  x_handle: string;
  x_name: string | null;
  x_avatar: string | null;
  profile_role: ProfileRole;
};

export async function getOrCreateCurrentUser(): Promise<AppUser | null> {
  const session = await auth();
  const xUserId = session?.user.xUserId;
  const xHandle = session?.user.xHandle;

  if (!xUserId || !xHandle) return null;

  const supabase = getSupabaseAdmin();
  const profile = {
    x_handle: xHandle.toLowerCase(),
    x_name: session.user.xName || session.user.name || null,
    x_avatar: session.user.xAvatar || session.user.image || null
  };

  const { data: existing, error: existingError } = await supabase
    .from("users")
    .select("id")
    .eq("x_user_id", xUserId)
    .maybeSingle();

  if (existingError) throw existingError;

  const query = existing
    ? supabase.from("users").update(profile).eq("id", existing.id)
    : supabase.from("users").insert({ x_user_id: xUserId, ...profile });

  const { data, error } = await query.select("id,x_user_id,x_handle,x_name,x_avatar,profile_role").single();

  if (error) throw error;
  return data;
}
