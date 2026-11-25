import { Interface, JsonRpcProvider, Network } from "ethers";
import hre, { artifacts } from "hardhat";

import {
  deploymentSections,
  etherscanLogSource,
  eventSections,
  isUsableApiKey,
  parseLinksOptions,
  redactText,
  renderMarkdown,
  renderText,
  rpcLogSource,
  type LinkSection,
  type LinksHeader,
  type LogSource,
  type RawLog,
} from "./lib/demo-links.js";
import { DEPLOY_LABEL_VARIABLE, deploymentRecordPath, parseDeployLabel, resolveDeployTarget } from "./lib/deploy-target.js";
import { readDeploymentRecord } from "./lib/deployment-record.js";
import { ConfigError } from "./lib/errors.js";
import { displayPath } from "./lib/issuance-documents.js";

/*
 * Mencetak tautan Etherscan KosToken, KosLedger, dompet, transaksi penerbitan, dan transaksi penting
 * dari event (whitelist KYC, pembelian token, sewa, biaya, tutup periode), untuk presentasi dan untuk
 * mengisi README. Hanya membaca: tidak mengirim transaksi, tidak butuh ETH, tidak butuh kunci dompet.
 *
 * Perintah (dari folder contracts/):
 *   npm run links:sepolia   berkas deployments/sepolia.json, atau sepolia-<label>.json bila DEPLOY_LABEL diisi
 *   npm run links:local     Hardhat node port 8546 setelah npm run deploy:local (deployments/lokal.json)
 *
 * Opsi lewat variabel environment: LINKS_FORMAT=markdown untuk tabel README, LINKS_SOURCE
 * (auto | rpc | etherscan), LINKS_BLOCK_RANGE (blok per eth_getLogs). Rinciannya di
 * docs/kontrak/deploy-sepolia.md bagian 10.
 *
 * URL RPC dibaca langsung dari konfigurasi jaringan, bukan lewat koneksi jaringan Hardhat, karena
 * koneksi Hardhat untuk sepolia memuat ADMIN_PRIVATE_KEY dan OPERATOR_PRIVATE_KEY. Dengan begitu
 * laptop presentasi cukup punya SEPOLIA_RPC_URL (dan ETHERSCAN_API_KEY bila ada).
 */

const RPC_TIMEOUT_MS = 15_000;

/** Nilai yang tidak boleh muncul di layar bila ada error tak terduga. */
function secretValues(): Array<string | undefined> {
  return ["SEPOLIA_RPC_URL", "ETHERSCAN_API_KEY", "ADMIN_PRIVATE_KEY", "OPERATOR_PRIVATE_KEY"].map((name) => process.env[name]);
}

/** Satu permintaan eth_chainId dengan batas waktu, supaya RPC yang mati tidak membuat skrip menunggu selamanya. */
async function readChainId(rpcUrl: string, networkName: string): Promise<number> {
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
    });
    const body = (await response.json()) as { result?: unknown };
    if (typeof body.result !== "string") throw new Error("jawaban eth_chainId tidak valid");
    return Number(BigInt(body.result));
  } catch {
    const hint =
      networkName === "local8546"
        ? "Nyalakan Hardhat node dengan npm run node:local, lalu npm run deploy:local."
        : "Periksa SEPOLIA_RPC_URL di contracts/.env dan koneksi internet.";
    throw new ConfigError(`RPC jaringan ${networkName} tidak bisa dihubungi. ${hint}`);
  }
}

