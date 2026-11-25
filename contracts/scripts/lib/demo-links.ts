import { id, Interface, type LogDescription } from "ethers";

import { ConfigError } from "./errors.js";
import type { DeploymentRecord } from "./deployment-record.js";

/*
 * Fungsi bersama `scripts/links.ts`: menyusun tautan Etherscan untuk presentasi dan README dari
 * berkas hasil deploy (contracts/deployments/<jaringan>.json) dan event KosToken serta KosLedger.
 *
 * Event dibaca dari salah satu dari dua sumber:
 * - API Etherscan (getLogs), dipakai di Sepolia bila ETHERSCAN_API_KEY terisi. Tidak dibatasi
 *   rentang blok, jadi cocok untuk RPC paket gratis.
 * - eth_getLogs ke RPC, per potongan rentang blok (LINKS_BLOCK_RANGE). Dipakai di Hardhat lokal dan
 *   bila API key Etherscan tidak ada. Paket gratis Alchemy hanya mengizinkan rentang 10 blok.
 *
 * Yang dicetak hanya data publik yang juga terlihat di Etherscan: alamat, tx hash, kode kamar,
 * periode, nominal, dan hash referensi. Tidak ada nama, kunci, maupun URL RPC.
 */

// ---------------------------------------------------------------------
// Opsi dari variabel environment
// ---------------------------------------------------------------------

export type LinksFormat = "teks" | "markdown";
export type LinksSource = "auto" | "rpc" | "etherscan";

export interface LinksOptions {
  format: LinksFormat;
  source: LinksSource;
  /** Jumlah blok per permintaan eth_getLogs ke RPC. */
  blockRange: number;
}

/** Rentang bawaan per permintaan eth_getLogs. Cukup untuk Infura dan Alchemy berbayar. */
export const DEFAULT_BLOCK_RANGE = 10_000;

/**
 * Membaca opsi dari variabel environment (`hardhat run` tidak meneruskan argumen ke skrip):
 * LINKS_FORMAT (teks | markdown), LINKS_SOURCE (auto | rpc | etherscan), LINKS_BLOCK_RANGE (bilangan
 * bulat 1 sampai 1.000.000). Nilai kosong berarti bawaan.
 */
export function parseLinksOptions(env: Readonly<Record<string, string | undefined>>): LinksOptions {
  const format = (env.LINKS_FORMAT?.trim() || "teks").toLowerCase();
  if (format !== "teks" && format !== "markdown") {
    throw new ConfigError(`LINKS_FORMAT "${format}" tidak dikenal. Pakai teks atau markdown.`);
  }
  const source = (env.LINKS_SOURCE?.trim() || "auto").toLowerCase();
  if (source !== "auto" && source !== "rpc" && source !== "etherscan") {
    throw new ConfigError(`LINKS_SOURCE "${source}" tidak dikenal. Pakai auto, rpc, atau etherscan.`);
  }
  const rangeText = env.LINKS_BLOCK_RANGE?.trim() || String(DEFAULT_BLOCK_RANGE);
  const blockRange = Number(rangeText);
  if (!/^\d+$/.test(rangeText) || !Number.isSafeInteger(blockRange) || blockRange < 1 || blockRange > 1_000_000) {
    throw new ConfigError(`LINKS_BLOCK_RANGE "${rangeText}" tidak valid. Isi bilangan bulat 1 sampai 1000000, mis. 10.`);
  }
  return { format, source, blockRange };
}

/** true bila API key berisi nilai sungguhan, bukan kosong atau placeholder dari .env.example. */
export function isUsableApiKey(value: string | undefined): value is string {
  const trimmed = value?.trim() ?? "";
  return trimmed !== "" && !trimmed.startsWith("ganti-dengan");
}

// ---------------------------------------------------------------------
// Sumber event
// ---------------------------------------------------------------------

/** Bentuk log yang dipakai skrip, sama untuk RPC dan API Etherscan. */
export interface RawLog {
  address: string;
  topics: readonly string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
}

export interface LogSource {
  /** Keterangan untuk dicetak, mis. "API Etherscan". */
  description: string;
  fetchLogs(addresses: readonly string[], fromBlock: number, toBlock: number): Promise<RawLog[]>;
}

/** Bagian provider ethers yang dibutuhkan sumber RPC. */
export interface LogProvider {
  getLogs(filter: { address: string[]; fromBlock: number; toBlock: number }): Promise<
    ReadonlyArray<{
      address: string;
      topics: ReadonlyArray<string>;
      data: string;
      blockNumber: number;
      transactionHash: string;
      index: number;
    }>
  >;
}

