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
    'bgduque@neu.edu.ph',
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
      if (isHardcodedSuperadmin && (user.role !== Role.SUPERADMIN || user.status !== UserStatus.APPROVED)) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { role: Role.SUPERADMIN, status: UserStatus.APPROVED },
        });
      }
      return user;
    }

    const role = isHardcodedSuperadmin ? Role.SUPERADMIN : Role.USER;
    const status = isHardcodedSuperadmin ? UserStatus.APPROVED : UserStatus.PENDING;

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
    if (isHardcodedSuperadmin && (user.role !== Role.SUPERADMIN || user.status !== UserStatus.APPROVED)) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { role: Role.SUPERADMIN, status: UserStatus.APPROVED },
        include: { posts: true, comments: true },
      });
    }

    return user;
  }

  async update(id: string, data: Partial<User>) {
    return this.prisma.user.update({
      where: { id },
      data,
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
    } catch (error) {
      console.error('[UsersService] CRITICAL: Failed to fetch users!', error);
      throw error;
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

    return {
      totalUsers,
      students,
      alumni,
      pending,
      industryStats,
    };
  }
}
