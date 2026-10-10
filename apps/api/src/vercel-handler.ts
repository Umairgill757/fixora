import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

/**
 * Vercel serverless entry point. The same NestJS app, but instead of
 * `app.listen()` (long-lived process) the underlying Express instance
 * handles each invocation's (req, res) directly — the native Vercel
 * serverless pattern. Local dev (`nest start`) is untouched.
 */

type ReqResHandler = (req: unknown, res: unknown) => void;

let cachedApp: ReqResHandler | null = null;

async function getExpressApp(): Promise<ReqResHandler> {
  if (!cachedApp) {
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
    cachedApp = app.getHttpAdapter().getInstance() as ReqResHandler;
  }
  return cachedApp;
}

export default async function handler(req: unknown, res: unknown): Promise<void> {
  const expressApp = await getExpressApp();
  expressApp(req, res);
}
