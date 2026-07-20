import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignInButton } from "@/components/x-auth-buttons";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
      <section className="w-full rounded-lg border border-black/10 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-baseblue">Sign in</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">Your rank starts here.</h1>
        <p className="mt-3 text-sm leading-6 text-black/65">
          Sign in with X, verify your Base wallet, and your NFT holdings become a public culture score. One profile, one rank, ready to mint.
        </p>
        <div className="mt-6">
          <SignInButton />
        </div>
      </section>
    </main>
  );
}
