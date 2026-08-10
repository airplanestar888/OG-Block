import { env } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizeXAvatarUrl } from "@/lib/auth";

type XUser = {
  id: string;
  username?: string;
  name?: string;
  profile_image_url?: string;
};

/// Fetch fresh profiles from the X API v2 for a batch of user ids (max 100).
/// Requires X_BEARER_TOKEN. Returns [] if the token is absent or the call fails.
async function fetchXUsers(userIds: string[]): Promise<XUser[]> {
  if (!env.X_BEARER_TOKEN || userIds.length === 0) return [];

  const url = new URL("https://api.twitter.com/2/users");
  url.searchParams.set("ids", userIds.slice(0, 100).join(","));
  url.searchParams.set("user.fields", "username,name,profile_image_url");

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${env.X_BEARER_TOKEN}` }
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: XUser[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}

/// Refresh stored x_handle / x_name / x_avatar for the given internal user ids.
/// No-op (returns 0) when X_BEARER_TOKEN is not configured.
export async function refreshXProfiles(userIds: string[]): Promise<number> {
  if (!env.X_BEARER_TOKEN || userIds.length === 0) return 0;

  const supabase = getSupabaseAdmin();

  // map internal id → x_user_id
  const { data: users } = await supabase
    .from("users")
    .select("id,x_user_id")
    .in("id", userIds);

  if (!users || users.length === 0) return 0;

  const xIdToInternal = new Map<string, string>();
  for (const u of users) xIdToInternal.set(u.x_user_id, u.id);

  const xUsers = await fetchXUsers([...xIdToInternal.keys()]);
  let updated = 0;

  for (const xu of xUsers) {
    const internalId = xIdToInternal.get(xu.id);
    if (!internalId) continue;

    const patch: Record<string, string> = {};
    if (xu.username) patch.x_handle = xu.username.toLowerCase();
    if (xu.name) patch.x_name = xu.name;
    const avatar = normalizeXAvatarUrl(xu.profile_image_url);
    if (avatar) patch.x_avatar = avatar;
    if (Object.keys(patch).length === 0) continue;

    const { error } = await supabase.from("users").update(patch).eq("id", internalId);
    if (!error) updated++;
  }

  return updated;
}
