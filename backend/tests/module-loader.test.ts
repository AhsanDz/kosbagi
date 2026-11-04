// Test pemuat router otomatis (src/lib/module-loader.ts) dengan folder fixture.
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { loadModuleRouters } from '../src/lib/module-loader.js';

const fixture = (name: string) => fileURLToPath(new URL(`./fixtures/${name}/`, import.meta.url));
const SRC_MODULES = fileURLToPath(new URL('../src/modules/', import.meta.url));

describe('loadModuleRouters', () => {
  it('memasang folder yang berisi routes.ts di /api/<nama folder>', async () => {
    const app = express();
    const loaded = await loadModuleRouters(app, fixture('modules'));

    expect(loaded).toEqual(['sample']);
    const res = await request(app).get('/api/sample');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { module: 'sample' } });
  });

  it('melewati folder tanpa routes.ts (mis. hanya .gitkeep) dan file biasa', async () => {
    const loaded = await loadModuleRouters(express(), fixture('modules'));
    expect(loaded).not.toContain('empty');
    expect(loaded).not.toContain('README.md');
  });

  it('memuat routes.js saat aplikasi berjalan dari hasil build', async () => {
    const app = express();
    const loaded = await loadModuleRouters(app, fixture('modules-js'), '.js');

    expect(loaded).toEqual(['compiled']);
    const res = await request(app).get('/api/compiled');
    expect(res.body).toEqual({ data: { module: 'compiled' } });
  });

  it('menolak modul yang tidak mengekspor default Router', async () => {
    await expect(loadModuleRouters(express(), fixture('modules-invalid'))).rejects.toThrow(
      'Modul "broken": routes.ts harus mengekspor default sebuah Router Express.',
    );
  });

  it('menolak nama folder yang tidak bisa dijadikan URL', async () => {
    await expect(loadModuleRouters(express(), fixture('modules-bad-name'))).rejects.toThrow(
      /Nama folder modul "Bad_Name" tidak valid/,
    );
  });
});

describe('createApp', () => {
  it('memuat modul health dari src/modules dan melewati folder modul yang masih kosong', async () => {
    const app = await createApp();
    const modules = app.locals.modules as string[];

    expect(modules).toContain('health');
    // Folder yang punya routes.ts dimuat; folder yang baru berisi .gitkeep tidak.
    for (const entry of readdirSync(SRC_MODULES, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const hasRoutes = existsSync(path.join(SRC_MODULES, entry.name, 'routes.ts'));
      expect(modules.includes(entry.name), entry.name).toBe(hasRoutes);
    }
  });
});
