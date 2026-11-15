// Validasi form pengajuan pemilik kos. Pesan ditampilkan di bawah tiap field pada halaman /pemilik,
// jadi semuanya ditulis khusus, bukan pesan bawaan zod.
import { noNulCharacter, z } from '../../lib/zod.js';

const WHATSAPP_NUMBER = /^\d{9,15}$/;

/** Email dipakai huruf kecil. Nomor WhatsApp boleh ditulis dengan +, spasi, atau tanda hubung. */
const contact = z
  .string({ error: 'Kontak wajib diisi.' })
  .trim()
  .transform((value, context) => {
    if (z.email().safeParse(value).success) return value.toLowerCase();

    const digits = value.replace(/^\+/, '').replace(/[\s-]/g, '');
    if (WHATSAPP_NUMBER.test(digits)) return digits;

    context.addIssue({ code: 'custom', message: 'Isi dengan email yang valid, atau nomor WhatsApp 9 sampai 15 digit.' });
    return z.NEVER;
  });

export const ownerApplicationSchema = z.object({
  ownerName: z
    .string({ error: 'Nama pemilik wajib diisi.' })
    .trim()
    .min(2, 'Nama pemilik minimal 2 karakter.')
    .max(120, 'Nama pemilik maksimal 120 karakter.')
    .refine(noNulCharacter.check, noNulCharacter.message),
  contact,
  propertyAddress: z
    .string({ error: 'Alamat kos wajib diisi.' })
    .trim()
    .min(5, 'Alamat kos minimal 5 karakter.')
    .max(300, 'Alamat kos maksimal 300 karakter.')
    .refine(noNulCharacter.check, noNulCharacter.message),
  roomCount: z
    .number({ error: 'Jumlah kamar wajib diisi dengan angka.' })
    .int('Jumlah kamar harus bilangan bulat.')
    .min(1, 'Jumlah kamar minimal 1.')
    .max(10_000, 'Jumlah kamar terlalu besar.'),
  monthlyRentIdr: z
    .number({ error: 'Sewa per bulan wajib diisi dengan angka.' })
    .int('Sewa per bulan harus bilangan bulat.')
    .min(1, 'Sewa per bulan minimal Rp1.'),
  occupancyPercent: z
    .number({ error: 'Okupansi wajib diisi dengan angka.' })
    .min(0, 'Okupansi minimal 0 persen.')
    .max(100, 'Okupansi maksimal 100 persen.'),
  consent: z.literal(true, { error: 'Persetujuan wajib dicentang.' }),
});

/** Nomor pengajuan, mis. AJU-SMR-2026-0007. Urutan empat digit dan mulai lagi tiap tahun. */
export function formatApplicationNumber(year: number, sequence: number): string {
  return `AJU-SMR-${year}-${String(sequence).padStart(4, '0')}`;
}
