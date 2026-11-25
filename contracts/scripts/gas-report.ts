import { id, sha256, Signature, toUtf8Bytes, type ContractTransactionResponse, type TransactionResponse } from "ethers";
import hre, { network } from "hardhat";

import { ConfigError } from "./lib/errors.js";
import { DEFAULT_ISSUANCE_DOCS_DIR, hashIssuanceDocuments } from "./lib/issuance-documents.js";

/*
 * Mengukur gas setiap fungsi tulis KosToken dan KosLedger di jaringan Hardhat dalam proses dengan
 * bytecode profil production (yang di-deploy ke Sepolia). Skenarionya satu putaran demo November:
 * deploy dan tiga dokumen penerbitan, lima whitelist KYC, enam pembelian token (pembelian Bagas
 * dipecah dua), sembilan sewa, lima biaya, lalu tutup periode dengan angka bisnis yang disepakati.
 * Sesudahnya fungsi tulis lain di luar demo: dokumen versi baru, pencabutan KYC, transfer
 * antarpemegang, approve, permit + transferFrom, jeda, dan pergantian peran.
 *
 * Perintah: `npm run gas:report` (dari folder contracts/). Hasilnya tabel Markdown di
 * docs/kontrak/keamanan-dan-gas.md bagian 9. Tidak butuh jaringan luar, ETH, maupun file .env.
 */

type Wallet = "admin" | "operator" | "pemegang token";

interface Measurement {
  contract: "KosToken" | "KosLedger";
  fn: string;
  scenario: string;
  wallet: Wallet;
  gas: bigint;
  /** true bila transaksi ini bagian dari satu putaran demo. */
  demo: boolean;
}

const measurements: Measurement[] = [];

async function measure(
  sent: ContractTransactionResponse | TransactionResponse | null,
  entry: Omit<Measurement, "gas">,
): Promise<void> {
  if (sent === null) throw new Error(`Transaksi ${entry.fn} tidak ada`);
  const receipt = await sent.wait();
  if (receipt === null || receipt.status !== 1) throw new Error(`Transaksi ${entry.fn} (${entry.scenario}) gagal`);
  measurements.push({ ...entry, gas: receipt.gasUsed });
}

