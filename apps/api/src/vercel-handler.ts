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

export default function handler(req: unknown, res: unknown): void {
  // NOTE: intentionally NOT async — Vercel waits for res.end() on a sync
  // handler. An async handler whose promise resolves before Express finishes
  // can get the invocation frozen early.
  getExpressApp().then(
    (expressApp) => expressApp(req, res),
    (err) => {
      console.error('Vercel handler bootstrap failed:', err);
      const r = res as {
        headersSent?: boolean;
        statusCode?: number;
        end?: (body: string) => void;
      };
      if (!r.headersSent && typeof r.end === 'function') {
        r.statusCode = 500;
        r.end('Internal Server Error');
      }
    },
  );
}
