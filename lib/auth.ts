import NextAuth, { type NextAuthConfig } from "next-auth";
import Twitter from "next-auth/providers/twitter";

export const authConfig = {
  providers: [
    Twitter({
      clientId: process.env.X_CLIENT_ID,
      clientSecret: process.env.X_CLIENT_SECRET
    })
  ],
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        const xProfile = profile as {
          data?: {
            id?: string;
            username?: string;
            name?: string;
            profile_image_url?: string;
          };
          id?: string;
          username?: string;
          screen_name?: string;
          name?: string;
          profile_image_url?: string;
        };

        token.xUserId = xProfile.data?.id || xProfile.id || token.sub;
        token.xHandle = xProfile.data?.username || xProfile.username || xProfile.screen_name;
        token.xName = xProfile.data?.name || xProfile.name || token.name || undefined;
        token.xAvatar = xProfile.data?.profile_image_url || xProfile.profile_image_url || token.picture || undefined;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.xUserId = token.xUserId as string | undefined;
      session.user.xHandle = token.xHandle as string | undefined;
      session.user.xName = token.xName as string | undefined;
      session.user.xAvatar = token.xAvatar as string | undefined;
      return session;
    }
  },
  pages: {
    signIn: "/login"
  },
  trustHost: true
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
