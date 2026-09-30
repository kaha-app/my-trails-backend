import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';
import { resolve } from 'path';

// Custom BigInt serializer for JSON
const jsonStringify = (obj: any) => {
  return JSON.stringify(obj, (_key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  });
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const express = app.getHttpAdapter().getInstance();
  express.disable('x-powered-by');
  if (process.env.TRUST_PROXY === 'true') express.set('trust proxy', 1);

  app.use((req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none'",
    );
    if (process.env.NODE_ENV === 'production') {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
    }
    next();
  });

  const attempts = new Map<string, { count: number; resetAt: number }>();
  app.use('/api/auth', (req: any, res: any, next: any) => {
    if (
      !['/login', '/signup', '/refresh'].includes(req.path) ||
      req.method !== 'POST'
    )
      return next();
    const now = Date.now();
    const key = `${req.ip}:${req.path}`;
    const record = attempts.get(key);
    const current =
      !record || record.resetAt <= now
        ? { count: 0, resetAt: now + 15 * 60 * 1000 }
        : record;
    current.count += 1;
    attempts.set(key, current);
    res.setHeader('RateLimit-Limit', '10');
    res.setHeader(
      'RateLimit-Remaining',
      String(Math.max(0, 10 - current.count)),
    );
    if (current.count > 10)
      return res
        .status(429)
        .json({ statusCode: 429, message: 'Too many authentication attempts' });
    next();
  });

  // Enable CORS - IMPORTANT for mobile apps
  const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: allowedOrigins.length ? allowedOrigins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  });

  // Serve static files BEFORE setting global prefix
  // This ensures /uploads/... is accessible without /api prefix
  app.useStaticAssets(resolve(process.env.UPLOAD_DIR || 'uploads'), {
    prefix: '/uploads',
  });

  // Serve static assets (seeded data like GPX files)
  app.useStaticAssets('assets', {
    prefix: '/assets',
  });

  // Set global prefix for all API routes
  app.setGlobalPrefix('api');

  // Global validation pipe - transforms and validates all DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove unknown properties
      forbidNonWhitelisted: true, // Throw error if unknown properties present
      transform: true, // Auto-transform payloads to DTO classes
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => ({
          property: error.property,
          constraints: error.constraints,
        }));
        return new BadRequestException({
          statusCode: 400,
          message: 'Validation failed',
          errors: messages,
        });
      },
    }),
  );

  // Override JSON serializer to handle BigInt
  app.use((req: any, res: any, next: any) => {
    const originalJson = res.json;
    res.json = function (body: any) {
      const serialized = JSON.parse(jsonStringify(body));
      return originalJson.call(this, serialized);
    };
    next();
  });

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Hiking & Trail Management API')
    .setDescription('API for hiking trails, reviews, and user management')
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addTag('Users', 'User management endpoints')
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Trails', 'Trail management endpoints')
    .addTag('Favourites', 'Trail favourites endpoints')
    .addTag('Hikes', 'Hike recording endpoints')
    .build();

  if (
    process.env.NODE_ENV !== 'production' ||
    process.env.ENABLE_SWAGGER === 'true'
  ) {
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  const port = process.env.PORT ?? 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`Server is listening on port ${port}`);
  console.log(`📚 Swagger UI available at http://0.0.0.0:${port}/api`);
  console.log(`📁 Static files served from /uploads and /assets`);
}

bootstrap();
