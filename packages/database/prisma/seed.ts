import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding data...');

  // Clear existing data
  await prisma.mentorshipRequest.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  // Create Superadmin
  await prisma.user.create({
    data: {
      email: 'jcesperanza@neu.edu.ph',
      name: 'Super Admin',
      role: Role.SUPERADMIN,
      bio: 'System Administrator for AKN.',
    },
  });

  // Create 5 Alumni
  const alumniData = [
    { name: 'John Doe', email: 'john@alumni.com', industry: 'Software Engineering', batch: '2015' },
    { name: 'Jane Smith', email: 'jane@alumni.com', industry: 'Data Science', batch: '2017' },
    {
      name: 'Robert Fox',
      email: 'robert@alumni.com',
      industry: 'Product Management',
      batch: '2012',
    },
    { name: 'Emily Chen', email: 'emily@alumni.com', industry: 'UX Design', batch: '2019' },
    {
      name: 'Michael Brown',
      email: 'michael@alumni.com',
      industry: 'Cybersecurity',
      batch: '2016',
    },
  ];

  for (const a of alumniData) {
    await prisma.user.create({
      data: { ...a, role: Role.USER, bio: `Experienced professional in ${a.industry}.` },
    });
  }

  // Create 5 Students
  const studentData = [
    { name: 'Alice Wong', email: 'alice@student.com', industry: 'CS', batch: '2026' },
    { name: 'Bob Miller', email: 'bob@student.com', industry: 'IT', batch: '2025' },
    { name: 'Charlie Day', email: 'charlie@student.com', industry: 'Engineering', batch: '2027' },
    { name: 'David Lee', email: 'david@student.com', industry: 'CS', batch: '2024' },
    { name: 'Eve Adams', email: 'eve@student.com', industry: 'Design', batch: '2025' },
  ];

  for (const s of studentData) {
    await prisma.user.create({
      data: { ...s, role: Role.USER, bio: 'Student looking for mentorship.' },
    });
  }

  // Create some sample posts
  const alumni = await prisma.user.findMany({ where: { email: { contains: '@alumni.com' } } });

  for (const a of alumni) {
    await prisma.post.create({
      data: {
        title: `Insights on ${a.industry}`,
        content: `Sharing some thoughts on the current trends in ${a.industry}. The SECI model is very useful here!`,
        authorId: a.id,
      },
    });
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
