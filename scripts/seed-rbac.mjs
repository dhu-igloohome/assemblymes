import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial RBAC data...');

  // Ensure default team/employee exists for super admin
  let adminEmployee = await prisma.employee.findFirst({
    where: { employeeNo: 'ADMIN-001' }
  });

  if (!adminEmployee) {
    adminEmployee = await prisma.employee.create({
      data: {
        employeeNo: 'ADMIN-001',
        name: 'System Administrator',
        team: 'IT',
      }
    });
    console.log('Created default admin employee.');
  }

  // Create david as super admin
  const davidPasswordHash = await bcrypt.hash('david123', 10);
  const davidUser = await prisma.systemUser.upsert({
    where: { username: 'david' },
    update: {
      passwordHash: davidPasswordHash,
      role: 'SUPER_ADMIN',
    },
    create: {
      username: 'david',
      passwordHash: davidPasswordHash,
      role: 'SUPER_ADMIN',
      employeeId: adminEmployee.id,
    }
  });
  console.log('Upserted david user:', davidUser.username);

  // Create shu as super admin (needs another employee)
  let shuEmployee = await prisma.employee.findFirst({
    where: { employeeNo: 'ADMIN-002' }
  });

  if (!shuEmployee) {
    shuEmployee = await prisma.employee.create({
      data: {
        employeeNo: 'ADMIN-002',
        name: 'Shu Administrator',
        team: 'IT',
      }
    });
    console.log('Created default shu employee.');
  }

  const shuPasswordHash = await bcrypt.hash('shu123', 10);
  const shuUser = await prisma.systemUser.upsert({
    where: { username: 'shu' },
    update: {
      passwordHash: shuPasswordHash,
      role: 'SUPER_ADMIN',
    },
    create: {
      username: 'shu',
      passwordHash: shuPasswordHash,
      role: 'SUPER_ADMIN',
      employeeId: shuEmployee.id,
    }
  });
  console.log('Upserted shu user:', shuUser.username);

  console.log('RBAC seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });