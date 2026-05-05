import { PrismaClient } from '@akn/database';
const prisma = new PrismaClient();

async function check() {
  try {
    const userCount = await prisma.user.count();
    const postCount = await prisma.post.count();
    const commentCount = await prisma.comment.count();
    console.log({ userCount, postCount, commentCount });
  } catch (e) {
    console.error('Error connecting to DB:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
