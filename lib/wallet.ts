import type { Connector } from "wagmi";

const PRIORITY_CONNECTOR_IDS = ["metaMask", "okxWallet", "bitKeep", "trust"] as const;

const CONNECTOR_NAMES: Record<string, string> = {
  metaMask: "MetaMask",
  okxWallet: "OKX Wallet",
  bitKeep: "Bitget Wallet",
  trust: "Trust Wallet",
  walletConnect: "Mobile Wallet"
};

/// Provider flag on `window.ethereum` that signals a specific wallet is installed.
const PROVIDER_FLAGS: Record<string, string> = {
  metaMask: "isMetaMask",
  okxWallet: "isOkxWallet",
  bitKeep: "isBitKeep",
  trust: "isTrust"
};

export type ConnectWalletOption = {
  connector: Connector;
  id: string;
  name: string;
  detected: boolean;
};

/// Whether a specific injected wallet is actually installed, by checking the
/// wallet's dedicated flag on `window.ethereum` (e.g. `isMetaMask`). This avoids
/// false "detected" hits from a generic `window.ethereum` that isn't the target.
function isWalletInstalled(walletId: string): boolean {
  if (typeof window === "undefined") return false;
  const eth = window as unknown as { ethereum?: Record<string, unknown> };
  const flag = PROVIDER_FLAGS[walletId];
  if (!flag || !eth.ethereum) return false;
  return Boolean(eth.ethereum[flag]);
}

/// Detect available injected wallets + the WalletConnect connector for the
/// connect-wallet picker modal. Injected wallets are marked `detected` only if
/// their dedicated provider flag is present; WalletConnect is always offered
/// (QR handles pairing).
export async function getConnectWalletOptions(connectors: readonly Connector[]): Promise<ConnectWalletOption[]> {
  const options: ConnectWalletOption[] = [];

  // Injected wallets with specific targets (priority order).
  for (const id of PRIORITY_CONNECTOR_IDS) {
    const connector = connectors.find((item) => item.id === id);
    if (!connector) continue;
    options.push({
      connector,
      id,
      name: CONNECTOR_NAMES[id] || id,
      detected: isWalletInstalled(id)
    });
  }

  // Generic injected fallback — shown only if no specific injected wallet was detected.
  const fallbackConnector = connectors.find((item) => item.id === "injected");
  if (fallbackConnector) {
    const hasAnyInjected =
      typeof window !== "undefined" &&
      Boolean((window as unknown as { ethereum?: unknown }).ethereum);
    options.push({
      connector: fallbackConnector,
      id: "injected",
      name: "Browser wallet",
      detected: hasAnyInjected
    });
  }

  // WalletConnect (mobile/QR) — always offered.
  const wcConnector = connectors.find((item) => item.id === "walletConnect");
  if (wcConnector) {
    options.push({
      connector: wcConnector,
      id: "walletConnect",
      name: CONNECTOR_NAMES.walletConnect,
      detected: true
    });
  }

  return options;
}

/// Translate a raw wallet-connection error into a specific, actionable message.
export function describeConnectError(err: unknown, walletName?: string): string {
  const msg = err instanceof Error ? err.message : String(err);

  // "Provider not found" — the wallet extension isn't installed/enabled.
  if (/provider not found/i.test(msg)) {
    if (walletName) {
      return `${walletName} isn't detected in this browser. Install its extension, refresh, then try again — or pick "Mobile Wallet" to connect from your phone.`;
    }
    return "No wallet provider was found in this browser. Install a wallet extension (MetaMask, OKX, Bitget, or Trust), or use \"Mobile Wallet\" to connect from your phone.";
  }

  // User rejected the connection request.
  if (/user reject|rejected|denied|unauthorized/i.test(msg)) {
    return "Connection request was rejected. Approve the request in your wallet to continue.";
  }

  // WalletConnect pairing failures.
  if (/pairing|session proposal|wc session/i.test(msg)) {
    return "Couldn't pair with the mobile wallet. Make sure you scan the QR code from inside a wallet app that supports WalletConnect, then try again.";
  }

  return msg || "Connection failed. Try again, or use a different wallet.";
}

/// Pick the first browser wallet connector that is actually installed,
/// following a priority list (MetaMask → OKX → Bitget → Trust → any injected).
/// Returns null if no EVM wallet is detected.
export async function pickAvailableConnector(connectors: readonly Connector[]) {
  for (const id of PRIORITY_CONNECTOR_IDS) {
    const connector = connectors.find((item) => item.id === id);
    if (!connector) continue;
    try {
      const provider = await connector.getProvider();
      if (provider) return connector;
    } catch {
      continue;
    }
  }

  for (const connector of connectors) {
    if (connector.id === "injected") continue;
    if ((PRIORITY_CONNECTOR_IDS as readonly string[]).includes(connector.id)) continue;
    try {
      const provider = await connector.getProvider();
      if (provider) return connector;
    } catch {
      continue;
    }
  }

  const fallbackConnector = connectors.find((item) => item.id === "injected");
  if (!fallbackConnector) return null;

  try {
    const provider = await fallbackConnector.getProvider();
    return provider ? fallbackConnector : null;
  } catch {
    return fallbackConnector;
  }
}
