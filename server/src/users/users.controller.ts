import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
  Post,
  ForbiddenException,
  Query,
  Delete,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, User } from '@akn/database';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string; role: Role; name?: string };
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() req: AuthenticatedRequest) {
    return this.usersService.findOne(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@Req() req: AuthenticatedRequest, @Body() body: Partial<User>) {
    const updateData = { ...body };
    delete updateData.role;
    return this.usersService.update(req.user.id, updateData);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile-pic-upload')
  getUploadUrl(
    @Req() req: AuthenticatedRequest,
    @Body() body: { fileName: string },
  ) {
    return this.usersService.generatePresignedUrl(req.user.id, body.fileName);
  }

  @Get()
  findAll(
    @Query('industry') industry?: string,
    @Query('batch') batch?: string,
  ) {
    return this.usersService.findAll({ industry, batch });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Patch(':id/role')
  async changeRole(
    @Req() req: AuthenticatedRequest,
    @Param('id') targetId: string,
    @Body() body: { role: Role },
  ) {
    const actorRole = req.user.role;
    const actorId = req.user.id;
    const targetUser = await this.usersService.findOne(targetId);

    if (actorRole === Role.ADMIN) {
      if (
        targetUser.role !== Role.USER ||
        (body.role !== Role.USER && body.role !== Role.ADMIN)
      ) {
        throw new ForbiddenException('Admins can only manage normal Users');
      }
    }

    // Executive Protection: Prevent Superadmins from downgrading themselves or peers
    if (targetUser.role === Role.SUPERADMIN) {
      if (actorId === targetId) {
        throw new ForbiddenException(
          'You cannot change your own role to avoid accidental lockout',
        );
      }
      if (body.role !== Role.SUPERADMIN) {
        throw new ForbiddenException(
          'Superadmin roles are protected and cannot be downgraded',
        );
      }
    }

    return this.usersService.changeRole(targetId, body.role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Patch(':id/ban')
  async toggleBan(
    @Req() req: AuthenticatedRequest,
    @Param('id') targetId: string,
    @Body() body: { isBanned: boolean },
  ) {
    const actorRole = req.user.role;
    const targetUser = await this.usersService.findOne(targetId);

    // Admins cannot ban Superadmins
    if (actorRole === Role.ADMIN && targetUser.role === Role.SUPERADMIN) {
      throw new ForbiddenException('Admins cannot ban Superadmins');
    }

    // Protection: Cannot ban yourself
    if (req.user.id === targetId) {
      throw new ForbiddenException('You cannot ban yourself');
    }

    return this.usersService.toggleBan(targetId, body.isBanned);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
