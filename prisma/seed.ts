import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function writeLog(level: 'info' | 'error', message: string, metadata?: unknown) {
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    service: 'loomdesk-seed',
    level,
    message,
    ...(metadata !== undefined ? { metadata } : {}),
  });

  const stream = level === 'error' ? process.stderr : process.stdout;
  stream.write(`${payload}\n`);
}

async function main() {
  writeLog('info', 'Starting seed');

  // Hash password
  const hashedPassword = await bcrypt.hash('Admin@123', 10);

  // Create Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'sagor.khan@priyo.net' },
    update: {
      name: 'Sagor Khan',
      role: 'ADMIN',
      isActive: true,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: 'sagor.khan@priyo.net',
      name: 'Sagor Khan',
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });
  writeLog('info', 'Created admin user', { email: admin.email });

  writeLog('info', 'Seed completed successfully');
}

main()
  .catch((e) => {
    writeLog('error', 'Seed failed', {
      error: e instanceof Error ? e.message : String(e),
    });
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
