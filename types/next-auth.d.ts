import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      xUserId?: string;
      xHandle?: string;
      xName?: string;
      xAvatar?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    xUserId?: string;
    xHandle?: string;
    xName?: string;
    xAvatar?: string;
  }
}
