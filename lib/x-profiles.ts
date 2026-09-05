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

type FxUser = {
  screen_name?: string;
  name?: string;
  avatar_url?: string;
};

/// Fetch one profile via the FxTwitter public proxy (no key needed).
/// Returns null when the user is missing, protected, or the proxy fails.
async function fetchFxUser(handle: string): Promise<XUser | null> {
  try {
    const res = await fetch(`https://api.fxtwitter.com/${encodeURIComponent(handle)}`, {
      headers: { "User-Agent": "OG-BLOCK-avatar-heal/1.0" },
      signal: AbortSignal.timeout(12_000)
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { user?: FxUser };
    const u = json.user;
    if (!u || !u.screen_name) return null;
    return {
      // FxTwitter gives screen_name, not the numeric id — caller maps by handle.
      id: u.screen_name.toLowerCase(),
      username: u.screen_name,
      name: u.name,
      profile_image_url: u.avatar_url
    };
  } catch {
    return null;
  }
}

/// Refresh stored x_handle / x_name / x_avatar for the given internal user ids.
///
/// Primary path is the FxTwitter public proxy (no key, per-handle lookups).
/// The official X API v2 batch is the fallback when a bearer token exists.
/// Returns the number of rows actually updated.
export async function refreshXProfiles(userIds: string[]): Promise<number> {
  if (userIds.length === 0) return 0;

  const supabase = getSupabaseAdmin();

  // map internal id -> x_user_id + handle (FxTwitter resolves by handle)
  const { data: users } = await supabase
    .from("users")
    .select("id,x_user_id,x_handle")
    .in("id", userIds);

  if (!users || users.length === 0) return 0;

  type UserRow = { id: string; x_user_id: string; x_handle: string };
  const rows = users as UserRow[];
  const byHandle = new Map(rows.map((u) => [u.x_handle.toLowerCase(), u]));

  // Primary: FxTwitter, small pool so one slow lookup can't stall the cron tail.
  const fetched = new Map<string, XUser>();
  const queue = [...byHandle.keys()];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (queue.length > 0) {
        const handle = queue.shift();
        if (!handle) return;
        const xu = await fetchFxUser(handle);
        if (xu) fetched.set(handle, xu);
      }
    })
  );

  // Fallback: official X API batch for handles the proxy missed.
  const missing = rows.filter((u) => !fetched.has(u.x_handle.toLowerCase()));
  if (missing.length > 0 && env.X_BEARER_TOKEN) {
    const xIdToInternal = new Map(missing.map((u) => [u.x_user_id, u.id]));
    const batch = await fetchXUsers([...xIdToInternal.keys()]);
    for (const xu of batch) {
      const internalId = xIdToInternal.get(xu.id);
      if (!internalId) continue;
      const row = missing.find((u) => u.id === internalId);
      if (row) fetched.set(row.x_handle.toLowerCase(), xu);
    }
  }

  let updated = 0;
  for (const [handle, xu] of fetched) {
    const row = byHandle.get(handle);
    if (!row) continue;

    const patch: Record<string, string> = {};
    if (xu.username) patch.x_handle = xu.username.toLowerCase();
    if (xu.name) patch.x_name = xu.name;
    const avatar = normalizeXAvatarUrl(xu.profile_image_url);
    if (avatar) patch.x_avatar = avatar;
    if (Object.keys(patch).length === 0) continue;

    const { error } = await supabase.from("users").update(patch).eq("id", row.id);
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
/// longer resolves, refresh just those, and stamp the rest as checked.
/// Bounded by design (max ~30 HEAD checks + a small lookup pool per call) so
/// it safely fits in the tail of the refresh-scores cron without touching the
/// Vercel 270s kill. Returns counts for the cron summary.
export async function healStaleAvatars(limit = 30): Promise<{
  checked: number;
  refreshed: number;
  dead: number;
}> {
  const supabase = getSupabaseAdmin();
  const result = { checked: 0, refreshed: 0, dead: 0 };

  // avatar_checked_at may not exist yet if the migration hasn't been applied
  // (dashboard SQL). Fall back to unordered selection so the heal still runs.
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
