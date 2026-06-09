import NextAuth, { type NextAuthConfig } from "next-auth";
import Twitter from "next-auth/providers/twitter";

function normalizeXAvatarUrl(url?: string | null) {
  if (!url) return undefined;
  return url.replace("_normal.", "_400x400.");
}

export const authConfig = {
  providers: [
    Twitter({
      clientId: process.env.X_CLIENT_ID,
      clientSecret: process.env.X_CLIENT_SECRET,
      profile(profile) {
        const data = profile.data || profile;

        return {
          id: data.id,
          name: data.name,
          email: null,
          image: normalizeXAvatarUrl(data.profile_image_url),
          username: data.username
        };
      }
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
          image?: string;
          profile_image_url?: string;
        };

        token.xUserId = xProfile.data?.id || xProfile.id || token.sub;
        token.xHandle = xProfile.data?.username || xProfile.username || xProfile.screen_name;
        token.xName = xProfile.data?.name || xProfile.name || token.name || undefined;
        token.xAvatar = normalizeXAvatarUrl(
          xProfile.data?.profile_image_url || xProfile.profile_image_url || xProfile.image || token.picture
        );
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
