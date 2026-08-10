import { auth } from "@/lib/auth";
import { isAdminHandle } from "@/lib/admin";
import { SiteNavClient } from "@/components/site-nav-client";

export async function SiteNav() {
  const session = await auth();
  const isAdmin = isAdminHandle(session?.user?.xHandle);
  return <SiteNavClient isLoggedIn={!!session} isAdmin={isAdmin} />;
}
