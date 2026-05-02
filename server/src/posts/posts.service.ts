import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@akn/database';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async create(authorId: string, title: string, content: string) {
    return this.prisma.post.create({
      data: {
        title,
        content,
        authorId,
      },
      include: { author: true },
    });
  }

  async findAll() {
    return this.prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            profilePic: true,
            industry: true,
            role: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: { author: true },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async remove(id: string, userId: string, userRole: Role) {
    const post = await this.findOne(id);

    // Hierarchy: Author, Admin, and Superadmin can delete
    const isAuthor = post.authorId === userId;
    
    // Admin cannot delete Superadmin posts
    const isSuperadmin = userRole === Role.SUPERADMIN;
    const isAdmin = userRole === Role.ADMIN;
    const targetIsSuperadmin = post.author.role === Role.SUPERADMIN;

    let canDelete = false;
    if (isSuperadmin) canDelete = true;
    if (isAuthor) canDelete = true;
    if (isAdmin && !targetIsSuperadmin) canDelete = true;

    if (!canDelete) {
      throw new ForbiddenException(
        'You do not have permission to delete this post',
      );
    }

    return this.prisma.post.delete({ where: { id } });
  }
}
