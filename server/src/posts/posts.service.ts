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

  async create(
    authorId: string,
    title: string,
    content: string,
    category: string = 'General',
  ) {
    return this.prisma.post.create({
      data: {
        title,
        content,
        category,
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
            userType: true,
            isExpert: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                profilePic: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async findOne(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        author: true,
        comments: {
          include: {
            author: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async addComment(postId: string, authorId: string, content: string) {
    return this.prisma.comment.create({
      data: {
        content,
        authorId,
        postId,
      },
      include: { author: true },
    });
  }

  async remove(id: string, userId: string, userRole: Role) {
    const post = await this.findOne(id);

    const isAuthor = post.authorId === userId;
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

    // Delete comments first
    await this.prisma.comment.deleteMany({ where: { postId: id } });

    return this.prisma.post.delete({ where: { id } });
  }

  async removeComment(commentId: string, userId: string, userRole: Role) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { author: true },
    });

    if (!comment) throw new NotFoundException('Comment not found');

    const isAuthor = comment.authorId === userId;
    const isSuperadmin = userRole === Role.SUPERADMIN;

    if (!isAuthor && !isSuperadmin) {
      throw new ForbiddenException('You cannot delete this comment');
    }

    return this.prisma.comment.delete({ where: { id: commentId } });
  }
}
