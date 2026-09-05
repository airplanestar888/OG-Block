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
      headers: { Authorization: `Bearer ${env.X_BEARER_TOKEN}` },
      signal: AbortSignal.timeout(15_000)
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

  // map internal id -> x_user_id
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

type AvatarRow = {
  id: string;
  x_user_id: string;
  x_avatar: string | null;
};

/// Self-heal stale avatars: pick the oldest-checked users whose avatar URL no
/// longer resolves, refresh just those via the X API, and stamp the rest as
/// checked. Bounded by design (max ~30 HEAD checks + 1 X batch per call) so it
/// safely fits in the tail of the refresh-scores cron without touching the
/// Vercel 270s kill. Returns counts for the cron summary.
export async function healStaleAvatars(limit = 30): Promise<{
  checked: number;
  refreshed: number;
  dead: number;
}> {
  const supabase = getSupabaseAdmin();
  const result = { checked: 0, refreshed: 0, dead: 0 };

  // avatar_checked_at may not exist yet if the migration hasn't been applied
  // (dashboard SQL). Fall back to created_at ordering so the heal still runs.
  let rows: AvatarRow[] = [];
  const ordered = await supabase
    .from("users")
    .select("id,x_user_id,x_avatar")
    .order("avatar_checked_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (!ordered.error) {
    rows = ((ordered.data || []) as AvatarRow[]).filter((r) => r.x_avatar);
  } else {
    const fallback = await supabase
      .from("users")
      .select("id,x_user_id,x_avatar")
      .limit(limit);
    if (fallback.error) return result;
    rows = ((fallback.data || []) as AvatarRow[]).filter((r) => r.x_avatar);
  }
  if (rows.length === 0) return result;
  result.checked = rows.length;

  async function isAlive(url: string): Promise<boolean> {
    try {
      const res = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        signal: AbortSignal.timeout(8_000)
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // Small pool so one slow image host can't stall the cron tail.
  const alive = new Array<boolean>(rows.length).fill(true);
  const queue = rows.map((row, i) => ({ row, i }));
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) return;
        alive[item.i] = await isAlive(item.row.x_avatar as string);
      }
    })
  );

  const deadIds = rows.filter((_, i) => !alive[i]).map((r) => r.id);
  result.dead = deadIds.length;

  const now = new Date().toISOString();
  // Stamp everything we looked at — dead or alive — so the cursor advances.
  // Best-effort: ignored when the avatar_checked_at migration hasn't landed yet.
  await supabase.from("users").update({ avatar_checked_at: now }).in("id", rows.map((r) => r.id)).then(
    () => {},
    () => {}
  );

  if (deadIds.length > 0) {
    result.refreshed = await refreshXProfiles(deadIds);
  }

  return result;
}
