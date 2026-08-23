"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { WagmiProvider } from "wagmi";
import { base, baseSepolia } from "@reown/appkit/networks";
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { useState } from "react";

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://joinog.xyz";

const networks = [base, baseSepolia] as const;

const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [...networks],
  ssr: true
});

// One AppKit modal for the whole app: auto-detects installed extensions,
// shows mobile wallets with deep links, and falls back to a QR code — no
// per-wallet buttons and no hand-rolled connector list.
createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [...networks],
  defaultNetwork: base,
  metadata: {
    name: "OG BLOCK",
    description: "Turn your Base NFT holdings into a public culture score.",
    url: appUrl,
    icons: [`${appUrl}/icon.png`]
  },
  features: { analytics: false, email: false, socials: [] }
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </WagmiProvider>
    </SessionProvider>
  );
}
