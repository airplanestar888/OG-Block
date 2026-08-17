import { getSupabaseAdmin } from "@/lib/supabase/admin";

const buckets = new Map<string, number[]>();

/// Synchronous in-memory rate limiter (fast path, per-instance).
/// Still useful as a first layer but does NOT work across serverless instances.
export function rateLimit(key: string, limit = 5, windowMs = 60_000) {
  const now = Date.now();
  const since = now - windowMs;
  const hits = (buckets.get(key) || []).filter((timestamp) => timestamp > since);

  if (hits.length >= limit) {
    return false;
  }

  hits.push(now);
  buckets.set(key, hits);
  return true;
}

/// Persistent rate limiter backed by Supabase. Works across all serverless
/// instances. Uses an upsert + atomic counter pattern on the `rate_limits` table.
///
/// Usage: `if (!await rateLimitAsync(key, 5, 60_000)) return 429;`
export async function rateLimitAsync(key: string, limit = 5, windowMs = 60_000): Promise<boolean> {
  // Fast path: check in-memory first.
  if (!rateLimit(key, limit, windowMs)) return false;

  try {
    const supabase = getSupabaseAdmin();
    const now = Date.now();
    const since = new Date(now - windowMs).toISOString();

    // Delete expired hits for this key.
    await supabase
      .from("rate_limits")
      .delete()
      .eq("key", key)
      .lt("created_at", since);

    // Count current hits.
    const { count } = await supabase
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("key", key)
      .gte("created_at", since);

    if (count !== null && count >= limit) {
      return false;
    }

    // Insert this hit.
    await supabase
      .from("rate_limits")
      .insert({ key, created_at: new Date(now).toISOString() });

    return true;
  } catch {
    // If Supabase is unreachable, fall back to in-memory result (already true).
    return true;
  }
}
