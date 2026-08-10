import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "@/components/providers";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_APP_URL || "https://og-block.vercel.app"),
  title: "OG-Block",
  description: "Holder and agent profiles with verified Base wallets, NFT ownership, and public social rank.",
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png"
  },
  openGraph: {
    title: "OG-Block",
    description: "Own status. Prove culture. Verified Base wallets, NFT ownership, and public social rank.",
    url: "/",
    siteName: "OG-Block",
    images: [{ url: "/og-nft-grid.png", width: 1200, height: 630, alt: "OG-Block" }],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "OG-Block",
    description: "Own status. Prove culture. Verified Base wallets, NFT ownership, and public social rank.",
    images: ["/og-nft-grid.png"]
  },
  other: {
    "base:app_id": "6a794e61d198f685bc61e2b3",
    "talentapp:project_verification":
      "a6041dc10e471beb0bda44eb0f2a61f923302501a472f927d3961a8b171df1482f206ac5de3d4c57e167a23642210c2c5f4cb6aa6a7716827356e41691ece1c8"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <Providers>
          <SiteNav />
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
