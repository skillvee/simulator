import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/server/db";
import type { UserRole } from "@prisma/client";

interface ExtendedSessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role?: UserRole;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
    error: "/auth-error",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string, deletedAt: null },
        });

        if (!user?.password) return null;

        const valid = await compare(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Allow relative URLs
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      // Allow URLs on the same origin
      if (url.startsWith(baseUrl)) {
        return url;
      }
      // Default to home for external URLs (security: prevents open redirect attacks)
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string, deletedAt: null },
          select: {
            id: true,
            role: true,
            name: true,
            email: true,
            image: true,
          },
        });

        if (dbUser) {
          const extendedUser = session.user as ExtendedSessionUser;
          extendedUser.id = dbUser.id;
          extendedUser.role = dbUser.role;
          if (dbUser.name) extendedUser.name = dbUser.name;
          if (dbUser.email) extendedUser.email = dbUser.email;
          if (dbUser.image) extendedUser.image = dbUser.image;
        }
      }
      return session;
    },
  },
  events: {
    createUser: async ({ user }) => {
      await db.user.update({
        where: { id: user.id },
        data: {
          role: "USER",
        },
      });
    },
  },
});
