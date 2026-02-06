import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing user roles...');

  // Update all CLIENT users to ADMIN (since we're removing CLIENT role)
  const result = await prisma.$executeRaw`
    UPDATE users 
    SET role = 'ADMIN' 
    WHERE role = 'CLIENT'
  `;

  console.log(`✅ Updated ${result} users from CLIENT to ADMIN`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
