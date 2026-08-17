/// Server-only initialization hook — runs once when the Node.js server starts.
/// Enforces environment validation before any request is served.
/// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  // Only run on the server (not in the edge build).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertServerEnv } = await import("./lib/env");
    assertServerEnv();
  }
}
