import { auth } from "@/lib/auth";
import { TryScorePanel } from "@/components/try-score-panel";

export const metadata = {
  title: "Try yours — OG BLOCK",
  description:
    "Check any Base wallet's culture score from its NFT holdings — no sign-in needed."
};

export default async function TryPage() {
  const session = await auth();

  return (
    <main className="page-container flex min-h-[70vh] items-center py-10 sm:py-14">
      <TryScorePanel isLoggedIn={!!session} />
    </main>
  );
}
