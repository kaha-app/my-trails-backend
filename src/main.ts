import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
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
  const app = await NestFactory.create(AppModule);

  // Override JSON serializer to handle BigInt
  app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function (body: any) {
      // Parse the body to convert BigInt to string
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
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'access-token',
    )
    .addTag('Users', 'User management endpoints')
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Trails', 'Trail management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Swagger UI available at http://localhost:${port}/api`);
}
bootstrap();
