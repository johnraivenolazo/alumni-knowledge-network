import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, User } from '@akn/database';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class UsersService {
  private readonly SUPERADMIN_EMAIL = 'jcesperanza@neu.edu.ph';
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
    const role = email === this.SUPERADMIN_EMAIL ? Role.SUPERADMIN : Role.USER;
    return this.prisma.user.upsert({
      where: { email },
      update: {
        role: email === this.SUPERADMIN_EMAIL ? Role.SUPERADMIN : undefined,
      },
      create: {
        email,
        name,
        role,
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { posts: true },
    });
    if (!user) throw new NotFoundException('User not found');
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
  async findAll(filters?: { industry?: string; batch?: string }) {
    return this.prisma.user.findMany({
      where: {
        industry: filters?.industry
          ? { contains: filters.industry, mode: 'insensitive' }
          : undefined,
        batch: filters?.batch
          ? { contains: filters.batch, mode: 'insensitive' }
          : undefined,
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
}
