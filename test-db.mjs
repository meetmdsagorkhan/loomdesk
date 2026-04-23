import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, role: true } });
  console.log("Users:", users);
  const accesses = await prisma.channelAccess.findMany();
  console.log("Channel Accesses:", accesses);
}
main().finally(() => prisma.$disconnect());
