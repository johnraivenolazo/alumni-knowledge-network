import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, User, UserStatus, UserType } from '@akn/database';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class UsersService {
  private readonly SUPERADMIN_EMAILS = [
    'jcesperanza@neu.edu.ph',
    'johnraivenolazo@gmail.com',
    'borisgamaliel.duque@neu.edu.ph',
    'olazoraiven@gmail.com',
    'raivenolazo@gmail.com',
  ];
  private s3Client: S3Client;

  constructor(private prisma: PrismaService) {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  async findOrCreateUser(email: string, name?: string): Promise<User> {
    const isHardcodedSuperadmin = this.SUPERADMIN_EMAILS.includes(
      email.toLowerCase(),
    );

    let user = await this.prisma.user.findUnique({ where: { email } });

    if (user?.isBanned) {
      throw new ForbiddenException('Your account has been banned');
    }

    if (user) {
      if (
        isHardcodedSuperadmin &&
        (user.role !== Role.SUPERADMIN || user.status !== UserStatus.APPROVED)
      ) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { role: Role.SUPERADMIN, status: UserStatus.APPROVED },
        });
      }
      return user;
    }

    const role = isHardcodedSuperadmin ? Role.SUPERADMIN : Role.USER;
    const status = isHardcodedSuperadmin
      ? UserStatus.APPROVED
      : UserStatus.PENDING;

    return this.prisma.user.create({
      data: {
        email,
        name,
        role,
        status,
        userType: UserType.STUDENT, // Default, can be updated on profile completion
      },
    });
  }

  async findOne(id: string) {
    let user = await this.prisma.user.findUnique({
      where: { id },
      include: { posts: true, comments: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const isHardcodedSuperadmin = this.SUPERADMIN_EMAILS.includes(
      user.email.toLowerCase(),
    );
    if (
      isHardcodedSuperadmin &&
      (user.role !== Role.SUPERADMIN || user.status !== UserStatus.APPROVED)
    ) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { role: Role.SUPERADMIN, status: UserStatus.APPROVED },
        include: { posts: true, comments: true },
      });
    }

    return user;
  }

  async update(id: string, data: Partial<User>) {
    const existingUser = await this.findOne(id);
    const isSuperadmin =
      existingUser.role === Role.SUPERADMIN ||
      this.SUPERADMIN_EMAILS.includes(existingUser.email.toLowerCase());

    const updateData: Partial<User> = { ...data };

    // Hardened identity fields cannot be self-modified once the faculty has
    // verified the account. Superadmins remain unrestricted for recovery.
    if (existingUser.status === UserStatus.APPROVED && !isSuperadmin) {
      if (
        updateData.userType !== undefined &&
        updateData.userType !== existingUser.userType
      ) {
        throw new ForbiddenException(
          'Network Member Type is locked after verification',
        );
      }
      if (
        updateData.industry !== undefined &&
        updateData.industry !== existingUser.industry
      ) {
        throw new ForbiddenException(
          'Primary Industry is locked after verification',
        );
      }
      if (
        updateData.batch !== undefined &&
        updateData.batch !== existingUser.batch
      ) {
        throw new ForbiddenException(
          'Graduation Batch is locked after verification',
        );
      }
    }

    if (data.userType && data.userType !== existingUser.userType) {
      if (!isSuperadmin) {
        updateData.status = UserStatus.PENDING;
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  async adminUpdate(id: string, data: Partial<User>) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async adminCreate(data: {
    email: string;
    name?: string;
    role?: Role;
    userType?: UserType;
    industry?: string;
    batch?: string;
    bio?: string;
  }) {
    const email = data.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ForbiddenException('A user with that email already exists');
    }

    return this.prisma.user.create({
      data: {
        email,
        name: data.name,
        role: data.role ?? Role.USER,
        userType: data.userType ?? UserType.STUDENT,
        industry: data.industry,
        batch: data.batch,
        bio: data.bio,
        status: UserStatus.APPROVED,
      },
    });
  }

  async generatePresignedUrl(userId: string, fileName: string) {
    const bucketName = process.env.AWS_S3_BUCKET;
    const key = `profiles/${userId}/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: 'image/jpeg',
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    return { url, key };
  }

  async findAll(filters?: {
    industry?: string;
    batch?: string;
    search?: string;
    status?: UserStatus;
    userType?: UserType;
  }) {
    try {
      return this.prisma.user.findMany({
        where: {
          status: filters?.status,
          userType: filters?.userType,
          industry: filters?.industry ? filters.industry : undefined,
          batch: filters?.batch ? filters.batch : undefined,
          OR: filters?.search
            ? [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { bio: { contains: filters.search, mode: 'insensitive' } },
              ]
            : undefined,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (_error) {
      console.error('[UsersService] CRITICAL: Failed to fetch users!', _error);
      throw _error;
    }
  }

  async updateStatus(userId: string, status: UserStatus) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status },
    });
  }

  async changeRole(userId: string, role: Role) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }

  async toggleBan(userId: string, isBanned: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isBanned },
    });
  }

  async remove(userId: string) {
    await this.prisma.comment.deleteMany({
      where: { authorId: userId },
    });

    await this.prisma.message.deleteMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
    });

    await this.prisma.mentorshipRequest.deleteMany({
      where: {
        OR: [{ studentId: userId }, { alumniId: userId }],
      },
    });

    await this.prisma.post.deleteMany({
      where: { authorId: userId },
    });

    return this.prisma.user.delete({
      where: { id: userId },
    });
  }

  async getStats() {
    const totalUsers = await this.prisma.user.count();
    const students = await this.prisma.user.count({
      where: { userType: UserType.STUDENT },
    });
    const alumni = await this.prisma.user.count({
      where: { userType: UserType.ALUMNI },
    });
    const pending = await this.prisma.user.count({
      where: { status: UserStatus.PENDING },
    });

    const industryStats = await this.prisma.user.groupBy({
      by: ['industry'],
      _count: { _all: true },
      where: { industry: { not: null } },
    });

    const totalPosts = await this.prisma.post.count();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentPosts = await this.prisma.post.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, authorId: true, author: { select: { userType: true } } },
    });

    const postsByDay: { day: string; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      postsByDay.push({ day: key, count: 0 });
    }
    for (const p of recentPosts) {
      const key = p.createdAt.toISOString().slice(0, 10);
      const slot = postsByDay.find((s) => s.day === key);
      if (slot) slot.count++;
    }
    const postsLast7Days = recentPosts.length;
    // Lividity = liveliness; ratio of recent posts to active members (0-100)
    const postLividity = totalUsers
      ? Math.min(100, Math.round((postsLast7Days / totalUsers) * 100))
      : 0;

    const activeAlumniIds = new Set<string>();
    const activeStudentIds = new Set<string>();
    for (const p of recentPosts) {
      if (p.author?.userType === UserType.ALUMNI) activeAlumniIds.add(p.authorId);
      if (p.author?.userType === UserType.STUDENT) activeStudentIds.add(p.authorId);
    }
    const alumniConsistency = alumni
      ? Math.round((activeAlumniIds.size / alumni) * 100)
      : 0;
    const studentConsistency = students
      ? Math.round((activeStudentIds.size / students) * 100)
      : 0;

    const reactionGroups = await this.prisma.postReaction.groupBy({
      by: ['type'],
      _count: { _all: true },
    });
    const reactionBreakdown = reactionGroups.map((g) => ({
      type: g.type,
      count: g._count._all,
    }));
    const mostUsedInteraction =
      reactionBreakdown.length > 0
        ? reactionBreakdown.reduce((a, b) => (a.count >= b.count ? a : b))
        : null;

    return {
      totalUsers,
      students,
      alumni,
      pending,
      industryStats,
      totalPosts,
      postsLast7Days,
      postsByDay,
      postLividity,
      alumniConsistency,
      studentConsistency,
      reactionBreakdown,
      mostUsedInteraction,
    };
  }
}