/**
 * eth_getLogs ke RPC per potongan `blockRange` blok, untuk semua alamat sekaligus. Bila RPC menolak
 * satu potongan, pembacaan berhenti dengan petunjuk; pesan asli RPC tidak dicetak karena bisa memuat
 * URL RPC beserta API key.
 */
export function rpcLogSource(provider: LogProvider, blockRange: number, onProgress?: (done: number, total: number) => void): LogSource {
  return {
    description: `RPC eth_getLogs, ${groupThousands(BigInt(blockRange))} blok per permintaan`,
    async fetchLogs(addresses, fromBlock, toBlock) {
      const logs: RawLog[] = [];
      const total = toBlock < fromBlock ? 0 : Math.ceil((toBlock - fromBlock + 1) / blockRange);
      let done = 0;
      for (let start = fromBlock; start <= toBlock; start += blockRange) {
        const end = Math.min(toBlock, start + blockRange - 1);
        let chunk: Awaited<ReturnType<LogProvider["getLogs"]>>;
        try {
          chunk = await provider.getLogs({ address: [...addresses], fromBlock: start, toBlock: end });
        } catch {
          throw new ConfigError(
            `RPC menolak eth_getLogs untuk blok ${start} sampai ${end}. Paket gratis Alchemy hanya mengizinkan ` +
              "rentang 10 blok: isi ETHERSCAN_API_KEY di contracts/.env supaya event dibaca lewat API Etherscan, " +
              "atau ulangi dengan LINKS_BLOCK_RANGE=10 (lebih lambat).",
          );
        }
        for (const log of chunk) {
          logs.push({
            address: log.address,
            topics: [...log.topics],
            data: log.data,
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            logIndex: log.index,
          });
        }
        done += 1;
        onProgress?.(done, total);
      }
      return sortLogs(logs);
    },
  };
}

/** Endpoint API Etherscan V2 (satu API key untuk semua jaringan, termasuk Sepolia). */
export const ETHERSCAN_V2_API = "https://api.etherscan.io/v2/api";

/** Batas baris per halaman getLogs Etherscan. */
const ETHERSCAN_PAGE_SIZE = 1_000;
/** Batas halaman per alamat (10.000 log), jauh di atas kebutuhan satu properti. */
const ETHERSCAN_MAX_PAGES = 10;

export interface EtherscanLogSourceOptions {
  apiKey: string;
  chainId: number;
  fetchFn?: typeof fetch;
  apiUrl?: string;
  /** Jeda antarpermintaan supaya tidak melewati batas laju API key gratis. */
  pauseMs?: number;
  /** Jeda sebelum mengulang permintaan yang ditolak karena batas laju. */
  retryDelayMs?: number;
  pageSize?: number;
}

interface EtherscanLogEntry {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
}

/** Bilangan heksadesimal (atau desimal) dari API Etherscan. "0x" dibaca 0. */
function etherscanNumber(value: string): number {
  if (value === "" || value === "0x") return 0;
  return Number(BigInt(value));
}

/**
 * getLogs API Etherscan V2 per alamat, dengan halaman 1.000 baris. API key hanya dikirim sebagai
 * parameter permintaan dan tidak pernah dicetak.
 */
