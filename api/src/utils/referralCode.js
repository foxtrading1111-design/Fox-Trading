import prisma from '../lib/prisma.js';

/**
 * Generates a unique referral code with format FOX + 6 random numbers
 * @returns {Promise<string>} Unique referral code (e.g., FOX123456)
 */
export async function generateUniqueReferralCode() {
  let referralCode;
  let isUnique = false;

  while (!isUnique) {
    // Generate 6 random numbers
    const randomNumbers = Math.floor(100000 + Math.random() * 900000); // Generates 6-digit number
    referralCode = `FOX${randomNumbers}`;

    // Check if code already exists
    const existingUser = await prisma.users.findUnique({
      where: { referral_code: referralCode }
    });

    if (!existingUser) {
      isUnique = true;
    }
  }

  return referralCode;
}
