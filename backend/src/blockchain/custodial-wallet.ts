// Dompet kustodian investor: alamat ke-n dari mnemonic HD (BIP-32/BIP-44) di path
// m/44'/60'/0'/0/<n>. Basis data hanya menyimpan alamat dan nomor indeks (custodial_wallets);
// private key tidak pernah disimpan dan bisa diturunkan ulang dari mnemonic bila suatu saat perlu
// menandatangani permit (rencana pengembalian dana).
//
// Pembuatan dompet saat KYC disetujui ada di wilayah jalur 2. Di worker, fungsi ini dipakai untuk
// memastikan alamat tujuan job benar-benar turunan mnemonic kustodian pada indeks yang tercatat,
// sehingga token atau status KYC tidak bisa diarahkan ke alamat lain lewat data yang dipalsukan.
import { HDNodeWallet } from 'ethers';

/** Path induk; indeks investor menjadi anak terakhir (tanpa hardened). */
export const CUSTODIAL_BASE_PATH = "m/44'/60'/0'/0";
const MAX_INDEX = 2 ** 31 - 1;

export function custodialDerivationPath(index: number): string {
  assertIndex(index);
  return `${CUSTODIAL_BASE_PATH}/${index}`;
}

function assertIndex(index: number): void {
  if (!Number.isInteger(index) || index < 0 || index > MAX_INDEX) {
    throw new Error('Indeks dompet kustodian harus bilangan bulat 0 sampai 2^31 - 1.');
  }
}

export interface CustodialDeriver {
  /** Alamat checksum dompet kustodian pada indeks ini. */
  addressAt(index: number): string;
}

/**
 * Menyiapkan penurun alamat. Seed dihitung sekali (PBKDF2 2.048 putaran, agak lambat), lalu setiap
 * alamat cukup satu langkah turunan. Kunci induk hanya ada di closure, jadi tidak ikut tercetak bila
 * objek yang dikembalikan masuk log.
 */
export function createCustodialDeriver(mnemonic: string): CustodialDeriver {
  const parent = HDNodeWallet.fromPhrase(mnemonic, '', CUSTODIAL_BASE_PATH);
  return {
    addressAt(index: number): string {
      assertIndex(index);
      return parent.deriveChild(index).address;
    },
  };
}
