import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { RequestStatus } from '@prisma/client';

@Injectable()
export class MentorshipService {
  private sesClient: SESClient;

  constructor(private prisma: PrismaService) {
    this.sesClient = new SESClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  async sendRequest(studentId: string, alumniId: string, message: string) {
    const alumni = await this.prisma.user.findUnique({
      where: { id: alumniId },
    });
    if (!alumni) throw new NotFoundException('Alumni not found');

    const request = await this.prisma.mentorshipRequest.create({
      data: {
        studentId,
        alumniId,
        message,
        status: RequestStatus.PENDING,
      },
    });

    // Notify alumni via SES
    await this.sendEmailNotification(
      alumni.email,
      'New Mentorship Request',
      `You have a new mentorship request. Message: ${message}`,
    );

    return request;
  }

  async respondToRequest(
    requestId: string,
    status: RequestStatus,
    alumniId: string,
  ) {
    const request = await this.prisma.mentorshipRequest.findUnique({
      where: { id: requestId },
      include: { student: true },
    });

    if (!request) throw new NotFoundException('Request not found');
    if (request.alumniId !== alumniId)
      throw new ForbiddenException('Unauthorized');

    const updatedRequest = await this.prisma.mentorshipRequest.update({
      where: { id: requestId },
      data: { status },
    });

    // Notify student via SES
    await this.sendEmailNotification(
      request.student.email,
      'Mentorship Request Status Updated',
      `Your mentorship request has been ${status.toLowerCase()}.`,
    );

    return updatedRequest;
  }

  async getMyRequests(userId: string) {
    return this.prisma.mentorshipRequest.findMany({
      where: {
        OR: [{ studentId: userId }, { alumniId: userId }],
      },
      include: {
        student: { select: { name: true, email: true } },
        alumni: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async sendEmailNotification(
    to: string,
    subject: string,
    body: string,
  ) {
    const sender = process.env.AWS_SES_SENDER || 'no-reply@neu.edu.ph';
    const command = new SendEmailCommand({
      Destination: { ToAddresses: [to] },
      Message: {
        Body: { Text: { Data: body } },
        Subject: { Data: subject },
      },
      Source: sender,
    });

    try {
      await this.sesClient.send(command);
    } catch (error) {
      console.error('Failed to send email:', error);
      // Don't throw error to prevent blocking the DB operation
    }
  }
}
