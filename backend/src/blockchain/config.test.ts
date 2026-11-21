import { describe, expect, it } from 'vitest';
import { describeConfig, parseBlockchainConfig, secretValues } from './config.js';
import { redactSecrets } from './errors.js';
import { HARDHAT_MNEMONIC, HARDHAT_OPERATOR_KEY } from './testing/fakes.js';

const RPC = 'https://eth-sepolia.g.alchemy.com/v2/kunci-api-rekaan';
const valid = {
  SEPOLIA_RPC_URL: RPC,
  OPERATOR_PRIVATE_KEY: HARDHAT_OPERATOR_KEY,
  KOS_TOKEN_ADDRESS: '0x5fbdb2315678afecb367f032d93f642f64180aa3',
  KOS_LEDGER_ADDRESS: '0xE7F1725E7734CE288F8367E1BB143E90BB3F0512',
};

function errorOf(source: Record<string, string | undefined>): string {
  try {
    parseBlockchainConfig(source);
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error('seharusnya ditolak');
}

describe('parseBlockchainConfig', () => {
  it('bawaan Sepolia, alamat menjadi bentuk checksum, tanpa RPC cadangan dan mnemonic', () => {
    expect(parseBlockchainConfig(valid)).toEqual({
      chainId: 11_155_111,
      networkName: 'Sepolia',
      rpcUrls: [RPC],
      operatorPrivateKey: HARDHAT_OPERATOR_KEY,
      custodialMnemonic: undefined,
      tokenAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      ledgerAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    });
  });

  it('jaringan Hardhat lokal, RPC cadangan, dan mnemonic yang spasinya dirapikan', () => {
    const config = parseBlockchainConfig({
      ...valid,
      CHAIN_ID: '31337',
      SEPOLIA_RPC_URL: 'http://127.0.0.1:8545',
      SEPOLIA_RPC_URL_FALLBACK: RPC,
      CUSTODIAL_WALLET_MNEMONIC: `  ${HARDHAT_MNEMONIC.replace(' ', '   ')} `,
    });
    expect(config).toMatchObject({ chainId: 31_337, networkName: 'Hardhat lokal', rpcUrls: ['http://127.0.0.1:8545', RPC] });
    expect(config.custodialMnemonic).toBe(HARDHAT_MNEMONIC);
  });

  it('baris kosong di .env dianggap belum diisi', () => {
    const config = parseBlockchainConfig({ ...valid, SEPOLIA_RPC_URL_FALLBACK: '', CUSTODIAL_WALLET_MNEMONIC: ' ', CHAIN_ID: '' });
    expect(config.rpcUrls).toEqual([RPC]);
    expect(config.custodialMnemonic).toBeUndefined();
    expect(config.chainId).toBe(11_155_111);
  });

  it('menyebut semua variabel wajib yang kosong', () => {
    const message = errorOf({});
    for (const name of ['SEPOLIA_RPC_URL', 'OPERATOR_PRIVATE_KEY', 'KOS_TOKEN_ADDRESS', 'KOS_LEDGER_ADDRESS']) {
      expect(message).toMatch(new RegExp(`${name}: wajib diisi untuk worker`));
    }
  });

  it('petunjuk RPC lokal tetap utuh setelah pesan disaring seperti di log fatal worker', () => {
    const message = redactSecrets(errorOf({ ...valid, SEPOLIA_RPC_URL: undefined }), []);
    expect(message).toContain(
      'SEPOLIA_RPC_URL: wajib diisi untuk worker (URL RPC Alchemy atau Infura; untuk Hardhat lokal 127.0.0.1:8545 dengan awalan http)',
    );
    expect(message).not.toContain('[url disamarkan]');
  });

  it('hanya menerima Sepolia dan Hardhat lokal, mainnet ditolak', () => {
    expect(errorOf({ ...valid, CHAIN_ID: '1' })).toMatch(/CHAIN_ID: hanya 11155111 \(Sepolia\) atau 31337/);
    expect(errorOf({ ...valid, CHAIN_ID: 'sepolia' })).toMatch(/CHAIN_ID/);
  });

  it('menolak format yang salah', () => {
    expect(errorOf({ ...valid, OPERATOR_PRIVATE_KEY: 'ganti-dengan-private-key' })).toMatch(/OPERATOR_PRIVATE_KEY: harus 64/);
    expect(errorOf({ ...valid, OPERATOR_PRIVATE_KEY: `0x${'0'.repeat(64)}` })).toMatch(/OPERATOR_PRIVATE_KEY: tidak boleh bernilai nol/);
    expect(errorOf({ ...valid, KOS_TOKEN_ADDRESS: '0x123' })).toMatch(/KOS_TOKEN_ADDRESS: harus alamat Ethereum/);
    expect(errorOf({ ...valid, SEPOLIA_RPC_URL: 'wss://contoh' })).toMatch(/SEPOLIA_RPC_URL/);
    expect(errorOf({ ...valid, CUSTODIAL_WALLET_MNEMONIC: 'satu dua tiga' })).toMatch(/CUSTODIAL_WALLET_MNEMONIC: bukan mnemonic BIP-39/);
  });

  it('menolak alamat token dan ledger yang sama, serta RPC cadangan yang sama dengan RPC utama', () => {
    expect(errorOf({ ...valid, KOS_LEDGER_ADDRESS: valid.KOS_TOKEN_ADDRESS })).toMatch(/KOS_LEDGER_ADDRESS: tidak boleh sama/);
    expect(errorOf({ ...valid, SEPOLIA_RPC_URL_FALLBACK: RPC })).toMatch(/SEPOLIA_RPC_URL_FALLBACK: sama dengan SEPOLIA_RPC_URL/);
  });

  it('pesan error tidak pernah memuat nilai rahasia', () => {
    const message = errorOf({
      ...valid,
      SEPOLIA_RPC_URL: 'ftp://rahasia-rpc',
      OPERATOR_PRIVATE_KEY: `${HARDHAT_OPERATOR_KEY}ff`,
      CUSTODIAL_WALLET_MNEMONIC: 'kata rahasia yang salah',
    });
    expect(message).not.toContain('rahasia');
    expect(message).not.toContain(HARDHAT_OPERATOR_KEY.slice(2, 20));
  });

  it('menghasilkan objek yang tidak bisa diubah', () => {
    expect(Object.isFrozen(parseBlockchainConfig(valid))).toBe(true);
  });
});

describe('secretValues dan describeConfig', () => {
  const config = parseBlockchainConfig({ ...valid, CUSTODIAL_WALLET_MNEMONIC: HARDHAT_MNEMONIC });

  it('daftar rahasia memuat kunci, mnemonic, dan URL RPC', () => {
    expect(secretValues(config)).toEqual([HARDHAT_OPERATOR_KEY, HARDHAT_MNEMONIC, RPC]);
  });

  it('ringkasan untuk log tanpa rahasia: RPC hanya nama host', () => {
    const summary = JSON.stringify(describeConfig(config));
    expect(summary).toContain('eth-sepolia.g.alchemy.com');
    expect(summary).not.toContain('kunci-api-rekaan');
    expect(summary).not.toContain(HARDHAT_OPERATOR_KEY);
    expect(summary).not.toContain('junk');
  });
});
