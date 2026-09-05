import type { Metadata } from "next";
import { Manrope, Orbitron, Syne } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const syne = Syne({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-syne" });
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" });
import { Providers } from "@/components/providers";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { NetworkGuard } from "@/components/network-guard";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_APP_URL || "https://joinog.xyz"),
  title: "OG BLOCK",
  description: "Holder and agent profiles with verified Base wallets, NFT ownership, and public social rank.",
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png"
  },
  openGraph: {
    title: "OG BLOCK",
    description: "Own status. Prove culture. Verified Base wallets, NFT ownership, and public social rank.",
    url: "/",
    siteName: "OG BLOCK",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "OG BLOCK",
    description: "Own status. Prove culture. Verified Base wallets, NFT ownership, and public social rank."
  },
  other: {
    "base:app_id": "6a794e61d198f685bc61e2b3",
    "talentapp:project_verification":
      "a6041dc10e471beb0bda44eb0f2a61f923302501a472f927d3961a8b171df1482f206ac5de3d4c57e167a23642210c2c5f4cb6aa6a7716827356e41691ece1c8",
    "virtual-protocol-site-verification": "bac08f6b99b440fbaae9976bc19fb3dc"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${manrope.variable} ${syne.variable} ${orbitron.variable}`}>
      <body className="flex min-h-screen flex-col antialiased" suppressHydrationWarning>
        <Providers>
          <SiteNav />
          <NetworkGuard />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
