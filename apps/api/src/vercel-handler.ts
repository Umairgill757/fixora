import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { configure as serverlessExpress } from '@vendia/serverless-express';
import { AppModule } from './app.module.js';

/**
 * Vercel serverless entry point. The same NestJS app, wrapped so it runs
 * as a serverless function instead of a long-lived process.
 * Local dev (`nest start`) is untouched — this file is only used on Vercel.
 */

let cachedHandler: ((event: unknown, context: unknown) => Promise<unknown>) | null = null;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  const origins = (process.env.WEB_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins });
  app.setGlobalPrefix('v1');
  await app.init();
  const expressApp = app.getHttpAdapter().getInstance();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  return serverlessExpress({ app: expressApp }) as (
    event: unknown,
    context: unknown,
  ) => Promise<unknown>;
}

export default async function handler(event: unknown, context: unknown) {
  if (!cachedHandler) {
    cachedHandler = await bootstrap();
  }
  return cachedHandler(event, context);
}
