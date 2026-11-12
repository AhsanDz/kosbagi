import { describe, expect, it } from 'vitest';
import { formatApplicationNumber, ownerApplicationSchema } from './schema.js';

const valid = {
  ownerName: 'Budi Santoso',
  contact: 'budi.dummy@kosbagi.test',
  propertyAddress: 'Jl. Sumbersari Gang 3 No. 12, Malang',
  roomCount: 10,
  monthlyRentIdr: 1_500_000,
  occupancyPercent: 90,
  consent: true,
};

function errorPaths(input: unknown): string[] {
  const result = ownerApplicationSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
}

describe('ownerApplicationSchema', () => {
  it('menerima isian yang valid', () => {
    expect(ownerApplicationSchema.parse(valid)).toEqual(valid);
  });

  it('menyebut setiap field yang kosong memakai nama field kontrak', () => {
    expect(errorPaths({}).sort()).toEqual(
      ['consent', 'contact', 'monthlyRentIdr', 'occupancyPercent', 'ownerName', 'propertyAddress', 'roomCount'].sort(),
    );
  });

  it.each([
    ['budi@kosbagi.test', 'budi@kosbagi.test'],
    ['BUDI@KosBagi.Test', 'budi@kosbagi.test'],
    ['081234567890', '081234567890'],
    ['+62 812-3456-7890', '6281234567890'],
    ['123456789', '123456789'],
    ['123456789012345', '123456789012345'],
  ])('kontak %s disimpan sebagai %s', (input, expected) => {
    expect(ownerApplicationSchema.parse({ ...valid, contact: input }).contact).toBe(expected);
  });

  it.each(['bukan-kontak', 'budi@', '12345678', '1234567890123456', '0812abc7890'])('menolak kontak %s', (input) => {
    expect(errorPaths({ ...valid, contact: input })).toEqual(['contact']);
  });

  it('roomCount dan monthlyRentIdr harus bilangan bulat minimal 1', () => {
    expect(errorPaths({ ...valid, roomCount: 0 })).toEqual(['roomCount']);
    expect(errorPaths({ ...valid, roomCount: 1.5 })).toEqual(['roomCount']);
    expect(errorPaths({ ...valid, monthlyRentIdr: 0 })).toEqual(['monthlyRentIdr']);
    expect(errorPaths({ ...valid, monthlyRentIdr: '1500000' })).toEqual(['monthlyRentIdr']);
  });

  it('occupancyPercent harus 0 sampai 100', () => {
    expect(errorPaths({ ...valid, occupancyPercent: 0 })).toEqual([]);
    expect(errorPaths({ ...valid, occupancyPercent: 100 })).toEqual([]);
    expect(errorPaths({ ...valid, occupancyPercent: -1 })).toEqual(['occupancyPercent']);
    expect(errorPaths({ ...valid, occupancyPercent: 101 })).toEqual(['occupancyPercent']);
  });

  it('consent harus true', () => {
    expect(errorPaths({ ...valid, consent: false })).toEqual(['consent']);
    expect(errorPaths({ ...valid, consent: 'true' })).toEqual(['consent']);
  });
});

describe('formatApplicationNumber', () => {
  it('urutan empat digit', () => {
    expect(formatApplicationNumber(2026, 7)).toBe('AJU-SMR-2026-0007');
    expect(formatApplicationNumber(2027, 1234)).toBe('AJU-SMR-2027-1234');
  });
});
