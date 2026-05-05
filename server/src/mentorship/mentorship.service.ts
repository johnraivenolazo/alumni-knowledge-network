import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { RequestStatus } from '@akn/database';

@Injectable()
export class MentorshipService {
  private sesClient: SESClient;
  private readonly SUPERADMIN_EMAILS = [
    'olazoraiven@gmail.com',
    'bgduque@neu.edu.ph',
    'raivenolazo@gmail.com',
    'johnraivenolazo@gmail.com',
  ];

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
    userId: string,
    userRole?: string,
    userEmail?: string,
  ) {
    const request = await this.prisma.mentorshipRequest.findUnique({
      where: { id: requestId },
      include: { student: true, alumni: true },
    });

    if (!request) throw new NotFoundException('Request not found');

    const isEmailAdmin = userEmail && this.SUPERADMIN_EMAILS.includes(userEmail.toLowerCase());
    const isRoleAdmin =
      userRole?.toUpperCase() === 'ADMIN' ||
      userRole?.toUpperCase() === 'SUPERADMIN';
    
    const isAdmin = isEmailAdmin || isRoleAdmin;
    const isStudent = String(request.studentId) === String(userId);
    const isAlumni = String(request.alumniId) === String(userId);

    console.log('[MentorshipAuth] Detailed Check:', {
      requestId,
      attemptedBy: userId,
      userRole,
      userEmail,
      isAdmin,
      isStudent,
      isAlumni,
      requestStudentId: request.studentId,
      requestAlumniId: request.alumniId,
      requestedStatus: status,
    });

    if (status === RequestStatus.CANCELLED) {
      if (!isStudent && !isAlumni && !isAdmin) {
        const reason = `[VERSION-V100] Unauthorized: Not student(${isStudent}), alumni(${isAlumni}), or admin(${isAdmin}). User: ${userId}, Role: ${userRole}, Email: ${userEmail}`;
        console.error('[MentorshipAuth] Forbidden:', reason);
        throw new ForbiddenException(reason);
      }
    } else {
      if (!isAlumni && !isAdmin) {
        const reason = `[VERSION-V100] Unauthorized: Not alumni(${isAlumni}) or admin(${isAdmin}). User: ${userId}, Role: ${userRole}, Email: ${userEmail}`;
        console.error('[MentorshipAuth] Forbidden:', reason);
        throw new ForbiddenException(reason);
      }
    }

    const updatedRequest = await this.prisma.mentorshipRequest.update({
      where: { id: requestId },
      data: { status },
    });

    const notifyEmail =
      userId === request.alumniId
        ? request.student.email
        : request.alumni.email;

    // Notify the other user via SES
    await this.sendEmailNotification(
      notifyEmail,
      'Mentorship Request Status Updated',
      `Your mentorship request status has been updated to ${status.toLowerCase()}.`,
    );

    return updatedRequest;
  }

  async getMyRequests(userId: string) {
    return await this.prisma.mentorshipRequest.findMany({
      where: {
        OR: [{ studentId: userId }, { alumniId: userId }],
      },
      include: {
        student: { select: { id: true, name: true, email: true } },
        alumni: { select: { id: true, name: true, email: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: { select: { name: true, profilePic: true } },
          },
        },
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