function formatNumber(value: bigint | number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Biaya dalam ETH pada harga gas tertentu (gwei), empat angka di belakang koma. */
function ethAt(gas: bigint, gwei: bigint): string {
  const wei = gas * gwei * 1_000_000_000n;
  const tenThousandths = (wei + 50_000_000_000_000n) / 100_000_000_000_000n;
  return `${tenThousandths / 10_000n},${(tenThousandths % 10_000n).toString().padStart(4, "0")}`;
}

const ref = (orderId: string) => id(orderId);

async function main(): Promise<void> {
  if (hre.globalOptions.buildProfile !== "production") {
    throw new ConfigError("Jalankan dengan --build-profile production (npm run gas:report sudah memakainya).");
  }

  const { ethers } = await network.create();
  const [admin, operator, originalOwner, treasury, bagas, citra, eko, fajar, dimas, newHolder, newOperator] =
    await ethers.getSigners();

  // Hash dokumen penerbitan asli bila ada (sama dengan deploy:local), selain itu hash contoh.
  let documentHashes: { certificate: string; appraisal: string; agreement: string; source: string };
  try {
    const documents = await hashIssuanceDocuments(DEFAULT_ISSUANCE_DOCS_DIR);
    const hashOf = (type: string) => documents.find((document) => document.type === type)?.sha256 as string;
    documentHashes = {
      certificate: hashOf("DOCUMENT_CERTIFICATE"),
      appraisal: hashOf("DOCUMENT_APPRAISAL_REPORT"),
      agreement: hashOf("DOCUMENT_MANAGEMENT_AGREEMENT"),
      source: "dokumen penerbitan di docs/bisnis/dokumen-penerbitan/",
    };
  } catch {
    documentHashes = {
      certificate: sha256(toUtf8Bytes("contoh: sertifikat")),
      appraisal: sha256(toUtf8Bytes("contoh: laporan penilaian")),
      agreement: sha256(toUtf8Bytes("contoh: perjanjian pengelolaan")),
      source: "hash contoh (folder dokumen penerbitan tidak ditemukan)",
    };
  }

  // --- Satu putaran demo -------------------------------------------------
  const token = await ethers.deployContract(
    "KosToken",
    [
      "SMR01",
      documentHashes.certificate,
      documentHashes.appraisal,
      admin.address,
      operator.address,
      originalOwner.address,
      treasury.address,
      5_400n,
      12_600n,
    ],
    admin,
  );
  await measure(token.deploymentTransaction(), {
    contract: "KosToken",
    fn: "deploy",
    scenario: "termasuk dua dokumen versi 1 dan mint 18.000 token",
    wallet: "admin",
    demo: true,
  });
  const ledger = await ethers.deployContract("KosLedger", [admin.address, operator.address, await token.getAddress(), 500n, 2_200n], admin);
  await measure(ledger.deploymentTransaction(), { contract: "KosLedger", fn: "deploy", scenario: "", wallet: "admin", demo: true });

  const asAdmin = token.connect(admin);
  const asOperator = token.connect(operator);
  const ledgerAsOperator = ledger.connect(operator);
  await measure(await asAdmin.anchorDocument(await token.DOCUMENT_MANAGEMENT_AGREEMENT(), documentHashes.agreement), {
    contract: "KosToken",
    fn: "anchorDocument",
    scenario: "jenis dokumen baru, versi 1 (perjanjian pengelolaan)",
    wallet: "admin",
    demo: true,
  });

  for (const investor of [bagas, citra, eko, fajar, dimas]) {
    await measure(await asOperator.setKycStatus(investor.address, true), {
      contract: "KosToken",
      fn: "setKycStatus",
      scenario: "meloloskan alamat baru",
      wallet: "operator",
      demo: true,
    });
  }

  const purchases: Array<[typeof bagas, bigint, string]> = [
    [bagas, 900n, "BUY-SMR01-0001"],
    [bagas, 900n, "BUY-SMR01-0002"],
    [citra, 1_200n, "BUY-SMR01-0003"],
    [eko, 800n, "BUY-SMR01-0004"],
    [fajar, 560n, "BUY-SMR01-0005"],
    [dimas, 100n, "BUY-SMR01-0006"],
  ];
  const holders = new Set<string>();
  for (const [investor, amount, orderId] of purchases) {
    const first = !holders.has(investor.address);
    holders.add(investor.address);
    await measure(await asOperator.transferFromTreasury(investor.address, amount, ref(orderId)), {
      contract: "KosToken",
      fn: "transferFromTreasury",
      scenario: first ? "penerima pertama kali (termasuk delegasi otomatis)" : "penerima yang sudah memegang token",
      wallet: "operator",
      demo: true,
    });
  }

  const period = 202_611;
  const rooms = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (const [index, room] of rooms.entries()) {
    const orderId = `RENT-SMR01-K${String(room).padStart(2, "0")}-2026-11`;
    await measure(await ledgerAsOperator.recordRent(room, period, 1_500_000n, ref(orderId)), {
      contract: "KosLedger",
      fn: "recordRent",
      scenario: index === 0 ? "pertama di satu periode" : "berikutnya di periode yang sama",
      wallet: "operator",
      demo: true,
    });
  }

  const expenses: Array<[number, bigint, string]> = [
    [1, 1_150_000n, "listrik-air"],
    [2, 600_000n, "kebersihan"],
    [3, 450_000n, "internet"],
    [5, 200_000n, "keamanan"],
    [4, 300_000n, "perbaikan-k07"],
  ];
  for (const [index, [category, amount, receipt]] of expenses.entries()) {
    await measure(await ledgerAsOperator.recordExpense(period, category, amount, sha256(toUtf8Bytes(`nota dummy ${receipt}`))), {
      contract: "KosLedger",
      fn: "recordExpense",
      scenario: index === 0 ? "pertama di satu periode" : "berikutnya di periode yang sama",
      wallet: "operator",
      demo: true,
    });
  }

  await measure(await ledgerAsOperator.closePeriod(period), {
    contract: "KosLedger",
    fn: "closePeriod",
    scenario: "periode November (sembilan sewa, lima biaya)",
    wallet: "operator",
    demo: true,
  });
  const closed = await ledger.periods(period);
  if (closed.netRent !== 7_897_500n || closed.valuePerTokenSen !== 43_875n) {
    throw new Error(`Angka penutupan tidak sesuai skenario: sewa bersih ${closed.netRent}, ${closed.valuePerTokenSen} sen per token`);
  }

  // --- Fungsi tulis lain di luar demo -------------------------------------
  await measure(await asAdmin.anchorDocument(await token.DOCUMENT_APPRAISAL_REPORT(), sha256(toUtf8Bytes("contoh: penilaian 2027"))), {
    contract: "KosToken",
    fn: "anchorDocument",
    scenario: "versi pengganti (laporan penilaian versi 2)",
    wallet: "admin",
    demo: false,
  });
  await measure(await asOperator.setKycStatus(newHolder.address, true), {
    contract: "KosToken",
    fn: "setKycStatus",
    scenario: "meloloskan alamat baru",
    wallet: "operator",
    demo: false,
  });
  await measure(await token.connect(citra).transfer(newHolder.address, 100n), {
    contract: "KosToken",
    fn: "transfer",
    scenario: "antarpemegang, penerima baru (termasuk delegasi otomatis)",
    wallet: "pemegang token",
    demo: false,
  });
  await measure(await token.connect(citra).transfer(newHolder.address, 50n), {
    contract: "KosToken",
    fn: "transfer",
    scenario: "antarpemegang, penerima yang sudah memegang token",
    wallet: "pemegang token",
    demo: false,
  });
  await measure(await token.connect(eko).approve(operator.address, 100n), {
    contract: "KosToken",
    fn: "approve",
    scenario: "allowance baru",
    wallet: "pemegang token",
    demo: false,
  });

  // Pengembalian token ke perbendaharaan: dompet kustodian menandatangani permit tanpa gas.
  const deadline = BigInt((await ethers.provider.getBlock("latest"))?.timestamp ?? 0) + 3_600n;
  const signature = await fajar.signTypedData(
    { name: await token.name(), version: "1", chainId: (await ethers.provider.getNetwork()).chainId, verifyingContract: await token.getAddress() },
    {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    { owner: fajar.address, spender: operator.address, value: 560n, nonce: await token.nonces(fajar.address), deadline },
  );
  const { v, r, s } = Signature.from(signature);
  await measure(await asOperator.permit(fajar.address, operator.address, 560n, deadline, v, r, s), {
    contract: "KosToken",
    fn: "permit",
    scenario: "dikirim operator atas tanda tangan dompet kustodian",
    wallet: "operator",
    demo: false,
  });
  await measure(await asOperator.transferFrom(fajar.address, treasury.address, 560n), {
    contract: "KosToken",
    fn: "transferFrom",
    scenario: "mengembalikan seluruh saldo ke perbendaharaan",
    wallet: "operator",
    demo: false,
  });
  await measure(await asOperator.setKycStatus(dimas.address, false), {
    contract: "KosToken",
    fn: "setKycStatus",
    scenario: "mencabut KYC",
    wallet: "operator",
    demo: false,
  });

  // Prosedur darurat (rancangan bagian 3.13 dan 4.13), dari dompet admin.
  await measure(await asAdmin.pause(), { contract: "KosToken", fn: "pause", scenario: "", wallet: "admin", demo: false });
  await measure(await ledger.connect(admin).pause(), { contract: "KosLedger", fn: "pause", scenario: "", wallet: "admin", demo: false });
  const operatorRole = await token.OPERATOR_ROLE();
  await measure(await asAdmin.revokeRole(operatorRole, operator.address), {
    contract: "KosToken",
    fn: "revokeRole",
    scenario: "mencabut peran operator lama",
    wallet: "admin",
    demo: false,
  });
  await measure(await asAdmin.grantRole(operatorRole, newOperator.address), {
    contract: "KosToken",
    fn: "grantRole",
    scenario: "memberi peran ke operator baru",
    wallet: "admin",
    demo: false,
  });
  await measure(await asAdmin.unpause(), { contract: "KosToken", fn: "unpause", scenario: "", wallet: "admin", demo: false });
  await measure(await ledger.connect(admin).unpause(), { contract: "KosLedger", fn: "unpause", scenario: "", wallet: "admin", demo: false });

  // --- Keluaran -----------------------------------------------------------
  const production = hre.config.solidity.profiles.production.compilers[0];
  const optimizer = production.settings.optimizer as { enabled?: boolean; runs?: number } | undefined;
  console.log(`Pengukuran gas KosBagi, ${new Date().toISOString()}`);
  console.log(
    `Profil production: solc ${production.version}, EVM ${String(production.settings.evmVersion)}, ` +
      `optimizer ${optimizer?.enabled === true ? `${optimizer.runs ?? 200} runs` : "mati"}. Jaringan Hardhat dalam proses.`,
  );
  console.log(`Hash dokumen: ${documentHashes.source}.\n`);

  const groups = new Map<string, { first: Measurement; values: bigint[] }>();
  for (const item of measurements) {
    const key = `${item.contract}|${item.fn}|${item.scenario}`;
    const group = groups.get(key) ?? { first: item, values: [] };
    group.values.push(item.gas);
    groups.set(key, group);
  }
  console.log("| Kontrak | Fungsi | Kasus | Dompet | Transaksi diukur | Gas per transaksi |");
  console.log("|---|---|---|---|---|---|");
  for (const { first, values } of groups.values()) {
    const min = values.reduce((a, b) => (b < a ? b : a));
    const max = values.reduce((a, b) => (b > a ? b : a));
    const gas = min === max ? formatNumber(min) : `${formatNumber(min)} sampai ${formatNumber(max)}`;
    console.log(`| ${first.contract} | \`${first.fn}\` | ${first.scenario || "-"} | ${first.wallet} | ${values.length} | ${gas} |`);
  }

  const demo = measurements.filter((item) => item.demo);
  const sum = (items: Measurement[]) => items.reduce((total, item) => total + item.gas, 0n);
  const adminDemo = demo.filter((item) => item.wallet === "admin");
  const operatorDemo = demo.filter((item) => item.wallet === "operator");
  const total = sum(demo);
  console.log("\nSatu putaran demo per fungsi\n");
  console.log("| Dompet | Kontrak | Fungsi | Transaksi | Gas |");
  console.log("|---|---|---|---|---|");
  const perFunction = new Map<string, Measurement[]>();
  for (const item of demo) {
    const key = `${item.wallet}|${item.contract}|${item.fn}`;
    perFunction.set(key, [...(perFunction.get(key) ?? []), item]);
  }
  for (const items of perFunction.values()) {
    const [first] = items as [Measurement];
    console.log(`| ${first.wallet} | ${first.contract} | \`${first.fn}\` | ${items.length} | ${formatNumber(sum(items))} |`);
  }

  console.log("\nSatu putaran demo (deploy sampai tutup periode)\n");
  console.log("| Dompet | Transaksi | Gas | 1 gwei | 3 gwei | 10 gwei |");
  console.log("|---|---|---|---|---|---|");
  for (const [label, items] of [
    ["Admin", adminDemo],
    ["Operator", operatorDemo],
    ["Jumlah", demo],
  ] as const) {
    const gas = sum([...items]);
    console.log(`| ${label} | ${items.length} | ${formatNumber(gas)} | ${ethAt(gas, 1n)} ETH | ${ethAt(gas, 3n)} ETH | ${ethAt(gas, 10n)} ETH |`);
  }
  if (total === 0n) throw new Error("Tidak ada transaksi demo yang terukur");
}

try {
  await main();
} catch (error) {
  console.error(error instanceof ConfigError ? `\nPengukuran dihentikan: ${error.message}` : error);
  process.exitCode = 1;
}
