import { PrismaClient } from './packages/database/generated/client';
const prisma = new PrismaClient();

async function checkData() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true } });
  const requests = await prisma.mentorshipRequest.findMany({
    include: { student: true, alumni: true },
  });

  console.log('--- USERS ---');
  console.table(users);

  console.log('\n--- REQUESTS ---');
  console.table(
    requests.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      studentName: r.student.name,
      alumniId: r.alumniId,
      alumniName: r.alumni.name,
      status: r.status,
    })),
  );

  await prisma.$disconnect();
}

checkData();
