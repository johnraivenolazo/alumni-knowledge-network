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
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@akn/database';
import { AuthenticatedRequest } from '../auth/request.interface';

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
  updateMe(@Req() req: AuthenticatedRequest, @Body() body: any) {
    // Prevent self-role changing via this endpoint
    delete body.role;
    return this.usersService.update(req.user.id, body);
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

    // Fetch target user to check their current role
    const targetUser = await this.usersService.findOne(targetId);

    // Hierarchy Logic:
    // 1. Only SUPERADMIN can promote/demote other ADMINs or SUPERADMINs.
    // 2. ADMIN can only manage USERs.
    if (actorRole === Role.ADMIN) {
      if (
        targetUser.role !== Role.USER ||
        (body.role !== Role.USER && body.role !== Role.ADMIN)
      ) {
        throw new ForbiddenException('Admins can only manage normal Users');
      }
    }

    // Prevent self-demotion of the last Superadmin (safety check)
    if (
      actorId === targetId &&
      actorRole === Role.SUPERADMIN &&
      body.role !== Role.SUPERADMIN
    ) {
      // Optional: Add logic to check if there are other Superadmins
    }

    return this.usersService.changeRole(targetId, body.role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
