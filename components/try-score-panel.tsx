"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { shortAddress } from "@/lib/address";
import { TryScoreModal, type TryScoreResult } from "@/components/try-score-modal";

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

type TryScorePanelProps = {
  isLoggedIn: boolean;
};

export function TryScorePanel({ isLoggedIn }: TryScorePanelProps) {
  const { address: connectedAddress, isConnected } = useAccount();
  const [walletInput, setWalletInput] = useState("");
  const [captcha, setCaptcha] = useState<{ question: string; token: string } | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const loadChallenge = useCallback(async () => {
    setCaptchaAnswer("");
    try {
      const res = await fetch("/api/try-score");
      if (!res.ok) throw new Error("Could not load the captcha question");
      setCaptcha(await res.json());
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not load the captcha question");
    }
  }, []);

  useEffect(() => {
    void loadChallenge();
  }, [loadChallenge]);

  const runScan = useCallback(
    async (signal: AbortSignal): Promise<TryScoreResult> => {
      const response = await fetch("/api/try-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({
          address: walletInput.trim(),
          captchaToken: captcha?.token ?? "",
          captchaAnswer
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (payload?.challenge) setCaptcha(payload.challenge);
      if (!response.ok) {
        throw new Error(payload?.error || "Could not score this wallet");
      }
      return payload as TryScoreResult;
    },
    [walletInput, captcha, captchaAnswer]
  );

  const handleSubmit = () => {
    const address = walletInput.trim();
    if (!ADDRESS_PATTERN.test(address)) {
      setStatus("Enter a valid EVM wallet address (0x followed by 40 hex characters).");
      return;
    }
    if (!captchaAnswer.trim()) {
      setStatus("Answer the captcha question first.");
      return;
    }
    setStatus("");
    setBusy(true);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setBusy(false);
    // A used challenge should not be reusable — rotate it for the next try.
    void loadChallenge();
  };

  return (
    <section className="w-full rounded-lg border border-black/10 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-baseblue">
        Try yours
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
        Check any wallet&apos;s score. No sign-in.
      </h1>
      <p className="mt-3 text-sm leading-6 text-black/70">
        Paste a Base wallet address and see the culture score it would earn from its NFT
        holdings. Nothing is stored — sign in with X only when you want your rank on the
        public leaderboard or want to claim badges.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label
            className="text-xs font-bold uppercase tracking-[0.14em] text-black/45"
            htmlFor="try-wallet-address"
          >
            Wallet address
          </label>
          <input
            id="try-wallet-address"
            className="focus-ring mt-2 w-full rounded-xl border border-black/15 bg-white px-4 py-3 font-mono text-sm text-ink placeholder:text-black/30"
            onChange={(e) => setWalletInput(e.target.value)}
            placeholder="0x…"
            spellCheck={false}
            type="text"
            value={walletInput}
          />
          {isConnected && connectedAddress ? (
            <button
              className="focus-ring mt-2 text-xs font-semibold text-baseblue hover:underline"
              onClick={() => setWalletInput(connectedAddress)}
              type="button"
            >
              Use connected wallet ({shortAddress(connectedAddress)})
            </button>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-end sm:justify-between">
          <button
            className="focus-ring rounded-full bg-baseblue px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy}
            onClick={handleSubmit}
            type="button"
          >
            See my score
          </button>

          <div>
            <label
              className="text-xs font-bold uppercase tracking-[0.14em] text-black/45"
              htmlFor="try-captcha-answer"
            >
              Quick check: {captcha?.question ?? "loading…"}
            </label>
            <div className="mt-2 flex items-center gap-2">
              <input
                id="try-captcha-answer"
                className="focus-ring w-24 rounded-xl border border-black/15 bg-white px-4 py-3 text-sm text-ink"
                inputMode="numeric"
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                placeholder="Answer"
                type="text"
                value={captchaAnswer}
              />
              <button
                className="focus-ring grid size-11 shrink-0 place-items-center rounded-full bg-ink text-white transition hover:bg-black active:scale-95"
                onClick={() => void loadChallenge()}
                type="button"
                aria-label="New question"
                title="New question"
              >
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  aria-hidden="true"
                >
                  <polyline
                    points="23 4 23 10 17 10"
                    stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                  />
                  <path
                    d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"
                    stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {status ? <p className="text-sm text-red-600">{status}</p> : null}

        <p className="text-xs leading-5 text-black/45">
          By continuing you agree to the{" "}
          <a className="underline hover:text-black/65" href="/terms">Terms</a> and{" "}
          <a className="underline hover:text-black/65" href="/privacy">Privacy Policy</a>.
        </p>
      </div>

      <TryScoreModal
        open={modalOpen}
        onClose={handleModalClose}
        isLoggedIn={isLoggedIn}
        runScan={runScan}
      />
    </section>
  );
}
