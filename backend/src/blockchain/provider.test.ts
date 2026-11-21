// RPC tiruan berupa server HTTP lokal yang menjawab eth_chainId, jadi test tidak butuh jaringan.
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { FallbackProvider, JsonRpcProvider } from 'ethers';
import { afterEach, describe, expect, it } from 'vitest';
import { createChainConnection, verifyChainId } from './provider.js';

const servers: Server[] = [];
const connections: Array<{ destroy(): void }> = [];

/**
 * Server JSON-RPC yang menjawab eth_chainId, eth_blockNumber, dan eth_getTransactionCount (naik
 * setiap ditanya). URL-nya memuat "kunci API" rekaan.
 */
async function fakeRpc(chainId: number): Promise<string> {
  let nonce = 0;
  const server = createServer((request, response) => {
    let body = '';
    request.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    request.on('end', () => {
      const payload = JSON.parse(body) as { id: number; method: string };
      const result =
        payload.method === 'eth_chainId'
          ? `0x${chainId.toString(16)}`
          : payload.method === 'eth_getTransactionCount'
            ? `0x${(nonce++).toString(16)}`
            : '0x2a';
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ jsonrpc: '2.0', id: payload.id, result }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  servers.push(server);
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/v2/kunci-api-rekaan`;
}

/** Port yang pasti tertutup. */
const DEAD_RPC = 'http://127.0.0.1:1/v2/kunci-api-mati';

function connect(urls: string[], chainId: number) {
  const connection = createChainConnection(urls, chainId);
  connections.push(connection);
  return connection;
}

afterEach(async () => {
  for (const connection of connections.splice(0)) connection.destroy();
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))));
});

describe('createChainConnection', () => {
  it('satu URL memakai JsonRpcProvider biasa', async () => {
    const url = await fakeRpc(31_337);
    const connection = connect([url], 31_337);
    expect(connection.provider).toBeInstanceOf(JsonRpcProvider);
    await expect(connection.provider.getBlockNumber()).resolves.toBe(42);
  });

  it('tidak memakai cache ethers: nonce yang dibaca berturut-turut selalu jawaban baru dari RPC', async () => {
    const connection = connect([await fakeRpc(31_337)], 31_337);
    const address = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
    const first = await connection.provider.getTransactionCount(address, 'pending');
    const second = await connection.provider.getTransactionCount(address, 'pending');
    expect([first, second]).toEqual([0, 1]);
  });

  it('dua URL memakai FallbackProvider yang tetap menjawab saat RPC utama mati', async () => {
    const backup = await fakeRpc(31_337);
    const connection = connect([DEAD_RPC, backup], 31_337);
    expect(connection.provider).toBeInstanceOf(FallbackProvider);
    expect(connection.backends).toHaveLength(2);
    await expect(connection.provider.getBlockNumber()).resolves.toBe(42);
  });
});

describe('verifyChainId', () => {
  it('lolos bila semua RPC menunjuk chain id yang diharapkan', async () => {
    const urls = [await fakeRpc(11_155_111), await fakeRpc(11_155_111)];
    const checks = await verifyChainId(connect(urls, 11_155_111), urls, 11_155_111);
    expect(checks.map((check) => check.status)).toEqual(['OK', 'OK']);
  });

  it('menolak jalan bila ada RPC yang menunjuk jaringan lain', async () => {
    const urls = [await fakeRpc(11_155_111), await fakeRpc(1)];
    await expect(verifyChainId(connect(urls, 11_155_111), urls, 11_155_111)).rejects.toThrow(
      /RPC cadangan 127\.0\.0\.1:\d+ = 1\), padahal CHAIN_ID 11155111/,
    );
  });

  it('menolak jalan bila RPC lokal ternyata Hardhat padahal CHAIN_ID Sepolia', async () => {
    const urls = [await fakeRpc(31_337)];
    await expect(verifyChainId(connect(urls, 11_155_111), urls, 11_155_111)).rejects.toThrow(/RPC utama .* = 31337/);
  });

  it('RPC cadangan yang mati hanya dilaporkan, worker tetap jalan dengan RPC utama', async () => {
    const urls = [await fakeRpc(31_337), DEAD_RPC];
    const checks = await verifyChainId(connect(urls, 31_337), urls, 31_337);
    expect(checks.map((check) => check.status)).toEqual(['OK', 'UNREACHABLE']);
    expect(checks[1]?.error).not.toContain('kunci-api-mati');
  });

  it('menolak jalan bila tidak ada RPC yang bisa dihubungi, tanpa membocorkan URL', async () => {
    const error = await verifyChainId(connect([DEAD_RPC], 31_337), [DEAD_RPC], 31_337).catch((caught: unknown) => caught);
    expect((error as Error).message).toMatch(/^Tidak ada RPC yang bisa dihubungi \(127\.0\.0\.1:1: /);
    expect((error as Error).message).not.toContain('kunci-api-mati');
  });
});
