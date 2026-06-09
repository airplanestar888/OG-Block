import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type AppUser = {
  id: string;
  x_user_id: string;
  x_handle: string;
  x_name: string | null;
  x_avatar: string | null;
};

export async function getOrCreateCurrentUser(): Promise<AppUser | null> {
  const session = await auth();
  const xUserId = session?.user.xUserId;
  const xHandle = session?.user.xHandle;

  if (!xUserId || !xHandle) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        x_user_id: xUserId,
        x_handle: xHandle.toLowerCase(),
        x_name: session.user.xName || session.user.name || null,
        x_avatar: session.user.xAvatar || session.user.image || null
      },
      { onConflict: "x_user_id" }
    )
    .select("id,x_user_id,x_handle,x_name,x_avatar")
    .single();

  if (error) throw error;
  return data;
}
