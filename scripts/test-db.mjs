import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    const feedback = await prisma.visitorFeedback.create({
      data: {
        content: 'Test internal',
        nickname: 'Internal Tester',
      },
    });
    console.log('Success:', feedback.id);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
