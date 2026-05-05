import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Role } from '@akn/database';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string; role: Role; name?: string };
}

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  findAll() {
    return this.postsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body() body: { title: string; content: string; category?: string },
  ) {
    return this.postsService.create(
      req.user.id,
      body.title,
      body.content,
      body.category,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/comments')
  addComment(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { content: string },
  ) {
    return this.postsService.addComment(id, req.user.id, body.content);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.postsService.remove(id, req.user.id, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('comments/:commentId')
  removeComment(
    @Req() req: AuthenticatedRequest,
    @Param('commentId') commentId: string,
  ) {
    return this.postsService.removeComment(
      commentId,
      req.user.id,
      req.user.role,
    );
  }
}
