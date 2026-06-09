import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Base Culture Score",
  description: "X identity, verified Base NFT ownership, and public social rank."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>
          <SiteNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
