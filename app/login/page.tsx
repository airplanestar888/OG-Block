import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignInButton } from "@/components/x-auth-buttons";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
      <section className="w-full rounded-lg border border-black/10 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-baseblue">Register</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">Start with X, then verify your wallet.</h1>
        <p className="mt-3 text-sm leading-6 text-black/65">
          One X account becomes one OG-Block profile. Verify a main wallet first, then add an optional agent wallet for combined OG scoring and future minting.
        </p>
        <div className="mt-6">
          <SignInButton />
        </div>
      </section>
    </main>
  );
}
