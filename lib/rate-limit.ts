const buckets = new Map<string, number[]>();

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
