"use client";

import { signIn, signOut } from "next-auth/react";

export function SignInButton() {
  return (
    <button
      className="focus-ring rounded-md bg-ink px-3 py-2 font-medium text-white hover:bg-black"
      onClick={() => signIn("twitter", { callbackUrl: "/dashboard" })}
      type="button"
    >
      Log in with X
    </button>
  );
}

export function SignOutButton() {
  return (
    <button
      className="focus-ring rounded-md border border-black/15 px-3 py-2 font-medium hover:bg-black/5"
      onClick={() => signOut({ callbackUrl: "/" })}
      type="button"
    >
      Sign out
    </button>
  );
}
