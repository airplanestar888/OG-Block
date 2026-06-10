import { auth } from "@/lib/auth";
import { SiteNavClient } from "@/components/site-nav-client";

export async function SiteNav() {
  const session = await auth();
  return <SiteNavClient isLoggedIn={!!session} />;
}
