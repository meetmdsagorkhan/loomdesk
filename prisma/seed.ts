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

  // Hash passwords
  const adminPassword = await bcrypt.hash('DemoAdmin@123', 10);
  const memberPassword = await bcrypt.hash('DemoMember@123', 10);

  // Create Demo Admin user
  const demoAdmin = await prisma.user.upsert({
    where: { email: 'admin@loomdesk.dev' },
    update: {
      name: 'Demo Admin',
      role: 'ADMIN',
      isActive: true,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: 'admin@loomdesk.dev',
      name: 'Demo Admin',
      password: adminPassword,
      role: 'ADMIN',
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });
  writeLog('info', 'Created demo admin user', { email: demoAdmin.email, password: 'DemoAdmin@123' });

  // Create Demo Member user
  const demoMember = await prisma.user.upsert({
    where: { email: 'member@loomdesk.dev' },
    update: {
      name: 'Demo Member',
      role: 'MEMBER',
      isActive: true,
      emailVerifiedAt: new Date(),
    },
    create: {
      email: 'member@loomdesk.dev',
      name: 'Demo Member',
      password: memberPassword,
      role: 'MEMBER',
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });
  writeLog('info', 'Created demo member user', { email: demoMember.email, password: 'DemoMember@123' });

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
