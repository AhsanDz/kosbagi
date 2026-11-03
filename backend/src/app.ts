// Merakit aplikasi Express: middleware keamanan dan log, router modul (dimuat otomatis),
// lalu penangan 404 dan error. Dipisah dari server.ts supaya test bisa memakai aplikasi
// yang sama tanpa membuka port.
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { bigIntReplacer } from './lib/json.js';
import { logger } from './lib/logger.js';
import { loadModuleRouters } from './lib/module-loader.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

const DEFAULT_MODULES_DIR = fileURLToPath(new URL('./modules/', import.meta.url));

/** Batas ukuran body JSON. Payload API dan notifikasi Midtrans jauh di bawah ini. */
const JSON_BODY_LIMIT = '100kb';

/** Header X-Request-Id dari klien dipakai bila formatnya aman; selain itu dibuat baru. */
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,64}$/;

export interface CreateAppOptions {
  /** Folder modul yang dimuat; default src/modules (atau dist/modules setelah build). */
  modulesDir?: string;
}

export async function createApp(options: CreateAppOptions = {}): Promise<Express> {
  const app = express();

  // JSON tidak mengenal BigInt: nominal rupiah dikirim sebagai number (lihat lib/json.ts).
  app.set('json replacer', bigIntReplacer);

  // 1. Log setiap permintaan + ID permintaan untuk menelusuri error.
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const incoming = req.headers['x-request-id'];
        const id = typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      customLogLevel: (_req, res, error) => {
        if (error || res.statusCode >= 500) return 'error';
        return res.statusCode >= 400 ? 'warn' : 'info';
      },
      // Hanya metode, URL, dan status yang dicatat; header (bisa berisi token) tidak.
      serializers: {
        req: (req: { id: unknown; method: string; url: string }) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
    }),
  );

  // 2. Keamanan dasar: header keamanan HTTP, CORS hanya untuk origin frontend, batas ukuran body.
  app.use(helmet());
  app.use(cors({ origin: [...env.CORS_ORIGIN] }));
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  // 3. Router modul: src/modules/<nama>/routes.ts dipasang di /api/<nama>.
  const modules = await loadModuleRouters(app, options.modulesDir ?? DEFAULT_MODULES_DIR);
  app.locals.modules = modules;
  logger.debug({ modules }, 'Modul API dimuat');

  // 4. Rute yang tidak dikenal, lalu semua error, dibalas JSON berformat sama.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
