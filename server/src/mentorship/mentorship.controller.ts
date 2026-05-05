import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { MentorshipService } from './mentorship.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequestStatus, Role } from '@akn/database';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string; role: Role; name?: string };
}

@Controller('mentorship')
@UseGuards(JwtAuthGuard)
export class MentorshipController {
  constructor(private readonly mentorshipService: MentorshipService) {}

  @Post('request')
  sendRequest(
    @Req() req: AuthenticatedRequest,
    @Body() body: { alumniId: string; message: string },
  ) {
    return this.mentorshipService.sendRequest(
      req.user.id,
      body.alumniId,
      body.message,
    );
  }

  @Patch(':id/respond')
  respondToRequest(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { status: RequestStatus },
  ) {
    return this.mentorshipService.respondToRequest(
      id,
      body.status,
      req.user.id,
      req.user.role,
    );
  }

  @Get('my-requests')
  getMyRequests(@Req() req: AuthenticatedRequest) {
    return this.mentorshipService.getMyRequests(req.user.id);
  }
}
