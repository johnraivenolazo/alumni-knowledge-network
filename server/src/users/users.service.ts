import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, User } from '@akn/database';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class UsersService {
  private readonly SUPERADMIN_EMAILS = [
    'jcesperanza@neu.edu.ph',
    'johnraivenolazo@gmail.com',
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
    // Ensure hardcoded superadmins always have the correct role on every login
    const isHardcodedSuperadmin = this.SUPERADMIN_EMAILS.includes(
      email.toLowerCase(),
    );

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (user?.isBanned) {
      throw new ForbiddenException('Your account has been banned');
    }

    if (user) {
      if (isHardcodedSuperadmin && user.role !== Role.SUPERADMIN) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { role: Role.SUPERADMIN },
        });
      }
      return user;
    }

    const role = isHardcodedSuperadmin ? Role.SUPERADMIN : Role.USER;
    return this.prisma.user.create({
      data: {
        email,
        name,
        role,
      },
    });
  }

  async findOne(id: string) {
    let user = await this.prisma.user.findUnique({
      where: { id },
      include: { posts: true },
    });
    if (!user) throw new NotFoundException('User not found');

    // Double-check role promotion on every findOne call for hardcoded superadmins
    const isHardcodedSuperadmin = this.SUPERADMIN_EMAILS.includes(
      user.email.toLowerCase(),
    );
    if (isHardcodedSuperadmin && user.role !== Role.SUPERADMIN) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { role: Role.SUPERADMIN },
        include: { posts: true },
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
      ContentType: 'image/jpeg', // Defaulting to jpeg for profile pics
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    return { url, key };
  }

  // Admin Dashboard Tasks (AKN-8)
  async findAll(filters?: { industry?: string; batch?: string; search?: string }) {
    return this.prisma.user.findMany({
      where: {
        isBanned: false, // Don't show banned users in directory
        industry: filters?.industry ? filters.industry : undefined, // Exact match for category
        batch: filters?.batch ? filters.batch : undefined, // Exact match for batch
        OR: filters?.search ? [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { bio: { contains: filters.search, mode: 'insensitive' } }
        ] : undefined
      },
      orderBy: { createdAt: 'desc' },
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
    // Delete associated posts and requests first or let Prisma handle it if configured
    // Since we don't have cascade delete configured in schema, we do it manually or use prisma delete
    return this.prisma.user.delete({
      where: { id: userId },
    });
  }
}
