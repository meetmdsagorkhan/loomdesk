import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Hash password
  const hashedPassword = await bcrypt.hash('Admin@123', 10);

  // Create Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'sagor.khan@priyo.net' },
    update: {},
    create: {
      email: 'sagor.khan@priyo.net',
      name: 'Sagor Khan',
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('✅ Created admin user:', admin.email);

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
