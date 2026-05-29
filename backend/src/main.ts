import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Cookie parser middleware for HTTP-only cookies
  app.use(cookieParser());

  // We sit behind nginx in production. Trusting the first proxy hop is what
  // lets express/nest see the real client IP and protocol (X-Forwarded-Proto),
  // which is itself required for `secure: true` cookies to be set when the
  // upstream connection between nginx ↔ node is plain HTTP.
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // Allowed origins are configured as a comma-separated list in
  // `FRONTEND_URLS` (or fallback to legacy `FRONTEND_URL`). Local hosts are
  // always allowed in non-production for convenience.
  const rawOrigins = process.env.FRONTEND_URLS ?? process.env.FRONTEND_URL ?? '';
  const allowedOrigins = rawOrigins
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (allowedOrigins.length === 0 && process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:3010', 'http://localhost:3000');
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no Origin header (curl, server-to-server, mobile).
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      // Dev convenience: open localhost in non-production.
      if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
        return callback(null, true);
      }

      logger.warn(`Blocked CORS request from origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true, // Required for cookies cross-domain
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // API prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3011;
  await app.listen(port);

  logger.log(`TimeLock Backend running on http://localhost:${port}`);
  logger.log(`CORS enabled for: ${allowedOrigins.join(', ')}`);
}

bootstrap();