async function main(): Promise<void> {
  const options = parseLinksOptions(process.env);
  const networkName = hre.globalOptions.network;
  const networkConfig = networkName === undefined || networkName === "" ? undefined : hre.config.networks[networkName];
  if (networkConfig === undefined || networkConfig.type !== "http") {
    throw new ConfigError("Jalankan lewat npm run links:sepolia atau npm run links:local.");
  }

  const rpcUrl = await networkConfig.url.getUrl();
  const chainId = await readChainId(rpcUrl, networkName);
  const target = resolveDeployTarget(chainId);
  const deployLabel = parseDeployLabel(process.env[DEPLOY_LABEL_VARIABLE]);
  const recordFile = deploymentRecordPath(target, deployLabel);
  let record;
  try {
    record = await readDeploymentRecord(recordFile);
  } catch {
    throw new ConfigError(
      `${displayPath(recordFile)} tidak ditemukan. Jalankan deploy lebih dulu` +
        (deployLabel === null ? "" : `, atau periksa ${DEPLOY_LABEL_VARIABLE}=${deployLabel}`) +
        ".",
    );
  }
  if (record.chainId !== chainId) {
    throw new ConfigError(`${displayPath(recordFile)} untuk chain ${record.chainId}, sedangkan jaringan ${networkName} chain ${chainId}.`);
  }

  const provider = new JsonRpcProvider(rpcUrl, Network.from(chainId), { staticNetwork: true });
  try {
    for (const name of ["KosToken", "KosLedger"] as const) {
      const { address } = record.contracts[name];
      if ((await provider.getCode(address)) === "0x") {
        throw new ConfigError(
          `Tidak ada kontrak ${name} di ${address}. ` +
            (target.isLocal ? "Hardhat node mungkin sudah dinyalakan ulang; jalankan npm run deploy:local lagi." : "Periksa berkas hasil deploy."),
        );
      }
    }

    // Sumber event: API Etherscan di Sepolia bila API key ada (tanpa batas rentang blok), selain itu RPC.
    const apiKey = process.env.ETHERSCAN_API_KEY;
    const canUseEtherscan = !target.isLocal && isUsableApiKey(apiKey);
    if (options.source === "etherscan" && !canUseEtherscan) {
      throw new ConfigError("LINKS_SOURCE=etherscan butuh jaringan Sepolia dan ETHERSCAN_API_KEY yang terisi.");
    }
    const useEtherscan = options.source === "etherscan" || (options.source === "auto" && canUseEtherscan);
    const source: LogSource = useEtherscan
      ? etherscanLogSource({ apiKey: apiKey as string, chainId })
      : rpcLogSource(provider, options.blockRange, (done, total) => {
          if (total > 20 && (done % 50 === 0 || done === total)) process.stderr.write(`  membaca event: ${done} dari ${total} potongan\n`);
        });

    const fromBlock = Math.min(record.contracts.KosToken.blockNumber, record.contracts.KosLedger.blockNumber);
    const toBlock = await provider.getBlockNumber();
    const interfaces = {
      token: new Interface((await artifacts.readArtifact("KosToken")).abi),
      ledger: new Interface((await artifacts.readArtifact("KosLedger")).abi),
    };

    let logs: RawLog[] | null = null;
    let eventError: string | null = null;
    try {
      logs = await source.fetchLogs([record.contracts.KosToken.address, record.contracts.KosLedger.address], fromBlock, toBlock);
    } catch (error) {
      eventError = error instanceof ConfigError ? error.message : "Event tidak bisa dibaca.";
    }

    const header: LinksHeader = {
      title: `Tautan Etherscan KosBagi ${record.propertyCode} (${record.tokenSymbol})`,
      lines: [
        ["Jaringan", `${target.label === "sepolia" ? "Sepolia" : "Hardhat lokal"} (chain ${chainId})`],
        [
          "Deploy",
          `${deployLabel === null ? "utama" : `gladi berlabel ${deployLabel}`}, ${displayPath(recordFile)}, ${record.recordedAt}`,
        ],
        ["Event", logs === null ? "tidak terbaca (lihat peringatan di bawah)" : `${source.description}, blok ${fromBlock} sampai ${toBlock}`],
        ...(target.explorerUrl === null
          ? [["Catatan", "Hardhat lokal tidak punya penjelajah blok; yang dicetak alamat dan tx hash"] as [string, string]]
          : []),
      ],
    };
    const sections: LinkSection[] = [...deploymentSections(record), ...(logs === null ? [] : eventSections(logs, record, interfaces))];
    process.stdout.write(options.format === "markdown" ? renderMarkdown(header, sections) : renderText(header, sections));

    const unverified = (["KosToken", "KosLedger"] as const).filter((name) => record.contracts[name].etherscan?.verified !== true);
    if (!target.isLocal && unverified.length > 0) {
      const sameLabel = deployLabel === null ? "" : ` dengan ${DEPLOY_LABEL_VARIABLE}=${deployLabel} yang sama`;
      console.error(
        `\nCatatan: ${unverified.join(" dan ")} belum tercatat terverifikasi di ${displayPath(recordFile)}. Jalankan npm run verify:sepolia${sameLabel}.`,
      );
    }
    if (eventError !== null) {
      console.error(`\nPeringatan: ${eventError}`);
      process.exitCode = 1;
    }
  } finally {
    provider.destroy();
  }
}

try {
  await main();
} catch (error) {
  // Pesan ConfigError sudah menjelaskan perbaikannya. Semua pesan tetap disaring karena error RPC bisa
  // memuat URL RPC berisi API key, dan skrip ini dipakai di depan layar presentasi.
  const raw =
    error instanceof ConfigError || !(error instanceof Error)
      ? String(error instanceof Error ? error.message : error)
      : String((error as { shortMessage?: unknown }).shortMessage ?? error.message);
  console.error(`\nTautan tidak bisa dicetak: ${redactText(raw, secretValues())}`);
  process.exitCode = 1;
}