export function etherscanLogSource(options: EtherscanLogSourceOptions): LogSource {
  const fetchFn = options.fetchFn ?? fetch;
  const apiUrl = options.apiUrl ?? ETHERSCAN_V2_API;
  const pauseMs = options.pauseMs ?? 350;
  const retryDelayMs = options.retryDelayMs ?? 1_100;
  const pageSize = options.pageSize ?? ETHERSCAN_PAGE_SIZE;
  const pause = () => new Promise((resolve) => setTimeout(resolve, pauseMs));

  async function request(params: URLSearchParams): Promise<EtherscanLogEntry[]> {
    for (let attempt = 1; ; attempt += 1) {
      let body: { status?: unknown; message?: unknown; result?: unknown };
      try {
        const response = await fetchFn(`${apiUrl}?${params.toString()}`, { signal: AbortSignal.timeout(20_000) });
        body = (await response.json()) as typeof body;
      } catch {
        throw new ConfigError("API Etherscan tidak bisa dihubungi. Periksa koneksi internet, atau pakai LINKS_SOURCE=rpc.");
      }
      if (Array.isArray(body.result)) return body.result as EtherscanLogEntry[];
      const reason = typeof body.result === "string" ? body.result : String(body.message ?? "tanpa keterangan");
      if (/rate limit/i.test(reason) && attempt < 4) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        continue;
      }
      throw new ConfigError(`API Etherscan menolak permintaan log: ${redactText(reason, [options.apiKey])}`);
    }
  }

  return {
    description: "API Etherscan (getLogs)",
    async fetchLogs(addresses, fromBlock, toBlock) {
      const logs: RawLog[] = [];
      let first = true;
      for (const address of addresses) {
        for (let page = 1; page <= ETHERSCAN_MAX_PAGES; page += 1) {
          if (!first) await pause();
          first = false;
          const params = new URLSearchParams({
            chainid: String(options.chainId),
            module: "logs",
            action: "getLogs",
            address,
            fromBlock: String(fromBlock),
            toBlock: String(toBlock),
            page: String(page),
            offset: String(pageSize),
            apikey: options.apiKey,
          });
          const entries = await request(params);
          for (const entry of entries) {
            logs.push({
              address: entry.address,
              topics: entry.topics,
              data: entry.data,
              blockNumber: etherscanNumber(entry.blockNumber),
              transactionHash: entry.transactionHash,
              logIndex: etherscanNumber(entry.logIndex),
            });
          }
          if (entries.length < pageSize) break;
        }
      }
      return sortLogs(logs);
    },
  };
}

function sortLogs(logs: RawLog[]): RawLog[] {
  return logs.sort((a, b) => a.blockNumber - b.blockNumber || a.logIndex - b.logIndex);
}

// ---------------------------------------------------------------------
// Tautan dan baris keluaran
// ---------------------------------------------------------------------

export interface LinkRow {
  /** Nama butir, mis. "Sewa 2026-11 K03". */
  label: string;
  /** Keterangan singkat, boleh kosong. */
  detail: string;
  /** Alamat atau tx hash lengkap; dicetak bila jaringan tidak punya penjelajah blok. */
  value: string;
  /** Tautan Etherscan, atau null untuk Hardhat lokal. */
  url: string | null;
}

export interface LinkSection {
  title: string;
  rows: LinkRow[];
  /** Ditampilkan bila `rows` kosong. */
  emptyText?: string;
}

type LinkKind = "address" | "tx" | "token";

/** `<penjelajah>/<jenis>/<nilai><akhiran>`, atau null bila jaringan tidak punya penjelajah blok. */
export function explorerLink(explorerUrl: string | null, kind: LinkKind, value: string, suffix = ""): string | null {
  return explorerUrl === null ? null : `${explorerUrl}/${kind}/${value}${suffix}`;
}

/** Kode kategori biaya yang dipakai backend (KONTRAK_P4 bagian 3). Kontrak hanya menyimpan kodenya. */
export const EXPENSE_CATEGORY_LABELS: Readonly<Record<number, string>> = {
  1: "Listrik dan air",
  2: "Kebersihan",
  3: "Internet",
  4: "Perbaikan",
  5: "Keamanan",
};

/** Rp1.500.000 */
export function formatRupiah(amount: bigint): string {
  return `Rp${groupThousands(amount)}`;
}

/** 43875 sen menjadi Rp438,75. */
export function formatSen(sen: bigint): string {
  const cents = (sen % 100n).toString().padStart(2, "0");
  return `Rp${groupThousands(sen / 100n)},${cents}`;
}

function groupThousands(value: bigint): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** 202611 menjadi 2026-11. */
export function formatPeriod(period: bigint | number): string {
  const text = String(period);
  return `${text.slice(0, 4)}-${text.slice(4)}`;
}

/** Nomor kamar 3 menjadi K03, sama dengan penamaan di backend. */
export function formatRoom(room: bigint | number): string {
  return `K${String(room).padStart(2, "0")}`;
}

