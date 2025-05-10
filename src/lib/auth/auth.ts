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

// Workaround for bcrypt with enhanced error handling
const compare = async (data: string, hash: string) => {
  try {
    if (bcryptModule && typeof bcryptModule.compare === 'function') {
      console.log("Using bcryptjs to compare passwords");
      return await bcryptModule.compare(data, hash);
    } else {
      // Simple fallback for development (NOT SECURE)
      console.warn("⚠️ Bcrypt not available, using insecure fallback. DO NOT USE IN PRODUCTION!");
      return data === hash;
    }
  } catch (error) {
    console.error("❌ Error comparing passwords:", error);
    return false;
  }
};

// Define UserRole type to match Prisma schema
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
        console.log("🔑 AUTHORIZE: Starting authorization process");
        
        if (!credentials?.email || !credentials?.password) {
          console.log("❌ AUTHORIZE: Missing email or password");
          return null;
        }

        try {
          // Find the user in the database
          console.log(`🔍 AUTHORIZE: Looking up user with email: ${credentials.email}`);
          
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            }
          });

          if (!user) {
            console.log("❌ AUTHORIZE: User not found in database");
            throw new Error("Invalid email or password");
          }
          
          console.log(`✅ AUTHORIZE: User found: ID ${user.id}, Role: ${user.role}`);

          // Verify the password
          console.log("🔒 AUTHORIZE: Verifying password");
          const isPasswordValid = await compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            console.log("❌ AUTHORIZE: Password verification failed");
            throw new Error("Invalid email or password");
          }
          
          console.log("✅ AUTHORIZE: Password verified successfully");

          // Determine role statuses with explicit Boolean conversion
          // Cast the role to UserRole type to ensure type safety
          const userRole = (user.role || 'USER') as UserRole;
          const isAdmin = Boolean(user.isAdmin);
          const isClerk = Boolean(userRole === 'CLERK' || userRole === 'ADMIN' || user.isClerk || isAdmin);
          const isAffiliate = Boolean(user.isAffiliate);
          
          console.log(`👤 AUTHORIZE: Role calculation - Role: ${userRole}, Admin: ${isAdmin}, Clerk: ${isClerk}, Affiliate: ${isAffiliate}`);

          // Return the user with proper typing
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
    async jwt({ token, user }) {
      if (user) {
        console.log("🔄 JWT: Adding user data to token");
        token.id = user.id;
        token.role = user.role;
        token.isAdmin = Boolean(user.isAdmin);
        token.isClerk = Boolean(user.isClerk);
        token.isAffiliate = Boolean(user.isAffiliate);
        
        console.log(`🔐 JWT: Token created with ID: ${token.id}, Role: ${token.role}, Admin: ${token.isAdmin}, Clerk: ${token.isClerk}`);
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        console.log("🔄 SESSION: Adding token data to session");
        session.user.id = token.id;
        session.user.role = token.role as UserRole;
        session.user.isAdmin = Boolean(token.isAdmin);
        session.user.isClerk = Boolean(token.isClerk);
        session.user.isAffiliate = Boolean(token.isAffiliate);
        
        console.log(`👥 SESSION: Session updated with ID: ${session.user.id}, Role: ${session.user.role}`);
      }
      return session;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  debug: process.env.NODE_ENV === 'development' && process.env.NEXTAUTH_DEBUG !== 'false',
  secret: process.env.NEXTAUTH_SECRET || "your-fallback-secret-for-development",
  logger: {
    error(code, metadata) {
      console.error(`[Auth] Error: ${code}`, metadata);
    },
    warn(code) {
      console.warn(`[Auth] Warning: ${code}`);
    },
    debug(code, metadata) {
      if (process.env.NEXTAUTH_DEBUG !== 'false') {
        console.log(`[Auth] Debug: ${code}`, metadata);
      }
    }
  }
};