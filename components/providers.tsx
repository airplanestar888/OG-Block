"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { injected } from "@wagmi/core";
import { http, createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { WagmiProvider } from "wagmi";
import { useState } from "react";

const wagmiConfig = createConfig({
  chains: [base],
  connectors: [injected()],
  ssr: true,
  transports: {
    [base.id]: http()
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
