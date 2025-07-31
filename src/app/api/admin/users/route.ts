import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth'; // Pastikan path ini betul
import { prisma } from '@/lib/db'; // Pastikan path ini betul
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET - Fetch a single user by ID for Admin, including their assessments summary
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        skills: true,
        education: true,
        experience: true,
        createdAt: true,
        updatedAt: true,
        role: true, // For display
        isAdmin: true, // For role management on client
        isAffiliate: true, // For role management on client
        isClerk: true, // For role management on client
        phone: true,
        affiliateCode: true,
        affiliateType: true,
        referredBy: true,
        assessments: {
          select: {
            id: true,
            type: true,
            status: true,
            tier: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        payments: { // Summary of payments
            select: {
                id: true,
                amount: true,
                status: true,
                createdAt: true,
                assessmentId: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        },
        affiliateStats: true, // Include affiliate stats if user is an affiliate
        // assignedAssessments: clerk is assigned assessments, not user takes assignedAssessments
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error(`Error fetching user ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch user. Please try again later.' },
      { status: 500 }
    );
  }
}

// PATCH - Update a user's details by ID for Admin (excluding roles, password can be updated)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const {
      name,
      email,
      password, // Admin might reset password
      bio,
      skills,
      education,
      experience,
      phone,
      affiliateCode,
      affiliateType
      // Roles (isAdmin, isClerk, isAffiliate) are managed via a separate endpoint: /api/admin/users/[id]/role
    } = body;

    const updateData: Prisma.UserUpdateInput = {};

    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (skills !== undefined) updateData.skills = skills;
    if (education !== undefined) updateData.education = education;
    if (experience !== undefined) updateData.experience = experience;
    if (phone !== undefined) updateData.phone = phone;
    if (affiliateType !== undefined) updateData.affiliateType = affiliateType;

    if (email !== undefined) {
      const existingUserByEmail = await prisma.user.findFirst({
        where: { email: email, NOT: { id: id } },
      });
      if (existingUserByEmail) {
        return NextResponse.json({ error: 'Email already in use by another account' }, { status: 409 });
      }
      updateData.email = email;
    }
    
    if (affiliateCode !== undefined) {
        if(affiliateCode === null || affiliateCode === "") {
            updateData.affiliateCode = null; // Allow unsetting affiliate code
        } else {
            const existingUserByAffiliateCode = await prisma.user.findFirst({
                where: { affiliateCode: affiliateCode, NOT: { id: id } },
            });
            if (existingUserByAffiliateCode) {
                return NextResponse.json({ error: 'Affiliate code already in use by another account' }, { status: 409 });
            }
            updateData.affiliateCode = affiliateCode;
        }
    }

    if (password) {
      if (typeof password !== 'string' || password.length < 6) {
        return NextResponse.json({ error: 'New password must be a string and at least 6 characters long' }, { status: 400 });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update provided' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { // Return updated user data without password
        id: true, name: true, email: true, image: true, bio: true, skills: true,
        education: true, experience: true, createdAt: true, updatedAt: true, role: true,
        isAdmin: true, isAffiliate: true, isClerk: true, phone: true, affiliateCode: true, affiliateType: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error(`Error updating user ${params.id}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      if (error.code === 'P2002') { // Unique constraint failed
        const target = error.meta?.target as string[];
        if (target?.includes('email')) {
            return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
        }
        if (target?.includes('affiliateCode')) {
            return NextResponse.json({ error: 'Affiliate code already in use' }, { status: 409 });
        }
      }
    }
    return NextResponse.json(
      { error: 'Failed to update user. Please try again later.' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a user by ID for Admin
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Prevent admin from deleting their own account
    if (id === session.user.id) {
      return NextResponse.json({ error: "Admins cannot delete their own account." }, { status: 403 });
    }

    // Transaction to ensure atomicity
    // IMPORTANT: Review your Prisma schema for `onDelete` cascade behaviors.
    // If cascade is set, some manual deletions below might be redundant or cause errors.
    // If not set, you MUST delete or unlink related records manually.
    await prisma.$transaction(async (tx) => {
      // 1. Unassign assessments if this user was a clerk
      await tx.assessment.updateMany({
        where: { assignedClerkId: id },
        data: { assignedClerkId: null },
      });

      // 2. Delete AffiliateTransactions related to this user
      await tx.referral.deleteMany({ where: { affiliateId: id } });

      // 3. Delete Payments made by this user
      //   Also, payments linked to assessments taken by this user will be handled when assessments are deleted if Payment.assessmentId is non-nullable and onDelete: Cascade is not set on Assessment.
      await tx.payment.deleteMany({ where: { userId: id } });
      
      // 4. Delete Referrals made by this user (if they were an affiliate)
      await tx.referral.deleteMany({ where: { affiliateId: id } });

      // 5. Delete Assessments taken by this user
      //    This will also trigger deletion of payments/referrals linked to these assessments
      //    IF Payment.assessmentId or Referral.assessmentId are non-nullable and have onDelete: Cascade on Assessment model.
      //    Otherwise, payments/referrals linked to these assessments need to be deleted/unlinked first.
      //    For simplicity, assuming cascade or they are handled by deleting payments for this user.
      //    To be safe, let's explicitly delete payments/referrals for this user's assessments.
      const userAssessments = await tx.assessment.findMany({ 
          where: { userId: id },
          select: { id: true }
      });
      const assessmentIds = userAssessments.map(a => a.id);

      if (assessmentIds.length > 0) {
          await tx.payment.deleteMany({ where: { assessmentId: { in: assessmentIds } } });
          await tx.referral.deleteMany({ where: { assessmentId: { in: assessmentIds } } });
          await tx.assessment.deleteMany({ where: { userId: id } });
      }
      
      // 6. Delete AffiliateApplications by this user
      await tx.affiliateApplication.deleteMany({ where: { userId: id } });

      // 7. Delete AffiliateStats for this user
      await tx.affiliateStats.deleteMany({ where: { userId: id } }); // use deleteMany for safety

      // 8. Finally, delete the user
      await tx.user.delete({ where: { id } });
    });

    return NextResponse.json({ message: 'User and all related data deleted successfully' });
  } catch (error) {
    console.error(`Error deleting user ${params.id}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'User not found or already deleted' }, { status: 404 });
      }
      // P2003: Foreign key constraint failed on the field: `...`
      // This indicates some related data was not properly handled (deleted or unlinked)
      // and your schema does not have `onDelete: Cascade` or `onDelete: SetNull` for that relation.
       if (error.code === 'P2003') {
        console.error('Foreign key constraint violation during user deletion:', error.meta);
        return NextResponse.json({ error: 'Failed to delete user due to existing related records. Please check server logs.' }, { status: 409 });
      }
    }
    return NextResponse.json(
      { error: 'Failed to delete user. An unexpected error occurred.' },
      { status: 500 }
    );
  }
}