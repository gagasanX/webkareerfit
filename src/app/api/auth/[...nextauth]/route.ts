import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/auth";

// Use the standard NextAuth handler without the error-catching wrapper
// This avoids TypeScript errors and NextAuth handles errors internally
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };