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
import { Role, UserStatus, UserType, User } from '@akn/database';

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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Get('stats')
  getStats() {
    return this.usersService.getStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@Req() req: AuthenticatedRequest, @Body() body: Partial<User>) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { role, status, ...updateData } = body;
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
    @Query('status') status?: UserStatus,
    @Query('userType') userType?: UserType,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll({
      industry,
      batch,
      status,
      userType,
      search,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Patch(':id/status')
  async updateStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') targetId: string,
    @Body() body: { status: UserStatus },
  ) {
    const targetUser = await this.usersService.findOne(targetId);
    if (
      targetUser.role === Role.SUPERADMIN &&
      req.user.role !== Role.SUPERADMIN
    ) {
      throw new ForbiddenException(
        'Only Superadmins can update Superadmin status',
      );
    }
    return this.usersService.updateStatus(targetId, body.status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Patch(':id')
  async adminUpdateUser(
    @Req() req: AuthenticatedRequest,
    @Param('id') targetId: string,
    @Body() body: { userType?: UserType; isExpert?: boolean },
  ) {
    return this.usersService.adminUpdate(targetId, body);
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

    if (actorRole === Role.ADMIN && targetUser.role === Role.SUPERADMIN) {
      throw new ForbiddenException('Admins cannot ban Superadmins');
    }

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
