"use client";

import { useEffect, useState } from "react";
import { useConnect } from "wagmi";
import { getConnectWalletOptions, describeConnectError, type ConnectWalletOption } from "@/lib/wallet";

type ConnectWalletModalProps = {
  open: boolean;
  onClose: () => void;
};

export function ConnectWalletModal({ open, onClose }: ConnectWalletModalProps) {
  const { connectors, connectAsync, isPending, error } = useConnect();
  const [options, setOptions] = useState<ConnectWalletOption[]>([]);
  const [connectError, setConnectError] = useState<string>("");
  const [failedWalletName, setFailedWalletName] = useState<string | undefined>();

  useEffect(() => {
    if (!open) return;
    setConnectError("");
    setFailedWalletName(undefined);
    let active = true;
    void getConnectWalletOptions(connectors).then((result) => {
      if (active) setOptions(result);
    });
    return () => {
      active = false;
    };
  }, [open, connectors]);

  // Body scroll lock + escape to close.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const wcProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;

  // Injected options that are actually installed — only these are clickable.
  const detectedInjected = options.filter((o) => o.id !== "injected" && o.id !== "walletConnect" && o.detected);
  const hasSpecificInjected = detectedInjected.length > 0;
  const genericInjected = options.find((o) => o.id === "injected");
  // Generic fallback shown only if a window.ethereum exists but no specific wallet matched.
  const showGeneric = !hasSpecificInjected && genericInjected?.detected;
  const wcOption = options.find((o) => o.id === "walletConnect");

  const visibleOptions: ConnectWalletOption[] = [
    ...detectedInjected,
    ...(showGeneric && genericInjected ? [genericInjected] : []),
    ...(wcOption && wcProjectId ? [wcOption] : [])
  ];

  async function handleSelect(option: ConnectWalletOption) {
    setConnectError("");
    setFailedWalletName(option.name);
    try {
      await connectAsync({ connector: option.connector });
      onClose();
    } catch (err) {
      setConnectError(describeConnectError(err, option.name));
    }
  }

  const displayError = connectError || (error ? describeConnectError(error, failedWalletName) : "");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-black/65 p-3.5 backdrop-blur-md sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-[400px] flex-col overflow-hidden rounded-[1.5rem] border border-black/10 bg-white shadow-2xl sm:rounded-[1.75rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="focus-ring absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/70 active:scale-95 sm:size-9"
          onClick={onClose}
          aria-label="Close"
          type="button"
        >
          ✕
        </button>

        <div className="space-y-5 px-6 py-7 sm:px-7">
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-baseblue">
              Connect wallet
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-ink">
              Choose how to connect
            </h2>
            <p className="text-sm leading-6 text-black/55">
              Use a browser extension, or scan a QR code from a mobile wallet app.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {visibleOptions.length === 0 ? (
              <p className="rounded-xl border border-black/10 bg-[#fbfcff] px-4 py-6 text-center text-sm text-black/55">
                Detecting available wallets…
              </p>
            ) : null}

            {visibleOptions.map((option) => {
              const isMobile = option.id === "walletConnect";
              return (
                <button
                  key={option.id}
                  className="focus-ring flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-[#fbfcff] px-4 py-3.5 text-left transition hover:border-baseblue/30 hover:bg-baseblue/[0.03] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => handleSelect(option)}
                  type="button"
                  disabled={isPending}
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-lg bg-baseblue/10 text-baseblue">
                      {isMobile ? (
                        <PhoneIcon className="size-5" />
                      ) : option.id === "injected" ? (
                        <GlobeIcon className="size-5" />
                      ) : (
                        <span className="text-sm font-bold">{option.name.charAt(0)}</span>
                      )}
                    </span>
                    <div>
                      <p className="text-xs italic text-ink">{option.name}</p>
                      {isMobile ? (
                        <p className="text-xs text-black/45">Connect from your phone</p>
                      ) : option.id === "injected" ? (
                        <p className="text-xs text-black/45">Browser extension</p>
                      ) : (
                        <p className="text-xs text-emerald-600">Detected</p>
                      )}
                    </div>
                  </div>
                  {isPending && failedWalletName === option.name ? (
                    <span className="size-4 animate-spin rounded-full border-2 border-black/15 border-t-baseblue" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {!hasSpecificInjected && !showGeneric ? (
            <p className="rounded-xl border border-black/10 bg-[#fbfcff] px-4 py-3 text-sm leading-6 text-black/55">
              No browser wallet extension detected. Install MetaMask, OKX, Bitget, or Trust Wallet to connect from this browser.
            </p>
          ) : null}

          {displayError ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
              {displayError}
            </p>
          ) : null}

          <p className="text-center text-xs text-black/40">
            By connecting you agree to sign a message verifying wallet ownership.
          </p>
        </div>
      </div>
    </div>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <line x1="11" y1="18.5" x2="13" y2="18.5" />
    </svg>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z" />
    </svg>
  );
}
