import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { parseAdminEmailsFromEnv } from "@/lib/admin/env";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim();
        const password = credentials?.password;
        const demoEmail = process.env.AUTH_DEMO_EMAIL?.trim();
        const demoPassword = process.env.AUTH_DEMO_PASSWORD;

        if (!email || !password || !demoEmail || !demoPassword) {
          return null;
        }
        if (email !== demoEmail || password !== demoPassword) {
          return null;
        }

        let user = await prisma.user.upsert({
          where: { email },
          create: { email, name: "Demo User" },
          update: {},
        });

        const adminEmails = parseAdminEmailsFromEnv();
        if (adminEmails.has(email.toLowerCase()) && user.role !== "ADMIN") {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { role: "ADMIN" },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
        token.email = user.email ?? undefined;
        if ("role" in user && user.role) {
          token.role = user.role;
        }
      } else if (token.userId && typeof token.userId === "string") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.userId },
          select: { role: true, email: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.email = dbUser.email;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.email = token.email ?? null;
        if (token.role) {
          session.user.role = token.role;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
