import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as a Malaysian Ringgit price
 * @param price - The price to format
 * @returns Formatted price string (e.g., RM 99.00)
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ms-MY', {
    style: 'currency',
    currency: 'MYR',
  }).format(price)
}

/**
 * Generate a unique referral code for affiliate users
 * @returns A unique referral code consisting of alphanumeric characters
 */
export function generateReferralCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const codeLength = 8;
  let result = '';
  
  for (let i = 0; i < codeLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }
  
  return result;
}

/**
 * Generate a unique affiliate code based on user identifier
 * @param identifier - User name, email, or other identifier
 * @returns A unique affiliate code
 */
export function generateAffiliateCode(identifier: string): string {
  // Convert to lowercase and remove special characters
  const base = identifier
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 6);
  
  // Add a timestamp-based number for uniqueness
  const uniqueNumber = Date.now().toString().slice(-6);
  
  // Combine them and ensure it's of reasonable length
  return `${base}${uniqueNumber}`.substring(0, 10);
}

/**
 * Helper function to safely access session user properties
 * This function checks if session and session.user exist before accessing properties
 */
export function getUserId(session: any): string | null {
  if (!session || !session.user || !session.user.id) {
    return null;
  }
  return session.user.id;
}

/**
 * Extended session user type for TypeScript
 */
export interface ExtendedUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  isAdmin?: boolean;
  isAffiliate?: boolean;
  affiliateCode?: string;
}