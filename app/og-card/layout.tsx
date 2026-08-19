import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Claim Your OG Card | OG BLOCK",
  description: "Claim your Official OG Badge — a limited 1-of-1000 ERC-721 on Base. On-chain proof you were here first.",
  openGraph: {
    title: "Claim Your OG Card | OG BLOCK",
    description: "Claim your Official OG Badge — a limited 1-of-1000 ERC-721 on Base.",
    url: "/og-card",
    siteName: "OG BLOCK",
    images: [{ url: "/og-card.png", width: 1200, height: 1200, alt: "OG Card" }],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Claim Your OG Card | OG BLOCK",
    description: "Claim your Official OG Badge — a limited 1-of-1000 ERC-721 on Base.",
    images: ["/og-card.png"]
  }
};

export default function OgCardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
