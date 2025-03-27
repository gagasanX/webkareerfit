// lib/auth/auth.ts
import { NextAuthOptions } from "next-auth";
import { DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
// For bcrypt you'll need to install the package:
// npm install bcrypt
// npm install @types/bcrypt --save-dev
import * as bcryptModule from "bcrypt";

// Workaround for bcrypt in case it's not available
// (for development purposes only, should be replaced with real bcrypt in production)
const compare = async (data: string, hash: string) => {
  try {
    if (bcryptModule && typeof bcryptModule.compare === 'function') {
      return await bcryptModule.compare(data, hash);
    } else {
      // Simple fallback for development (NOT SECURE)
      console.warn("Bcrypt not available, using insecure fallback");
      return data === hash;
    }
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
};

import { prisma } from "@/lib/db";

// Extend Session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isAdmin?: boolean;
      isAffiliate?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    isAdmin: boolean;
    isAffiliate: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        });

        if (!user) {
          throw new Error("Invalid email or password");
        }

        const isPasswordValid = await compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          isAdmin: user.isAdmin,
          isAffiliate: user.isAffiliate
        };
      }
    })
  ],
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = user.isAdmin;
        token.isAffiliate = user.isAffiliate;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.isAdmin = token.isAdmin as boolean;
        session.user.isAffiliate = token.isAffiliate as boolean;
      }
      return session;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || "your-fallback-secret-for-development"
};