// scripts/update-coupons.js
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma Client
const prisma = new PrismaClient();

async function updateCoupons() {
  try {
    console.log('Starting coupon update process...');
    
    // Get all existing coupons
    const existingCoupons = await prisma.coupon.findMany();
    console.log(`Found ${existingCoupons.length} coupons to update`);
    
    // Update each coupon
    for (const coupon of existingCoupons) {
      await prisma.coupon.update({
        where: { id: coupon.id },
        data: {
          maxUses: 100,
          currentUses: coupon.isUsed ? 1 : 0
        }
      });
      console.log(`Updated coupon: ${coupon.code}`);
    }
    
    console.log('All coupons have been updated successfully!');
  } catch (error) {
    console.error('Error updating coupons:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
updateCoupons();