import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pbs.twimg.com"
      },
      {
        protocol: "https",
        hostname: "abs.twimg.com"
      }
    ]
  },
  outputFileTracingRoot: __dirname,
  reactStrictMode: true,
  // @metamask/sdk (transitive dep of @wagmi/connectors walletConnect) tries to
  // import @react-native-async-storage/async-storage which is not installed in
  // a Next.js browser build. Stub it out — we are web-only, not React Native.
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
      "react-native": false,
      "pino-pretty": false
    };
    return config;
  }
};

export default nextConfig;