/** 0x1234ab…cdef untuk hash panjang. */
export function shortHex(value: string): string {
  return value.length <= 14 ? value : `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/** Bagian yang berasal dari berkas hasil deploy saja: kontrak, dompet, dan transaksi penerbitan. */
export function deploymentSections(record: DeploymentRecord): LinkSection[] {
  const explorer = record.explorerUrl;
  const token = record.contracts.KosToken;
  const ledger = record.contracts.KosLedger;
  const verifiedNote = (contract: typeof token) =>
    contract.etherscan?.verified === true ? "kode sumber terverifikasi, tab Read Contract" : "kode sumber (belum diverifikasi)";
  const agreement = record.documents.find((document) => document.type === "DOCUMENT_MANAGEMENT_AGREEMENT");

  const contracts: LinkSection = {
    title: "Kontrak",
    rows: [
      {
        label: `KosToken ${record.tokenSymbol}`,
        detail: "halaman token: tab Holders dan Transfers",
        value: token.address,
        url: explorerLink(explorer, "token", token.address),
      },
      { label: "KosToken", detail: verifiedNote(token), value: token.address, url: explorerLink(explorer, "address", token.address, "#code") },
      {
        label: "KosLedger",
        detail: "tab Events: RentRecorded, ExpenseRecorded, PeriodClosed",
        value: ledger.address,
        url: explorerLink(explorer, "address", ledger.address, "#events"),
      },
      { label: "KosLedger", detail: verifiedNote(ledger), value: ledger.address, url: explorerLink(explorer, "address", ledger.address, "#code") },
    ],
  };

  const holderLink = (wallet: string) => explorerLink(explorer, "token", token.address, `?a=${wallet}`);
  const wallets: LinkSection = {
    title: "Dompet",
    rows: [
      {
        label: "Operator",
        detail: "pengirim semua transaksi harian worker",
        value: record.wallets.operator,
        url: explorerLink(explorer, "address", record.wallets.operator),
      },
      {
        label: "Admin",
        detail: "deploy, dokumen penerbitan, jeda darurat",
        value: record.wallets.admin,
        url: explorerLink(explorer, "address", record.wallets.admin),
      },
      {
        label: "Pemilik lama",
        detail: `saldo ${record.tokenSymbol} (${groupThousands(BigInt(record.parameters.originalOwnerAllocation))} token saat penerbitan)`,
        value: record.wallets.originalOwner,
        url: holderLink(record.wallets.originalOwner),
      },
      {
        label: "Perbendaharaan",
        detail: `saldo ${record.tokenSymbol} yang belum terjual`,
        value: record.wallets.treasury,
        url: holderLink(record.wallets.treasury),
      },
    ],
  };

  const issuance: LinkSection = {
    title: "Penerbitan",
    rows: [
      {
        label: "Deploy KosToken",
        detail: `hash sertifikat dan laporan penilaian versi 1, ${groupThousands(BigInt(record.parameters.originalOwnerAllocation))} token ke pemilik lama, ${groupThousands(BigInt(record.parameters.treasuryAllocation))} ke perbendaharaan`,
        value: token.deployTxHash,
        url: explorerLink(explorer, "tx", token.deployTxHash),
      },
      {
        label: "Deploy KosLedger",
        detail: `fee ${record.parameters.platformFeeBps} bp, pajak ${record.parameters.taxBps} bp`,
        value: ledger.deployTxHash,
        url: explorerLink(explorer, "tx", ledger.deployTxHash),
      },
      ...(agreement === undefined
        ? []
        : [
            {
              label: "Perjanjian pengelolaan",
              detail: `anchorDocument versi 1, SHA-256 ${shortHex(agreement.sha256)}`,
              value: agreement.txHash,
              url: explorerLink(explorer, "tx", agreement.txHash),
            },
          ]),
    ],
  };

  return [contracts, wallets, issuance];
}

export interface ContractInterfaces {
  token: Interface;
  ledger: Interface;
}

const ROLE_NAMES: Readonly<Record<string, string>> = {
  [`0x${"00".repeat(32)}`]: "DEFAULT_ADMIN_ROLE",
  [id("OPERATOR_ROLE")]: "OPERATOR_ROLE",
  [id("KYC_ROLE")]: "KYC_ROLE",
  [id("PAUSER_ROLE")]: "PAUSER_ROLE",
};

/**
 * Bagian yang berasal dari event: whitelist KYC, pembelian token, sewa, biaya, dan tutup periode,
 * ditambah dokumen versi baru, jeda darurat, dan perubahan peran bila ada. Log dari transaksi
 * penerbitan dilewati karena sudah ada di bagian Penerbitan.
 */
export function eventSections(logs: readonly RawLog[], record: DeploymentRecord, interfaces: ContractInterfaces): LinkSection[] {
  const explorer = record.explorerUrl;
  const tokenAddress = record.contracts.KosToken.address;
  const ledgerAddress = record.contracts.KosLedger.address;
  const issuanceTxs = new Set(
    [record.contracts.KosToken.deployTxHash, record.contracts.KosLedger.deployTxHash, ...record.documents.map((d) => d.txHash)].map(
      (hash) => hash.toLowerCase(),
    ),
  );
  const walletName = (address: string): string | null => {
    if (sameAddress(address, record.wallets.treasury)) return "perbendaharaan";
    if (sameAddress(address, record.wallets.originalOwner)) return "pemilik lama";
    if (sameAddress(address, record.wallets.operator)) return "operator";
    if (sameAddress(address, record.wallets.admin)) return "admin";
    return null;
  };
  const documentLabel = (typeHash: string) =>
    record.documents.find((document) => document.typeHash.toLowerCase() === typeHash.toLowerCase())?.label ?? `jenis ${shortHex(typeHash)}`;

  const kyc: LinkRow[] = [];
  const purchases: LinkRow[] = [];
  const rents: LinkRow[] = [];
  const expenses: LinkRow[] = [];
  const closes: LinkRow[] = [];
  const documents: LinkRow[] = [];
  const pauses: LinkRow[] = [];
  const roles: LinkRow[] = [];

  for (const log of logs) {
    if (issuanceTxs.has(log.transactionHash.toLowerCase())) continue;
    const isToken = sameAddress(log.address, tokenAddress);
    const isLedger = sameAddress(log.address, ledgerAddress);
    if (!isToken && !isLedger) continue;
    let parsed: LogDescription | null;
    try {
      parsed = (isToken ? interfaces.token : interfaces.ledger).parseLog({ topics: [...log.topics], data: log.data });
    } catch {
      parsed = null;
    }
    if (parsed === null) continue;

    const contractName = isToken ? "KosToken" : "KosLedger";
    const row = (label: string, detail: string): LinkRow => ({
      label,
      detail: `${detail}${detail === "" ? "" : ", "}tercatat di blok ${log.blockNumber}`,
      value: log.transactionHash,
      url: explorerLink(explorer, "tx", log.transactionHash),
    });
    const args = parsed.args;

    switch (`${contractName}.${parsed.name}`) {
      case "KosToken.KycStatusUpdated": {
        const account = String(args[0]);
        const who = walletName(account);
        kyc.push(row(args[1] === true ? "Lolos KYC" : "KYC dicabut", who === null ? account : `${who} ${account}`));
        break;
      }
      case "KosToken.TreasuryTransfer":
        purchases.push(row(`Pembelian ${groupThousands(args[2] as bigint)} token`, `ke ${String(args[1])}, ref ${shortHex(String(args[0]))}`));
        break;
      case "KosToken.DocumentAnchored":
        documents.push(row(`${documentLabel(String(args[0]))} versi ${args[3]}`, `hash ${shortHex(String(args[1]))}`));
        break;
      case "KosLedger.RentRecorded":
        rents.push(
          row(`Sewa ${formatPeriod(args[0] as bigint)} ${formatRoom(args[1] as bigint)}`, `${formatRupiah(args[3] as bigint)}, ref ${shortHex(String(args[2]))}`),
        );
        break;
      case "KosLedger.ExpenseRecorded": {
        const category = Number(args[1]);
        const categoryLabel = EXPENSE_CATEGORY_LABELS[category];
        expenses.push(
          row(
            `Biaya ${formatPeriod(args[0] as bigint)} kategori ${category}${categoryLabel === undefined ? "" : ` (${categoryLabel})`}`,
            `${formatRupiah(args[3] as bigint)}, nota ${shortHex(String(args[2]))}`,
          ),
        );
        break;
      }
      case "KosLedger.PeriodClosed":
        closes.push(
          row(
            `Tutup periode ${formatPeriod(args[0] as bigint)}`,
            `sewa kotor ${formatRupiah(args[1] as bigint)}, biaya ${formatRupiah(args[2] as bigint)}, sewa bersih ${formatRupiah(args[5] as bigint)}, ` +
              `${formatSen(args[7] as bigint)} per token, blok snapshot ${args[8]}`,
          ),
        );
        break;
      case "KosToken.Paused":
      case "KosLedger.Paused":
        pauses.push(row(`${contractName} dijeda`, `oleh ${walletName(String(args[0])) ?? String(args[0])}`));
        break;
      case "KosToken.Unpaused":
      case "KosLedger.Unpaused":
        pauses.push(row(`${contractName} dilanjutkan`, `oleh ${walletName(String(args[0])) ?? String(args[0])}`));
        break;
      case "KosToken.RoleGranted":
      case "KosLedger.RoleGranted":
      case "KosToken.RoleRevoked":
      case "KosLedger.RoleRevoked": {
        const role = ROLE_NAMES[String(args[0]).toLowerCase()] ?? shortHex(String(args[0]));
        const account = String(args[1]);
        const verb = parsed.name === "RoleGranted" ? "diberikan ke" : "dicabut dari";
        roles.push(row(`${contractName} ${role}`, `${verb} ${walletName(account) ?? account}`));
        break;
      }
      default:
        break;
    }
  }

  const sections: LinkSection[] = [
    { title: "Whitelist KYC", rows: kyc, emptyText: "belum ada" },
    { title: "Pembelian token dari perbendaharaan", rows: purchases, emptyText: "belum ada" },
    { title: "Sewa", rows: rents, emptyText: "belum ada" },
    { title: "Biaya", rows: expenses, emptyText: "belum ada" },
    { title: "Tutup periode", rows: closes, emptyText: "belum ada" },
  ];
  if (documents.length > 0) sections.push({ title: "Dokumen versi baru", rows: documents });
  if (pauses.length > 0) sections.push({ title: "Jeda darurat", rows: pauses });
  if (roles.length > 0) sections.push({ title: "Perubahan peran", rows: roles });
  return sections;
}

// ---------------------------------------------------------------------
// Keluaran
// ---------------------------------------------------------------------

export interface LinksHeader {
  title: string;
  lines: Array<[label: string, value: string]>;
}

/** Keluaran untuk terminal: setiap butir dua baris, keterangan lalu tautan. */
export function renderText(header: LinksHeader, sections: readonly LinkSection[]): string {
  const width = Math.max(...header.lines.map(([label]) => label.length));
  const out: string[] = [header.title, ...header.lines.map(([label, value]) => `  ${label.padEnd(width)} : ${value}`)];
  for (const section of sections) {
    out.push("", section.rows.length === 0 ? section.title : `${section.title} (${section.rows.length})`);
    if (section.rows.length === 0) out.push(`  ${section.emptyText ?? "tidak ada"}`);
    for (const row of section.rows) {
      out.push(`  ${row.label}${row.detail === "" ? "" : `: ${row.detail}`}`, `    ${row.url ?? row.value}`);
    }
  }
  return `${out.join("\n")}\n`;
}

function markdownCell(text: string): string {
  return text.replace(/\|/g, "\\|");
}

/** Keluaran Markdown untuk README: satu tabel per bagian. */
export function renderMarkdown(header: LinksHeader, sections: readonly LinkSection[]): string {
  const out: string[] = [`### ${header.title}`, "", ...header.lines.map(([label, value]) => `- ${label}: ${value}`)];
  for (const section of sections) {
    out.push("", `**${section.title}**`, "");
    if (section.rows.length === 0) {
      out.push(`${section.emptyText ?? "Tidak ada"}.`);
      continue;
    }
    out.push("| Butir | Keterangan | Tautan |", "|---|---|---|");
    for (const row of section.rows) {
      const isAddress = row.value.length === 42;
      const text = isAddress ? row.value : shortHex(row.value);
      const link = row.url === null ? `\`${row.value}\`` : `[${text}](${row.url})`;
      out.push(`| ${markdownCell(row.label)} | ${markdownCell(row.detail)} | ${link} |`);
    }
  }
  return `${out.join("\n")}\n`;
}

// ---------------------------------------------------------------------
// Penyaringan rahasia
// ---------------------------------------------------------------------

const URL_PATTERN = /\bhttps?:\/\/[^\s"'<>()]*[^\s"'<>().,;:!?]/gi;

/**
 * Mengganti nilai rahasia (minimal 8 karakter) dan semua URL http(s) dengan penanda, supaya pesan
 * error yang tampil di layar presentasi tidak memuat URL RPC berisi API key atau kunci apa pun.
 */
export function redactText(text: string, secrets: readonly (string | undefined)[]): string {
  let result = text;
  for (const secret of secrets) {
    if (secret !== undefined && secret.length >= 8) result = result.split(secret).join("[disamarkan]");
  }
  return result.replace(URL_PATTERN, "[url disamarkan]");
}
