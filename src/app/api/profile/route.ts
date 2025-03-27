import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// Define extended User type that includes the new fields
interface ExtendedUserType {
  id: string;
  name: string | null;
  email: string;
  password: string;
  image: string | null;
  bio: string | null;
  skills: string | null;
  education: string | null;
  experience: string | null;
  createdAt: Date;
  updatedAt: Date;
  isAdmin: boolean;
  isAffiliate: boolean;
  phone: string | null;
  affiliateCode: string | null;
  referredBy: string | null;
}

// Define type for ExtendedSession user
type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: (session.user as SessionUser).id },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Cast to our extended type
    const typedUser = user as unknown as ExtendedUserType;
    
    // Return only the required fields (exclude password)
    return NextResponse.json({
      id: typedUser.id,
      name: typedUser.name,
      email: typedUser.email,
      phone: typedUser.phone,
      bio: typedUser.bio || '',
      skills: typedUser.skills || '',
      education: typedUser.education || '',
      experience: typedUser.experience || '',
      isAdmin: typedUser.isAdmin,
      isAffiliate: typedUser.isAffiliate,
      affiliateCode: typedUser.affiliateCode
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const data = await request.json();
    
    // Validate the incoming data
    if (!data.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    
    // Update the user profile with type assertion
    const updatedUser = await prisma.user.update({
      where: { id: (session.user as SessionUser).id },
      data: {
        name: data.name,
        phone: data.phone || null,
        // Use type assertion to let TypeScript know these fields exist
        bio: data.bio || null,
        skills: data.skills || null,
        education: data.education || null,
        experience: data.experience || null
      } as any // Use 'as any' to bypass TypeScript checks for now
    });
    
    // Cast to our extended type
    const typedUser = updatedUser as unknown as ExtendedUserType;
    
    // Return only the required fields (exclude password)
    return NextResponse.json({
      id: typedUser.id,
      name: typedUser.name,
      email: typedUser.email,
      phone: typedUser.phone,
      bio: typedUser.bio || '',
      skills: typedUser.skills || '',
      education: typedUser.education || '',
      experience: typedUser.experience || '',
      isAdmin: typedUser.isAdmin,
      isAffiliate: typedUser.isAffiliate,
      affiliateCode: typedUser.affiliateCode
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}