// Meniru hasil build di dist/: modul berekstensi .js.
import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ data: { module: 'compiled' } });
});

export default router;
