import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { cleanupOpenApiDoc } from 'nestjs-zod';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ACCESS_TOKEN_COOKIE } from './modules/auth/cookies';
import type { Env } from './config/env.schema';

const GLOBAL_PREFIX = 'api';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.use(helmet());
  app.use(cookieParser());
  app.setGlobalPrefix(GLOBAL_PREFIX);

  // credentials: true обязательно — токены ходят в httpOnly cookie.
  app.enableCors({
    origin: config.get('WEB_ORIGIN', { infer: true }),
    credentials: true,
  });

  app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost).httpAdapter));
  app.enableShutdownHooks();

  const openApiDoc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Expence Tracker API')
      .setDescription('REST API трекера расходов')
      .setVersion('0.0.1')
      .addCookieAuth(ACCESS_TOKEN_COOKIE)
      .build(),
  );

  // cleanupOpenApiDoc приводит схемы, выведенные из zod, к валидному OpenAPI.
  SwaggerModule.setup('api/docs', app, cleanupOpenApiDoc(openApiDoc));

  const port = config.get('PORT', { infer: true });
  await app.listen(port);

  Logger.log('API: http://localhost:' + port + '/' + GLOBAL_PREFIX, 'Bootstrap');
  Logger.log('Swagger: http://localhost:' + port + '/api/docs', 'Bootstrap');
}

void bootstrap();
