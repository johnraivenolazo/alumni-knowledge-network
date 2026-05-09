import { NestFactory } from '@nestjs/core';
import { json, urlencoded, static as expressStatic } from 'express';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  // Disable Nest's bundled body parser so our limit-bumped json() runs first;
  // otherwise the default 100kb cap would reject base64-encoded photos before
  // our middleware even sees them.
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.use(json({ limit: '12mb' }));
  app.use(urlencoded({ limit: '12mb', extended: true }));

  // Local fallback storage for profile pictures when AWS S3 isn't configured.
  // Files written under <cwd>/uploads/profiles/<userId>/ and served directly
  // off the `/uploads` URL prefix so the existing publicUrl flow keeps working.
  const uploadsDir = join(process.cwd(), 'uploads');
  mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', expressStatic(uploadsDir));

  app.setGlobalPrefix('api', {
    exclude: ['/'],
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((err) => {
  console.error('Error during bootstrap:', err);
});
