import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Generates a unique FOX referral code for migration
 * @returns {Promise<string>} Unique referral code in FOX format
 */
async function generateUniqueFoxCode() {
  let referralCode;
  let isUnique = false;

  while (!isUnique) {
    // Generate 6 random numbers
    const randomNumbers = Math.floor(100000 + Math.random() * 900000);
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

async function migrateReferralCodes() {
  try {
    console.log('🚀 Starting referral code migration to FOX format...\n');

    // Get all users with their current referral codes
    const users = await prisma.users.findMany({
      select: {
        id: true,
        full_name: true,
        email: true,
        referral_code: true
      },
      orderBy: {
        id: 'asc' // Process in order to maintain consistency
      }
    });

    console.log(`📊 Found ${users.length} users to migrate\n`);

    const migrations = [];
    let skipped = 0;

    // Process each user
    for (const user of users) {
      // Skip if already in FOX format
      if (user.referral_code.startsWith('FOX')) {
        console.log(`⏭️  Skipping ${user.full_name} - already has FOX format: ${user.referral_code}`);
        skipped++;
        continue;
      }

      // Generate new FOX code
      const newCode = await generateUniqueFoxCode();
      
      migrations.push({
        userId: user.id,
        userName: user.full_name,
        oldCode: user.referral_code,
        newCode: newCode
      });

      console.log(`🔄 ${user.full_name}: ${user.referral_code} → ${newCode}`);
    }

    console.log(`\n📋 Migration Plan:`);
    console.log(`   - Users to migrate: ${migrations.length}`);
    console.log(`   - Users already in FOX format: ${skipped}`);
    console.log(`   - Total users: ${users.length}\n`);

    if (migrations.length === 0) {
      console.log('✅ No migrations needed - all users already have FOX format codes');
      return;
    }

    // Confirm before proceeding
    console.log('⚠️  This will permanently change referral codes. Make sure to backup your database first!');
    console.log('   Proceeding with migration in 3 seconds...\n');
    
    // Wait 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Execute migrations in a transaction
    console.log('🔧 Executing migrations...\n');
    
    await prisma.$transaction(async (tx) => {
      for (const migration of migrations) {
        await tx.users.update({
          where: { id: migration.userId },
          data: { referral_code: migration.newCode }
        });
        console.log(`✅ Updated ${migration.userName}: ${migration.oldCode} → ${migration.newCode}`);
      }
    });

    console.log(`\n🎉 Migration completed successfully!`);
    console.log(`   - Successfully migrated ${migrations.length} users`);
    console.log(`   - All referral codes now use FOX format\n`);

    // Verify migration
    const updatedUsers = await prisma.users.findMany({
      select: { referral_code: true },
      where: {
        referral_code: {
          not: {
            startsWith: 'FOX'
          }
        }
      }
    });

    if (updatedUsers.length === 0) {
      console.log('✅ Verification passed - all users now have FOX format codes');
    } else {
      console.log(`⚠️  Warning: ${updatedUsers.length} users still don't have FOX format codes`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateReferralCodes()
  .catch(error => {
    console.error('❌ Fatal error during migration:', error);
    process.exit(1);
  });