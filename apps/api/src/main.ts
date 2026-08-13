import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { types as pgTypes } from 'pg';
import { AppModule } from './app.module';

// Postgres DATE → JS Date (TypeORM/pg default string qaytaradi).
pgTypes.setTypeParser(pgTypes.builtins.DATE, (value: string) => new Date(`${value}T00:00:00.000Z`));

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  const prefix = config.getOrThrow<string>('apiPrefix');
  const port = config.getOrThrow<number>('port');
  const corsOrigins = config.getOrThrow<string[]>('corsOrigins');
  const isProduction = config.getOrThrow<boolean>('isProduction');

  app.setGlobalPrefix(prefix);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableShutdownHooks();

  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Bog'cha Boshqaruv Tizimi API")
      .setDescription(
        "Bolalar bog'chasi ERP: davomat, oziq-ovqat, ombor, moliya, xodimlar va KPI",
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    SwaggerModule.setup(`${prefix}/docs`, app, SwaggerModule.createDocument(app, swaggerConfig));
  }

  await app.listen(port);
  logger.log(`API ishga tushdi: http://localhost:${port}/${prefix}`);
  if (!isProduction) logger.log(`Swagger: http://localhost:${port}/${prefix}/docs`);
}

void bootstrap();
