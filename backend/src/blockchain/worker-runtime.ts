// Merakit worker blockchain: koneksi RPC, dompet operator, klien kontrak, pemeriksaan awal, kunci
// tunggal, Worker BullMQ, dan dispatcher outbox. src/worker.ts hanya memanggil startBlockchainWorker
// dan menangani sinyal berhenti; test alur penuh memanggil fungsi yang sama.
//
// Pemeriksaan awal sengaja ketat. Lebih baik worker menolak jalan dengan pesan jelas daripada
// mengirim transaksi ke jaringan atau kontrak yang salah.
import { type RedisOptions, Worker } from 'bullmq';
import { formatEther, parseEther, Wallet } from 'ethers';
import type { Logger } from 'pino';
import { env } from '../config/env.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import { logger as rootLogger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { createBlockchainQueue, producerConnection, workerConnection } from '../queue/blockchain-queue.js';
import { BLOCKCHAIN_QUEUE_NAME, type BlockchainJobData } from '../queue/jobs.js';
import { type OutboxDispatcher, startOutboxDispatcher } from '../queue/outbox-dispatcher.js';
import { type ExecutorTiming, TIMING_BY_CHAIN } from './chain-executor.js';
import { type BlockchainConfig, describeConfig, secretValues } from './config.js';
import { type DeploymentInfo, KosContracts } from './contracts.js';
import { createCustodialDeriver } from './custodial-wallet.js';
import { safeErrorMessage } from './errors.js';
import { etherscanAddressUrl } from './etherscan.js';
import { type BlockchainJobResult, createBlockchainProcessor } from './processors.js';
import { type ChainConnection, createChainConnection, verifyChainId } from './provider.js';
import { createPrismaChainStore } from './store.js';
import { acquireWorkerLock, type WorkerLock, workerLockKey } from './worker-lock.js';

/** Di bawah saldo ini worker memberi peringatan: satu bulan pencatatan butuh sekitar 0,001 sampai 0,01 ETH. */
const LOW_BALANCE_WARNING = parseEther('0.01');

export interface StartBlockchainWorkerOptions {
  config: BlockchainConfig;
  db?: PrismaClient;
  /** Bawaan `blockchain`. Test memakai nama acak supaya tidak bercampur dengan antrean lain. */
  queueName?: string;
  /** Bawaan REDIS_URL. */
  redisUrl?: string;
  dispatchIntervalMs?: number;
  timing?: ExecutorTiming;
  lockWaitMs?: number;
  logger?: Logger;
  /** Dipanggil bila worker harus berhenti sendiri, mis. kunci tunggalnya hilang. */
  onFatal?: (error: Error) => void;
}

export interface RunningBlockchainWorker {
  operatorAddress: string;
  deployment: DeploymentInfo;
  worker: Worker<BlockchainJobData, BlockchainJobResult>;
  /** Berhenti rapi: dispatcher berhenti, job yang sedang berjalan ditunggu selesai, koneksi ditutup. */
  stop(): Promise<void>;
}

async function readRole(contracts: KosContracts, contract: 'token' | 'ledger', name: string): Promise<string> {
  const target = contract === 'token' ? contracts.token : contracts.ledger;
  return (await target.getFunction(name).staticCall()) as string;
}

/** Memastikan kedua alamat benar-benar KosToken dan KosLedger yang saling terikat, dan operator punya perannya. */
async function preflight(
  connection: ChainConnection,
  contracts: KosContracts,
  operatorAddress: string,
  config: BlockchainConfig,
  log: Logger,
): Promise<DeploymentInfo> {
  const provider = connection.provider;
  const [tokenCode, ledgerCode] = await Promise.all([
    provider.getCode(contracts.tokenAddress),
    provider.getCode(contracts.ledgerAddress),
  ]);
  if (tokenCode === '0x') throw new Error(`Tidak ada kontrak di KOS_TOKEN_ADDRESS pada jaringan ${config.networkName}.`);
  if (ledgerCode === '0x') throw new Error(`Tidak ada kontrak di KOS_LEDGER_ADDRESS pada jaringan ${config.networkName}.`);

  let deployment: DeploymentInfo;
  let ledgerToken: string;
  try {
    deployment = await contracts.readDeployment();
    ledgerToken = await contracts.ledgerTokenAddress();
  } catch (error) {
    throw new Error(
      `Kontrak di alamat yang dikonfigurasi tidak bisa dibaca sebagai KosToken dan KosLedger (${safeErrorMessage(error, secretValues(config))}).`,
    );
  }
  if (ledgerToken !== contracts.tokenAddress) {
    throw new Error('KosLedger di KOS_LEDGER_ADDRESS terikat ke KosToken lain, bukan KOS_TOKEN_ADDRESS.');
  }

  const required: Array<[contract: 'token' | 'ledger', role: string, label: string]> = [
    ['token', 'OPERATOR_ROLE', 'OPERATOR_ROLE di KosToken'],
    ['token', 'KYC_ROLE', 'KYC_ROLE di KosToken'],
    ['ledger', 'OPERATOR_ROLE', 'OPERATOR_ROLE di KosLedger'],
  ];
  const missing: string[] = [];
  for (const [contract, roleName, label] of required) {
    const role = await readRole(contracts, contract, roleName);
    if (!(await contracts.hasRole(contract, role, operatorAddress))) missing.push(label);
  }
  if (missing.length > 0) {
    throw new Error(`Dompet operator ${operatorAddress} belum memegang ${missing.join(', ')}. Berikan perannya dari dompet admin.`);
  }

  const balance = await provider.getBalance(operatorAddress);
  if (balance < LOW_BALANCE_WARNING) {
    log.warn({ operatorAddress, balanceEth: formatEther(balance) }, 'Saldo ETH dompet operator rendah; isi dari faucet Sepolia');
  } else {
    log.info({ operatorAddress, balanceEth: formatEther(balance) }, 'Saldo ETH dompet operator');
  }
  return deployment;
}

