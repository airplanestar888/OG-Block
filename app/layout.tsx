import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "OG-Block",
  description: "X identity, verified Base NFT ownership, and public social rank.",
  other: {
    "talentapp:project_verification":
      "a6041dc10e471beb0bda44eb0f2a61f923302501a472f927d3961a8b171df1482f206ac5de3d4c57e167a23642210c2c5f4cb6aa6a7716827356e41691ece1c8"
  }
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
