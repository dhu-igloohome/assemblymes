import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    const tableExists = await prisma.$queryRaw`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'visitor_feedback')`;
    console.log('Table visitor_feedback exists:', tableExists);
    
    const columns = await prisma.$queryRaw`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'visitor_feedback'`;
    console.log('Columns:', columns);
  } catch (e) {
    console.error('Check error:', e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
