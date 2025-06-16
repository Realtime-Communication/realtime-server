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

async function main() {
  // Default password for admin
  const adminPassword = 'admin@admin.com';
  const hashedPassword = await SecutiryUtils.hashingPassword(adminPassword);
  
  // Create admin user if not exists
  const adminEmail = 'admin@admin.com';
  const adminPhone = '1234567890';
  
  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [
        { email: adminEmail },
        { phone: adminPhone }
      ]
    }
  });

  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        phone: adminPhone,
        password: hashedPassword,
        role: AccountRole.ADMIN,
        first_name: 'Admin',
        last_name: 'User',
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

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
