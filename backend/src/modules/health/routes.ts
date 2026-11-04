// Modul health: GET /api/health untuk mengecek bahwa server hidup.
// Sengaja tidak menyentuh basis data atau Redis, supaya tetap menjawab walau keduanya mati.
import { readFileSync } from 'node:fs';
import { Router } from 'express';
import { env } from '../../config/env.js';

// Versi diambil dari backend/package.json. Letaknya tiga folder di atas file ini,
// baik saat dijalankan dari src/ maupun dari hasil build di dist/.
const packageJson = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')) as {
  version: string;
};

const router = Router();

router.get('/', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    data: {
      status: 'ok',
      service: 'kosbagi-backend',
      version: packageJson.version,
      environment: env.NODE_ENV,
      time: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    },
  });
});

export default router;
