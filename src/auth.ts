import NextAuth, { type NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
import { getServerSession } from "next-auth";

import { env } from "~/env";

export const authOptions: NextAuthOptions = {
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
};

const handler = NextAuth(authOptions);

export const auth = () => getServerSession(authOptions);
export { handler as GET, handler as POST };
