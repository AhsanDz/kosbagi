import { expect } from "chai";
import { network } from "hardhat";

import {
  deploymentSections,
  etherscanLogSource,
  eventSections,
  formatPeriod,
  formatRoom,
  formatRupiah,
  formatSen,
  isUsableApiKey,
  parseLinksOptions,
  redactText,
  renderMarkdown,
  renderText,
  rpcLogSource,
  shortHex,
  type LinkSection,
  type LogProvider,
  type RawLog,
} from "../scripts/lib/demo-links.js";
import type { DeploymentRecord } from "../scripts/lib/deployment-record.js";
import { ConfigError } from "../scripts/lib/errors.js";

const { ethers } = await network.create();

const SEPOLIA_EXPLORER = "https://sepolia.etherscan.io";
const PERIOD = 202_611;

/** Menunggu promise yang seharusnya gagal dan mengembalikan error-nya. */
async function rejectionOf(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise;
  } catch (error) {
    return error as Error;
  }
  throw new Error("Seharusnya gagal, ternyata berhasil");
}

/**
 * Deploy kecil dengan satu putaran transaksi: KYC, pembelian, sewa, biaya, tutup periode, jeda, dan
 * pergantian peran. Berkas hasil deploy dibentuk dari receipt, sama seperti scripts/deploy.ts.
 */
async function deployWithActivity() {
  const [admin, operator, originalOwner, treasury, investor, newOperator] = await ethers.getSigners();
  const certificate = ethers.sha256(ethers.toUtf8Bytes("contoh: sertifikat"));
  const appraisal = ethers.sha256(ethers.toUtf8Bytes("contoh: laporan penilaian"));
  const agreement = ethers.sha256(ethers.toUtf8Bytes("contoh: perjanjian pengelolaan"));

  const token = await ethers.deployContract(
    "KosToken",
    ["SMR01", certificate, appraisal, admin.address, operator.address, originalOwner.address, treasury.address, 5_400n, 12_600n],
    admin,
  );
  const ledger = await ethers.deployContract("KosLedger", [admin.address, operator.address, await token.getAddress(), 500n, 2_200n], admin);
  const tokenReceipt = await token.deploymentTransaction()!.wait();
  const ledgerReceipt = await ledger.deploymentTransaction()!.wait();
  const anchorReceipt = await (await token.connect(admin).anchorDocument(await token.DOCUMENT_MANAGEMENT_AGREEMENT(), agreement)).wait();

  const asOperator = token.connect(operator);
  const ledgerAsOperator = ledger.connect(operator);
  const buyRef = ethers.id("BUY-SMR01-0001");
  const rentRef = ethers.id("RENT-SMR01-K03-2026-11");
  const receiptHash = ethers.sha256(ethers.toUtf8Bytes("nota dummy perbaikan K07"));
  const txs = {
    kyc: await asOperator.setKycStatus(investor.address, true),
    purchase: await asOperator.transferFromTreasury(investor.address, 100n, buyRef),
    rent: await ledgerAsOperator.recordRent(3, PERIOD, 1_500_000n, rentRef),
    expense: await ledgerAsOperator.recordExpense(PERIOD, 4, 300_000n, receiptHash),
    close: await ledgerAsOperator.closePeriod(PERIOD),
    pause: await ledger.connect(admin).pause(),
    unpause: await ledger.connect(admin).unpause(),
    grant: await token.connect(admin).grantRole(await token.OPERATOR_ROLE(), newOperator.address),
  };

  const record = {
    network: "uji",
    chainId: 31_337,
    explorerUrl: null,
    ignitionDeploymentId: "uji",
    deployLabel: null,
    recordedAt: "2026-11-20T00:00:00.000Z",
    propertyCode: "SMR01",
    tokenSymbol: "KB-SMR01",
    compiler: { solc: "0.8.34", evmVersion: "osaka", buildProfile: "production", optimizerRuns: 200 },
    wallets: {
      admin: admin.address,
      operator: operator.address,
      originalOwner: originalOwner.address,
      treasury: treasury.address,
    },
    parameters: { originalOwnerAllocation: 5_400, treasuryAllocation: 12_600, platformFeeBps: 500, taxBps: 2_200 },
    contracts: {
      KosToken: {
        address: await token.getAddress(),
        fullyQualifiedName: "contracts/KosToken.sol:KosToken",
        deployTxHash: tokenReceipt!.hash,
        blockNumber: tokenReceipt!.blockNumber,
        gasUsed: tokenReceipt!.gasUsed.toString(),
        constructorArgs: [],
      },
      KosLedger: {
        address: await ledger.getAddress(),
        fullyQualifiedName: "contracts/KosLedger.sol:KosLedger",
        deployTxHash: ledgerReceipt!.hash,
        blockNumber: ledgerReceipt!.blockNumber,
        gasUsed: ledgerReceipt!.gasUsed.toString(),
        constructorArgs: [],
      },
    },
    documents: [
      {
        type: "DOCUMENT_MANAGEMENT_AGREEMENT",
        typeHash: await token.DOCUMENT_MANAGEMENT_AGREEMENT(),
        label: "Perjanjian pengelolaan",
        file: "docs/bisnis/dokumen-penerbitan/perjanjian-pengelolaan.md",
        sha256: agreement,
        sizeBytes: 1,
        version: 1,
        txHash: anchorReceipt!.hash,
        blockNumber: anchorReceipt!.blockNumber,
      },
    ],
    roles: { KosToken: {}, KosLedger: {} },
    totalGasUsed: "0",
  } satisfies DeploymentRecord;

  const interfaces = { token: token.interface, ledger: ledger.interface };
  const addresses = [record.contracts.KosToken.address, record.contracts.KosLedger.address];
  return { record, interfaces, addresses, txs, investor, buyRef, rentRef, receiptHash, toBlock: await ethers.provider.getBlockNumber() };
}

