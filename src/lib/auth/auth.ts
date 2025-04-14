// lib/auth/auth.ts
import { NextAuthOptions } from "next-auth";
import { DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import * as bcryptModule from "bcrypt";

// Workaround for bcrypt in case it's not available
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

// Define UserRole type to match Prisma schema
type UserRole = 'USER' | 'CLERK' | 'ADMIN';

// Extend Session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: UserRole;
      isAdmin?: boolean; // Keep for backward compatibility
      isClerk?: boolean; // Computed property for backward compatibility
      isAffiliate?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    role?: UserRole;
    isAdmin: boolean; // Keep for backward compatibility
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

        // Work around TypeScript issues with any for now
        const userRole = (user as any).role || 'USER';
        const isClerk = userRole === 'CLERK' || userRole === 'ADMIN';

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: userRole,
          isAdmin: user.isAdmin,
          isClerk: isClerk, // Computed property
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
        token.role = user.role;
        token.isAdmin = user.isAdmin;
        token.isClerk = (user as any).isClerk;
        token.isAffiliate = user.isAffiliate;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.isAdmin = token.isAdmin as boolean;
        session.user.isClerk = token.isClerk as boolean;
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