import { NextAuthOptions } from "next-auth";
import { DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import * as bcryptModule from "bcryptjs";
import { prisma } from "@/lib/db";

// Define the JWT interface 
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: UserRole;
    isAdmin: boolean;
    isClerk: boolean;
    isAffiliate: boolean;
  }
}

// Optimized password comparison
const compare = async (data: string, hash: string) => {
  try {
    if (bcryptModule && typeof bcryptModule.compare === 'function') {
      return await bcryptModule.compare(data, hash);
    } else {
      console.warn("⚠️ Bcrypt not available, using insecure fallback. DO NOT USE IN PRODUCTION!");
      return data === hash;
    }
  } catch (error) {
    console.error("❌ Error comparing passwords:", error);
    return false;
  }
};

type UserRole = 'USER' | 'CLERK' | 'ADMIN';

// Extend Session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      isAdmin: boolean;
      isClerk: boolean;
      isAffiliate: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    role: UserRole;
    isAdmin: boolean;
    isClerk: boolean;
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
        if (process.env.NODE_ENV === 'development') {
          console.log("🔑 AUTHORIZE: Starting authorization process");
        }
        
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });

          if (!user) {
            throw new Error("Invalid email or password");
          }

          const isPasswordValid = await compare(credentials.password, user.password);

          if (!isPasswordValid) {
            throw new Error("Invalid email or password");
          }

          const userRole = (user.role || 'USER') as UserRole;
          const isAdmin = Boolean(user.isAdmin);
          const isClerk = Boolean(userRole === 'CLERK' || userRole === 'ADMIN' || user.isClerk || isAdmin);
          const isAffiliate = Boolean(user.isAffiliate);

          return {
            id: user.id,
            email: user.email,
            name: user.name || "User",
            image: user.image || null,
            role: userRole,
            isAdmin,
            isClerk, 
            isAffiliate
          };
        } catch (error) {
          console.error("❌ AUTHORIZE ERROR:", error);
          throw error;
        }
      }
    })
  ],
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      // 🚀 EXPERT FIX: Always refresh user data from database on session update
      if (trigger === "update" || user) {
        try {
          // Get user ID safely
          const userId = user?.id || (token as any).id;
          
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              role: true,
              isAdmin: true,
              isClerk: true,
              isAffiliate: true,
              email: true,
              name: true
            }
          });

          if (dbUser) {
            token.id = dbUser.id;
            token.role = (dbUser.role || 'USER') as UserRole;
            token.isAdmin = Boolean(dbUser.isAdmin);
            token.isClerk = Boolean(dbUser.isClerk || dbUser.isAdmin);
            token.isAffiliate = Boolean(dbUser.isAffiliate);
          }
        } catch (error) {
          console.error("Error refreshing user data in JWT:", error);
        }
      }
      
      // Handle initial login
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.isAdmin = Boolean(user.isAdmin);
        token.isClerk = Boolean(user.isClerk);
        token.isAffiliate = Boolean(user.isAffiliate);
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role as UserRole;
        session.user.isAdmin = Boolean(token.isAdmin);
        session.user.isClerk = Boolean(token.isClerk);
        session.user.isAffiliate = Boolean(token.isAffiliate);
      }
      return session;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 60 * 60, // Update session every hour
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
  debug: false,
  secret: process.env.NEXTAUTH_SECRET || "your-fallback-secret-for-development",
  
  logger: {
    error(code, metadata) {
      console.error(`[Auth] Error: ${code}`, metadata);
    },
    warn(code) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[Auth] Warning: ${code}`);
      }
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Auth] ${code}`);
      }
    }
  }
};