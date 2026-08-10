import { env } from "@/lib/env";
import type { AppUser } from "@/lib/users";

/// Returns true if the given X handle is configured as an admin (ADMIN_X_HANDLES).
export function isAdminHandle(handle?: string | null): boolean {
  if (!handle) return false;
  return env.ADMIN_X_HANDLES.includes(handle.toLowerCase());
}

/// Convenience for an AppUser row (x_handle is stored lowercased).
export function isAdminUser(user?: Pick<AppUser, "x_handle"> | null): boolean {
  return isAdminHandle(user?.x_handle);
}
