import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { UsersService } from './users/users.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { PostsModule } from './posts/posts.module';
import { MentorshipModule } from './mentorship/mentorship.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    PrismaModule,
    PostsModule,
    MentorshipModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService, UsersService],
})
export class AppModule {}
