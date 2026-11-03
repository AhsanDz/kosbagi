// Logger terstruktur (JSON) untuk seluruh backend, memakai pino.
// Saat development, log dirapikan oleh pino-pretty supaya mudah dibaca di terminal.
import { pino } from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'kosbagi-backend' },
  // Lapisan pengaman: bila objek yang dicatat memuat field rahasia, nilainya disamarkan.
  redact: {
    paths: [
      'password',
      'passwordHash',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.serverKey',
      '*.privateKey',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[disamarkan]',
  },
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname,service' },
        }
      : undefined,
});
