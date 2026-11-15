// Modul properties: data publik kos. Sengaja tidak menyertakan penghuni atau tagihan.
import { Router } from 'express';
import type { Property, Room } from '../../generated/prisma/client.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';

function toPropertyDto(property: Property & { rooms: Pick<Room, 'status'>[] }) {
  return {
    code: property.code,
    slug: property.slug,
    name: property.name,
    address: property.address,
    valuationIdr: Number(property.valuationIdr),
    tokenSymbol: property.tokenSymbol,
    totalTokens: property.totalTokens,
    tokenPriceIdr: Number(property.tokenPriceIdr),
    ownerTokens: property.ownerTokens,
    maxTokensPerInvestor: property.maxTokensPerInvestor,
    roomCount: property.rooms.length,
    occupiedRoomCount: property.rooms.filter((room) => room.status === 'OCCUPIED').length,
  };
}

const roomStatuses = { rooms: { select: { status: true } } };

// Slug selalu huruf kecil, angka, dan tanda hubung. Nilai lain, termasuk karakter NUL yang
// ditolak PostgreSQL, tidak mungkin cocok dengan properti mana pun.
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function propertyNotFound(): AppError {
  return new AppError(404, 'NOT_FOUND', 'Properti tidak ditemukan.');
}

const router = Router();

router.get('/', async (_req, res) => {
  const properties = await prisma.property.findMany({ orderBy: { code: 'asc' }, include: roomStatuses });
  res.json({ data: { properties: properties.map(toPropertyDto) } });
});

router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  if (!SLUG.test(slug)) throw propertyNotFound();

  const property = await prisma.property.findUnique({ where: { slug }, include: roomStatuses });
  if (!property) throw propertyNotFound();

  res.json({ data: { property: toPropertyDto(property) } });
});

router.get('/:slug/rooms', async (req, res) => {
  const { slug } = req.params;
  if (!SLUG.test(slug)) throw propertyNotFound();

  const property = await prisma.property.findUnique({
    where: { slug },
    select: {
      rooms: { orderBy: { number: 'asc' }, select: { number: true, status: true, monthlyRentIdr: true } },
    },
  });
  if (!property) throw propertyNotFound();

  const rooms = property.rooms.map((room) => ({ ...room, monthlyRentIdr: Number(room.monthlyRentIdr) }));
  res.json({ data: { rooms } });
});

export default router;
