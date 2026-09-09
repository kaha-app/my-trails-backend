import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';

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

  // Enable CORS - IMPORTANT for mobile apps
  app.enableCors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Serve static files BEFORE setting global prefix
  // This ensures /uploads/... is accessible without /api prefix
  app.useStaticAssets('uploads', {
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
        const messages = errors.map(error => ({
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
    .addBearerAuth({type: 'http', scheme: 'bearer', bearerFormat: 'JWT'}, 'access-token')
    .addTag('Users', 'User management endpoints')
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Trails', 'Trail management endpoints')
    .addTag('Favourites', 'Trail favourites endpoints')
    .addTag('Hikes', 'Hike recording endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`✅ Server is running on http://0.0.0.0:${port} (accessible from http://192.168.1.68:${port})`);
  console.log(`📚 Swagger UI available at http://0.0.0.0:${port}/api`);
  console.log(`📁 Static files served from /uploads and /assets`);
}

bootstrap();