function redisConnections(redisUrl: string | undefined): { worker: RedisOptions; producer: RedisOptions } {
  if (!redisUrl) return { worker: workerConnection, producer: producerConnection };
  return {
    worker: { ...workerConnection, url: redisUrl },
    producer: { ...producerConnection, url: redisUrl },
  };
}

export async function startBlockchainWorker(options: StartBlockchainWorkerOptions): Promise<RunningBlockchainWorker> {
  const { config } = options;
  const db = options.db ?? prisma;
  const queueName = options.queueName ?? BLOCKCHAIN_QUEUE_NAME;
  const log = (options.logger ?? rootLogger).child({ component: 'worker-blockchain' });
  const secrets = secretValues(config);
  const timing = options.timing ?? TIMING_BY_CHAIN[config.chainId];
  if (!timing) throw new Error(`Jaringan ${config.chainId} tidak didukung worker.`);

  log.info(describeConfig(config), 'Menyiapkan worker blockchain');

  const connection = createChainConnection(config.rpcUrls, config.chainId);
  let lock: WorkerLock | undefined;
  let worker: Worker<BlockchainJobData, BlockchainJobResult> | undefined;
  try {
    const checks = await verifyChainId(connection, config.rpcUrls, config.chainId);
    for (const check of checks.filter((item) => item.status === 'UNREACHABLE')) {
      log.warn({ rpc: check.host, err: check.error }, 'RPC tidak bisa dihubungi; worker memakai RPC lain');
    }

    const signer = new Wallet(config.operatorPrivateKey, connection.provider);
    const contracts = new KosContracts(config.tokenAddress, config.ledgerAddress, connection.provider);
    const deployment = await preflight(connection, contracts, signer.address, config, log);

    const custodial = config.custodialMnemonic ? createCustodialDeriver(config.custodialMnemonic) : null;
    if (!custodial) {
      log.warn({}, 'CUSTODIAL_WALLET_MNEMONIC kosong: alamat dompet kustodian hanya dicocokkan ke tabel custodial_wallets');
    }

    lock = await acquireWorkerLock({
      redisUrl: options.redisUrl ?? env.REDIS_URL,
      key: workerLockKey(config.chainId, signer.address),
      ...(options.lockWaitMs === undefined ? {} : { waitMs: options.lockWaitMs }),
      onLost: () => options.onFatal?.(new Error('Kunci tunggal worker di Redis hilang; worker dihentikan supaya nonce tidak berebut.')),
    });

    const processor = createBlockchainProcessor({
      store: createPrismaChainStore(db),
      contracts,
      deployment,
      custodial,
      provider: connection.provider,
      signer,
      chainId: config.chainId,
      timing,
      secrets,
      logger: log,
    });

    const connections = redisConnections(options.redisUrl);
    // Konkurensi 1: transaksi dikirim satu per satu, jadi nonce dompet operator tidak berebut.
    worker = new Worker<BlockchainJobData, BlockchainJobResult>(queueName, processor, {
      connection: connections.worker,
      concurrency: 1,
    });
    worker.on('failed', (job, error) => {
      if (!job) return;
      const willRetry = job.attemptsMade < (job.opts.attempts ?? 1) && error.name !== 'PermanentJobError';
      log.debug({ jobId: job.id, attemptsMade: job.attemptsMade, willRetry }, 'Status job gagal di antrean');
    });
    worker.on('stalled', (jobId) => {
      log.warn({ jobId }, 'Job tertahan (proses sebelumnya berhenti saat mengerjakannya); BullMQ mengulangnya');
    });
    worker.on('error', (error) => {
      log.error({ err: safeErrorMessage(error, secrets) }, 'Worker BullMQ bermasalah');
    });

    const queue = createBlockchainQueue(queueName, connections.producer);
    const dispatcher: OutboxDispatcher = startOutboxDispatcher(queue, {
      db,
      ...(options.dispatchIntervalMs === undefined ? {} : { intervalMs: options.dispatchIntervalMs }),
    });

    const startedWorker = worker;
    const startedLock = lock;
    let stopping: Promise<void> | undefined;
    log.info(
      {
        operatorAddress: signer.address,
        operatorUrl: etherscanAddressUrl(signer.address, config.chainId),
        propertyCode: deployment.propertyCode,
        queue: queueName,
      },
      `Worker blockchain berjalan di ${config.networkName}`,
    );

    return {
      operatorAddress: signer.address,
      deployment,
      worker: startedWorker,
      stop() {
        stopping ??= (async () => {
          log.info({}, 'Menghentikan worker blockchain');
          await dispatcher.stop();
          await startedWorker.close();
          await queue.close();
          await startedLock.release();
          connection.destroy();
          log.info({}, 'Worker blockchain berhenti');
        })();
        return stopping;
      },
    };
  } catch (error) {
    await worker?.close().catch(() => undefined);
    await lock?.release().catch(() => undefined);
    connection.destroy();
    throw error;
  }
}
