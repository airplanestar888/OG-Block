import type { Connector } from "wagmi";

const PRIORITY_CONNECTOR_IDS = ["metaMask", "okxWallet", "bitKeep", "trust"] as const;

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
