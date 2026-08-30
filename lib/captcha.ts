import crypto from "crypto";

/// Self-hosted captcha for the anonymous "Try yours" flow. Issues a signed
/// arithmetic challenge — no third-party keys, no storage. The token is an
/// HMAC-signed payload, so a correct answer cannot be forged without the
/// server secret, and stale tokens expire. Replay is harmless (the scored
/// wallet is public data) and abuse is capped by IP rate limits.
const CAPTCHA_TTL_MS = 10 * 60 * 1000;

function captchaSecret() {
  return process.env.NEXTAUTH_SECRET || "og-block-dev-captcha-secret";
}

function signPayload(payload: string) {
  return crypto.createHmac("sha256", captchaSecret()).update(payload).digest("base64url");
}

export type CaptchaChallenge = {
  question: string;
  token: string;
};

export function issueCaptchaChallenge(): CaptchaChallenge {
  const a = 2 + Math.floor(Math.random() * 9);
  const b = 1 + Math.floor(Math.random() * 9);
  const op = Math.random() < 0.5 ? "+" : "-";
  const x = Math.max(a, b);
  const y = Math.min(a, b);
  const answer = op === "+" ? x + y : x - y;
  const payload = Buffer.from(
    JSON.stringify({
      a: x,
      b: y,
      op,
      ts: Date.now(),
      n: crypto.randomBytes(6).toString("hex")
    })
  ).toString("base64url");

  return {
    question: `What is ${x} ${op} ${y}?`,
    token: `${payload}.${signPayload(payload)}`
  };
}

export function verifyCaptchaAnswer(token: string, answer: string): boolean {
  const [payload, signature] = (token || "").split(".");
  if (!payload || !signature) return false;

  const expected = Buffer.from(signPayload(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return false;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      a: number;
      b: number;
      op: string;
      ts: number;
    };
    if (!Number.isFinite(data.ts) || Date.now() - data.ts > CAPTCHA_TTL_MS) return false;
    const expectedAnswer = data.op === "+" ? data.a + data.b : data.a - data.b;
    return Number(answer) === expectedAnswer;
  } catch {
    return false;
  }
}
