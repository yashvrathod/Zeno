import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "./prisma";
import bcrypt from "bcryptjs";

function normalizeBaseUsername(input: string) {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  return base || "user";
}

async function ensureOAuthUsername(
  userId: string | undefined,
  email?: string | null,
  name?: string | null,
) {
  if (!userId) return;

  const seed = email?.split("@")[0] || name || "user";
  const base = normalizeBaseUsername(seed);

  // Try base, then base_#### up to a few attempts.
  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = attempt === 0 ? "" : `_${Math.floor(1000 + Math.random() * 9000)}`;
    const candidate = `${base}${suffix}`;

    const result = await prisma.user.updateMany({
      where: { id: userId, username: null },
      data: { username: candidate },
    });
    if (result.count > 0) return;
  }

  // Fallback: always unique.
  await prisma.user.updateMany({
    where: { id: userId, username: null },
    data: { username: `${base}_${userId.slice(-6)}` },
  });
}


declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      image?: string | null;
    } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Credentials provider requires JWT sessions in Auth.js / NextAuth v5.
  session: { strategy: "jwt" },

  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password,
        );

        if (!isPasswordValid) {
          return null;
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          image: user.image ?? user.avatar,
        };
      },
    }),
    // Google OAuth (optional)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    // GitHub OAuth (optional)
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [
          GitHub({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  events: {
    async signIn({ user, account }) {
      // Auto-generate username for OAuth sign-ins if missing.
      if (account?.provider && account.provider !== "credentials") {
        await ensureOAuthUsername(user.id, user.email ?? null, user.name ?? null);
      }
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      // `user` is available on initial sign-in.
      if (user) {
        token.id = user.id;
        token.username = (user as { username?: string }).username;
        token.image = (user as { image?: string | null }).image ?? null;
      }

      // Keep token.image in sync with DB so UI reflects profile edits without re-login.
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { image: true, avatar: true },
        });
        token.image = dbUser?.image ?? dbUser?.avatar ?? (token.image as string | null) ?? null;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = (token.username as string) ?? "";
        session.user.image = (token.image as string | null) ?? session.user.image ?? null;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});
