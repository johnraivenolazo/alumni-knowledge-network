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
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() req: any) {
    return this.usersService.findOne(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@Req() req: any, @Body() body: any) {
    // Prevent self-role changing via this endpoint
    delete body.role;
    return this.usersService.update(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile-pic-upload')
  getUploadUrl(@Req() req: any, @Body() body: { fileName: string }) {
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
  @Roles(Role.SUPERADMIN)
  @Patch(':id/role')
  changeRole(@Param('id') id: string, @Body() body: { role: Role }) {
    return this.usersService.changeRole(id, body.role);
  }
}