const deployed = await deployWithActivity();

function rowsOf(sections: readonly LinkSection[], title: string) {
  const section = sections.find((candidate) => candidate.title === title);
  expect(section, `bagian ${title}`).to.not.equal(undefined);
  return section!.rows;
}

/** Mengubah log RPC menjadi bentuk jawaban getLogs API Etherscan (angka heksadesimal, nol ditulis "0x"). */
function asEtherscanEntries(logs: readonly RawLog[]) {
  const hex = (value: number) => (value === 0 ? "0x" : `0x${value.toString(16)}`);
  return logs.map((log) => ({
    address: log.address.toLowerCase(),
    topics: [...log.topics],
    data: log.data,
    blockNumber: hex(log.blockNumber),
    blockHash: "0x",
    timeStamp: "0x6a00",
    gasPrice: "0x1",
    gasUsed: "0x1",
    logIndex: hex(log.logIndex),
    transactionHash: log.transactionHash,
    transactionIndex: "0x",
  }));
}

describe("Tautan demo Etherscan", function () {
  describe("Opsi dan format", function () {
    it("opsi bawaan teks, sumber otomatis, 10.000 blok; nilai tidak dikenal ditolak", function () {
      expect(parseLinksOptions({})).to.deep.equal({ format: "teks", source: "auto", blockRange: 10_000 });
      expect(parseLinksOptions({ LINKS_FORMAT: "Markdown", LINKS_SOURCE: "rpc", LINKS_BLOCK_RANGE: "10" })).to.deep.equal({
        format: "markdown",
        source: "rpc",
        blockRange: 10,
      });
      expect(parseLinksOptions({ LINKS_FORMAT: " ", LINKS_BLOCK_RANGE: "" })).to.deep.equal({
        format: "teks",
        source: "auto",
        blockRange: 10_000,
      });
      for (const env of [{ LINKS_FORMAT: "html" }, { LINKS_SOURCE: "infura" }, { LINKS_BLOCK_RANGE: "0" }, { LINKS_BLOCK_RANGE: "1e3" }]) {
        expect(() => parseLinksOptions(env)).to.throw(ConfigError);
      }
    });

    it("API key kosong atau placeholder .env.example tidak dipakai", function () {
      expect(isUsableApiKey(undefined)).to.equal(false);
      expect(isUsableApiKey("  ")).to.equal(false);
      expect(isUsableApiKey("ganti-dengan-api-key-etherscan")).to.equal(false);
      expect(isUsableApiKey("ABC123")).to.equal(true);
    });

    it("nominal, periode, kamar, dan hash ditulis seperti di aplikasi", function () {
      expect(formatRupiah(1_500_000n)).to.equal("Rp1.500.000");
      expect(formatRupiah(0n)).to.equal("Rp0");
      expect(formatSen(43_875n)).to.equal("Rp438,75");
      expect(formatSen(5n)).to.equal("Rp0,05");
      expect(formatPeriod(202_611n)).to.equal("2026-11");
      expect(formatRoom(3n)).to.equal("K03");
      expect(formatRoom(10)).to.equal("K10");
      expect(shortHex(`0x${"ab".repeat(32)}`)).to.equal("0xababab…abab");
    });

    it("pesan error disaring dari URL dan nilai rahasia", function () {
      const key = "kunci-etherscan-rahasia";
      expect(redactText(`gagal ke https://eth-sepolia.g.alchemy.com/v2/abc dengan ${key}.`, [key, undefined, "pendek"])).to.equal(
        "gagal ke [url disamarkan] dengan [disamarkan].",
      );
    });
  });

  describe("Berkas hasil deploy", function () {
    it("tautan Sepolia untuk kontrak, dompet, dan tiga transaksi penerbitan", function () {
      const record = { ...deployed.record, explorerUrl: SEPOLIA_EXPLORER };
      const [contracts, wallets, issuance] = deploymentSections(record);
      const token = record.contracts.KosToken.address;
      expect(contracts!.rows.map((row) => row.url)).to.deep.equal([
        `${SEPOLIA_EXPLORER}/token/${token}`,
        `${SEPOLIA_EXPLORER}/address/${token}#code`,
        `${SEPOLIA_EXPLORER}/address/${record.contracts.KosLedger.address}#events`,
        `${SEPOLIA_EXPLORER}/address/${record.contracts.KosLedger.address}#code`,
      ]);
      expect(contracts!.rows[1]!.detail).to.include("belum diverifikasi");
      expect(wallets!.rows.map((row) => row.url)).to.deep.equal([
        `${SEPOLIA_EXPLORER}/address/${record.wallets.operator}`,
        `${SEPOLIA_EXPLORER}/address/${record.wallets.admin}`,
        `${SEPOLIA_EXPLORER}/token/${token}?a=${record.wallets.originalOwner}`,
        `${SEPOLIA_EXPLORER}/token/${token}?a=${record.wallets.treasury}`,
      ]);
      expect(issuance!.rows.map((row) => row.url)).to.deep.equal([
        `${SEPOLIA_EXPLORER}/tx/${record.contracts.KosToken.deployTxHash}`,
        `${SEPOLIA_EXPLORER}/tx/${record.contracts.KosLedger.deployTxHash}`,
        `${SEPOLIA_EXPLORER}/tx/${record.documents[0]!.txHash}`,
      ]);
    });

    it("kontrak yang sudah diverifikasi ditandai; Hardhat lokal tanpa tautan", function () {
      const verified = structuredClone(deployed.record) as DeploymentRecord;
      verified.contracts.KosToken.etherscan = { verified: true, url: "x", checkedAt: "x" };
      expect(deploymentSections(verified)[0]!.rows[1]!.detail).to.include("terverifikasi");
      const local = deploymentSections(deployed.record);
      for (const row of local.flatMap((section) => section.rows)) {
        expect(row.url).to.equal(null);
        expect(row.value).to.match(/^0x[0-9a-fA-F]+$/);
      }
    });
  });

  describe("Event dari RPC", function () {
    it("membaca KYC, pembelian, sewa, biaya, tutup periode, jeda, dan peran; transaksi penerbitan dilewati", async function () {
      const record = { ...deployed.record, explorerUrl: SEPOLIA_EXPLORER };
      const logs = await rpcLogSource(ethers.provider, 10_000).fetchLogs(
        deployed.addresses,
        record.contracts.KosToken.blockNumber,
        deployed.toBlock,
      );
      const sections = eventSections(logs, record, deployed.interfaces);

      const kyc = rowsOf(sections, "Whitelist KYC");
      expect(kyc).to.have.length(1, "KYC pemilik lama dan perbendaharaan saat deploy tidak dihitung");
      expect(kyc[0]!.label).to.equal("Lolos KYC");
      expect(kyc[0]!.detail).to.include(deployed.investor.address);
      expect(kyc[0]!.url).to.equal(`${SEPOLIA_EXPLORER}/tx/${deployed.txs.kyc.hash}`);

      const purchase = rowsOf(sections, "Pembelian token dari perbendaharaan");
      expect(purchase.map((row) => row.label)).to.deep.equal(["Pembelian 100 token"]);
      expect(purchase[0]!.detail).to.include(shortHex(deployed.buyRef));
      expect(purchase[0]!.value).to.equal(deployed.txs.purchase.hash);

      const rent = rowsOf(sections, "Sewa");
      expect(rent.map((row) => row.label)).to.deep.equal(["Sewa 2026-11 K03"]);
      expect(rent[0]!.detail).to.match(/^Rp1\.500\.000, ref 0x[0-9a-f]{6}…[0-9a-f]{4}, tercatat di blok \d+$/);

      const expense = rowsOf(sections, "Biaya");
      expect(expense.map((row) => row.label)).to.deep.equal(["Biaya 2026-11 kategori 4 (Perbaikan)"]);
      expect(expense[0]!.detail).to.include(`Rp300.000, nota ${shortHex(deployed.receiptHash)}`);

      // 1.500.000 sewa, 75.000 fee, 300.000 biaya, pajak 22% dari 1.125.000 = 247.500, sewa bersih 877.500.
      const close = rowsOf(sections, "Tutup periode");
      expect(close.map((row) => row.label)).to.deep.equal(["Tutup periode 2026-11"]);
      expect(close[0]!.detail).to.include("sewa kotor Rp1.500.000, biaya Rp300.000, sewa bersih Rp877.500, Rp48,75 per token");
      expect(close[0]!.value).to.equal(deployed.txs.close.hash);

      expect(rowsOf(sections, "Jeda darurat").map((row) => row.label)).to.deep.equal(["KosLedger dijeda", "KosLedger dilanjutkan"]);
      expect(rowsOf(sections, "Jeda darurat")[0]!.detail).to.include("oleh admin");
      const roles = rowsOf(sections, "Perubahan peran");
      expect(roles.map((row) => row.label)).to.deep.equal(["KosToken OPERATOR_ROLE"], "peran dari konstruktor tidak dihitung");
      expect(roles[0]!.detail).to.include("diberikan ke 0x");
      expect(sections.some((section) => section.title === "Dokumen versi baru")).to.equal(false);
    });

    it("hasil sama untuk potongan 1 blok dan 10.000 blok; urut blok lalu indeks log", async function () {
      const from = deployed.record.contracts.KosToken.blockNumber;
      const whole = await rpcLogSource(ethers.provider, 10_000).fetchLogs(deployed.addresses, from, deployed.toBlock);
      const progress: Array<[number, number]> = [];
      const chunked = await rpcLogSource(ethers.provider, 1, (done, total) => progress.push([done, total])).fetchLogs(
        deployed.addresses,
        from,
        deployed.toBlock,
      );
      expect(chunked).to.deep.equal(whole);
      expect(progress.at(-1)).to.deep.equal([deployed.toBlock - from + 1, deployed.toBlock - from + 1]);
      const order = whole.map((log) => log.blockNumber * 1_000 + log.logIndex);
      expect(order).to.deep.equal([...order].sort((a, b) => a - b));
    });

    it("RPC yang menolak rentang blok memberi petunjuk tanpa mencetak pesan asli RPC", async function () {
      const provider: LogProvider = {
        getLogs: async () => {
          throw new Error("query exceeds max block range 10 (https://eth-sepolia.g.alchemy.com/v2/kunci-api-rahasia)");
        },
      };
      const error = await rejectionOf(rpcLogSource(provider, 10_000).fetchLogs(deployed.addresses, 0, 50_000));
      expect(error).to.be.instanceOf(ConfigError);
      expect(error.message).to.include("blok 0 sampai 9999");
      expect(error.message).to.include("ETHERSCAN_API_KEY");
      expect(error.message).to.include("LINKS_BLOCK_RANGE=10");
      expect(error.message).to.not.include("kunci-api-rahasia");
    });
  });

  describe("Event dari API Etherscan", function () {
    it("berhalaman per alamat dan menghasilkan bagian yang sama dengan RPC", async function () {
      const from = deployed.record.contracts.KosToken.blockNumber;
      const rpcLogs = await rpcLogSource(ethers.provider, 10_000).fetchLogs(deployed.addresses, from, deployed.toBlock);
      const requests: URL[] = [];
      const fetchFn = (async (input: string | URL | Request) => {
        const url = new URL(String(input));
        requests.push(url);
        const address = url.searchParams.get("address")!;
        const page = Number(url.searchParams.get("page"));
        const offset = Number(url.searchParams.get("offset"));
        const all = asEtherscanEntries(rpcLogs.filter((log) => log.address.toLowerCase() === address.toLowerCase()));
        const result = all.slice((page - 1) * offset, page * offset);
        const body = result.length === 0 ? { status: "0", message: "No records found", result: [] } : { status: "1", message: "OK", result };
        return new Response(JSON.stringify(body));
      }) as typeof fetch;

      const source = etherscanLogSource({ apiKey: "kunci-uji", chainId: 11_155_111, fetchFn, pauseMs: 0, pageSize: 5 });
      const logs = await source.fetchLogs(deployed.addresses, from, deployed.toBlock);
      const normalized = (items: readonly RawLog[]) => items.map((log) => ({ ...log, address: log.address.toLowerCase() }));
      expect(normalized(logs)).to.deep.equal(normalized(rpcLogs));
      expect(eventSections(logs, deployed.record, deployed.interfaces)).to.deep.equal(
        eventSections(rpcLogs, deployed.record, deployed.interfaces),
      );

      expect(requests.length).to.be.greaterThan(2, "log KosToken lebih dari satu halaman");
      const first = requests[0]!;
      expect(`${first.origin}${first.pathname}`).to.equal("https://api.etherscan.io/v2/api");
      expect(Object.fromEntries(first.searchParams)).to.deep.include({
        chainid: "11155111",
        module: "logs",
        action: "getLogs",
        fromBlock: String(from),
        toBlock: String(deployed.toBlock),
        page: "1",
        offset: "5",
        apikey: "kunci-uji",
      });
    });

    it("mengulang saat kena batas laju; penolakan lain berhenti tanpa mencetak API key", async function () {
      let calls = 0;
      const limited = (async () => {
        calls += 1;
        const body = calls < 3 ? { status: "0", message: "NOTOK", result: "Max rate limit reached" } : { status: "0", message: "No records found", result: [] };
        return new Response(JSON.stringify(body));
      }) as typeof fetch;
      const logs = await etherscanLogSource({ apiKey: "kunci-uji", chainId: 11_155_111, fetchFn: limited, pauseMs: 0, retryDelayMs: 0 }).fetchLogs(
        [deployed.addresses[0]!],
        0,
        10,
      );
      expect(logs).to.deep.equal([]);
      expect(calls).to.equal(3);

      const rejected = (async () =>
        new Response(JSON.stringify({ status: "0", message: "NOTOK", result: "Invalid API Key kunci-uji-rahasia" }))) as typeof fetch;
      const error = await rejectionOf(
        etherscanLogSource({ apiKey: "kunci-uji-rahasia", chainId: 11_155_111, fetchFn: rejected, pauseMs: 0 }).fetchLogs(
          [deployed.addresses[0]!],
          0,
          10,
        ),
      );
      expect(error).to.be.instanceOf(ConfigError);
      expect(error.message).to.include("Invalid API Key");
      expect(error.message).to.not.include("kunci-uji-rahasia");

      const offline = (async () => {
        throw new TypeError("fetch failed https://api.etherscan.io/v2/api?apikey=kunci-uji-rahasia");
      }) as typeof fetch;
      const offlineError = await rejectionOf(
        etherscanLogSource({ apiKey: "kunci-uji-rahasia", chainId: 11_155_111, fetchFn: offline, pauseMs: 0 }).fetchLogs(
          [deployed.addresses[0]!],
          0,
          10,
        ),
      );
      expect(offlineError.message).to.include("tidak bisa dihubungi");
      expect(offlineError.message).to.not.include("kunci-uji-rahasia");
    });
  });

  describe("Keluaran", function () {
    it("teks untuk terminal dan Markdown untuk README memuat semua butir", async function () {
      const record = { ...deployed.record, explorerUrl: SEPOLIA_EXPLORER };
      const logs = await rpcLogSource(ethers.provider, 10_000).fetchLogs(
        deployed.addresses,
        record.contracts.KosToken.blockNumber,
        deployed.toBlock,
      );
      const sections = [...deploymentSections(record), ...eventSections(logs, record, deployed.interfaces)];
      const header = { title: "Tautan Etherscan KosBagi SMR01 (KB-SMR01)", lines: [["Jaringan", "Sepolia (chain 11155111)"]] as Array<[string, string]> };

      const text = renderText(header, sections);
      expect(text).to.include("  Jaringan : Sepolia (chain 11155111)");
      expect(text).to.include("Sewa (1)\n  Sewa 2026-11 K03: Rp1.500.000");
      expect(text).to.include(`    ${SEPOLIA_EXPLORER}/tx/${deployed.txs.rent.hash}`);
      expect(text).to.not.include("undefined");

      const markdown = renderMarkdown(header, sections);
      expect(markdown).to.include("### Tautan Etherscan KosBagi SMR01 (KB-SMR01)");
      expect(markdown).to.include("| Butir | Keterangan | Tautan |");
      expect(markdown).to.include(`[${record.contracts.KosToken.address}](${SEPOLIA_EXPLORER}/token/${record.contracts.KosToken.address})`);
      expect(markdown).to.include(`[${shortHex(deployed.txs.close.hash)}](${SEPOLIA_EXPLORER}/tx/${deployed.txs.close.hash})`);

      const empty = renderText(header, [{ title: "Sewa", rows: [], emptyText: "belum ada" }]);
      expect(empty).to.include("Sewa\n  belum ada");
      const localMarkdown = renderMarkdown(header, deploymentSections(deployed.record));
      expect(localMarkdown).to.include(`\`${deployed.record.contracts.KosToken.address}\``);
    });
  });
});
