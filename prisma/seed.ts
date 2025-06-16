import { AccountRole } from "@prisma/client";

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

class SecutiryUtils {
  static async hashingPassword(password) {
    const SALT_OR_ROUNDS = 10;
    return await bcrypt.hash(password, SALT_OR_ROUNDS);
  }
}

const prisma = new PrismaClient();

async function seedData() {
  // Create admin user if not exists
  const adminPassword = 'admin@admin.com';
  const hashedPassword = await SecutiryUtils.hashingPassword(adminPassword);
  const adminEmail = 'admin@admin.com';
  const adminPhone = '1234567890';
  // user 1
  const user1Email = 'user1@user1.com';
  const user1Phone = '1234567891';
  const user1Password = 'user1@user1.com';
  const user1HashedPassword = await SecutiryUtils.hashingPassword(user1Password);
  // user 2
  const user2Email = 'user2@user2.com';
  const user2Phone = '1234567892';
  const user2Password = 'user2@user2.com';
  const user2HashedPassword = await SecutiryUtils.hashingPassword(user2Password);
  // user 3
  const user3Email = 'user3@user3.com';
  const user3Phone = '1234567893';
  const user3Password = 'user3@user3.com';
  const user3HashedPassword = await SecutiryUtils.hashingPassword(user3Password);

  const existingUser1 = await prisma.user.findFirst({
    where: {
      OR: [
        { email: user1Email },
        { phone: user1Phone }
      ]
    }
  });

  const existingUser2 = await prisma.user.findFirst({
    where: {
      OR: [
        { email: user2Email },
        { phone: user2Phone }
      ]
    }
  });

  const existingUser3 = await prisma.user.findFirst({
    where: {
      OR: [
        { email: user3Email },
        { phone: user3Phone }
      ]
    }
  });

  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [
        { email: adminEmail },
        { phone: adminPhone }
      ]
    }
  });

  if (!existingUser1) {
    await prisma.user.create({
      data: {
        email: user1Email,
        phone: user1Phone,
        password: user1HashedPassword,
        role: AccountRole.USER,
        first_name: 'User 1',
        last_name: 'User 1',
        level_left: 0,
        level_right: 1,
        is_active: true,
        is_blocked: false
      }
    });
    console.log('Created admin user');
  } else {
    console.log('Admin user already exists');
  }

  if (!existingUser2) {
    await prisma.user.create({
      data: {
        email: user2Email,
        phone: user2Phone,
        password: user2HashedPassword,
        role: AccountRole.USER,
        first_name: 'User 2',
        last_name: 'User 2',
        level_left: 0,
        level_right: 1,
        is_active: true,
        is_blocked: false
      }
    });
    console.log('Created admin user');
  } else {
    console.log('Admin user already exists');
  }

  if (!existingUser3) {
    await prisma.user.create({
      data: {
        email: user3Email,
        phone: user3Phone,
        password: user3HashedPassword,
        role: AccountRole.USER,
        first_name: 'User 3',
        last_name: 'User 3',
        level_left: 0,
        level_right: 1,
        is_active: true,
        is_blocked: false
      }
    });
    console.log('Created admin user');
  } else {
    console.log('Admin user already exists');
  }

  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        phone: adminPhone,
        password: hashedPassword,
        role: AccountRole.ADMIN,
        first_name: 'Admin',
        last_name: 'Admin',
        level_left: 0,
        level_right: 1,
        is_active: true,
        is_blocked: false
      }
    });
    console.log('Created admin user');
  } else {
    console.log('Admin user already exists');
  }
}

export default seedData()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
