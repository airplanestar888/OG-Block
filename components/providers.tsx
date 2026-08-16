"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { injected } from "@wagmi/core";
import { http, createConfig } from "wagmi";
import { walletConnect } from "wagmi/connectors";
import { base, baseSepolia } from "wagmi/chains";
import { WagmiProvider } from "wagmi";
import { useState } from "react";

const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    injected({ target: "metaMask", shimDisconnect: true }),
    injected({ target: "okxWallet", shimDisconnect: true }),
    injected({ target: "bitKeep", shimDisconnect: true }),
    injected({ target: "trust", shimDisconnect: true }),
    injected({ shimDisconnect: true }),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "",
      showQrModal: true
    })
  ],
  ssr: true,
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http()
  }
});

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
