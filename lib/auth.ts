import { MongoDBAdapter } from "@auth/mongodb-adapter";
import type { NextAuthOptions, DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import { mongoClientPromise } from "@/lib/mongodb";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(mongoClientPromise),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_ID ?? "",
      clientSecret: process.env.GOOGLE_SECRET ?? "",
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = (user as any).id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.uid) {
        (session.user as any).id = token.uid as string;
      }
      return session;
    },
  },
};
