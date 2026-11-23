import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";
import hre, { artifacts, network } from "hardhat";

import { DEPLOY_LABEL_VARIABLE, deploymentRecordPath, parseDeployLabel, resolveDeployTarget } from "./lib/deploy-target.js";
import { deployedBytecodeMatches } from "./lib/deployment-checks.js";
import { readDeploymentRecord, writeDeploymentRecord } from "./lib/deployment-record.js";
import { ConfigError } from "./lib/errors.js";

/*
 * Verifikasi KosToken dan KosLedger di Etherscan memakai hasil deploy di
 * contracts/deployments/<target>.json.
 *
 *  1. Pastikan build memakai profil production, sama dengan saat deploy.
 *  2. Bandingkan bytecode di chain dengan artifact (di luar nilai immutable).
 *     Bila berbeda, verifikasi pasti gagal, jadi skrip berhenti sebelum
 *     mengirim apa pun ke Etherscan.
 *  3. Kirim kode sumber dan argumen konstruktor yang tercatat saat deploy ke
 *     Etherscan, lalu catat hasilnya di berkas hasil deploy.
 *
 * Di Hardhat node lokal hanya langkah 1 dan 2 yang berjalan, karena Etherscan
 * tidak mengenal jaringan lokal. Perintah: `npm run verify:sepolia` atau
 * `npm run verify:local`. Butuh ETHERSCAN_API_KEY, tidak butuh ETH.
 *
 * Dengan DEPLOY_LABEL (deploy gladi), yang dibaca dan ditulis adalah
 * contracts/deployments/<target>-<label>.json.
 */

const CONTRACT_NAMES = ["KosToken", "KosLedger"] as const;

async function main(): Promise<void> {
  if (hre.globalOptions.buildProfile !== "production") {
    throw new ConfigError("Jalankan dengan --build-profile production (npm run verify:sepolia sudah memakainya).");
  }

  const connection = await network.create();
  const { ethers, networkName } = connection;
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const target = resolveDeployTarget(chainId);
  const recordFile = deploymentRecordPath(target, parseDeployLabel(process.env[DEPLOY_LABEL_VARIABLE]));
  console.log(`Berkas hasil deploy: ${recordFile}`);
  const record = await readDeploymentRecord(recordFile);
  if (record.chainId !== chainId) {
    throw new ConfigError(`${recordFile} untuk chain ${record.chainId}, sedangkan jaringan ${networkName} chain ${chainId}.`);
  }

  for (const name of CONTRACT_NAMES) {
    const { address } = record.contracts[name];
    const code = await ethers.provider.getCode(address);
    if (code === "0x") {
      throw new ConfigError(`Tidak ada kontrak di ${address} (${name}). Hardhat node mungkin sudah dinyalakan ulang.`);
    }
    const artifact = await artifacts.readArtifact(name);
    if (!deployedBytecodeMatches(code, artifact)) {
      throw new ConfigError(
        `Bytecode ${name} di ${address} berbeda dengan hasil build saat ini. Pastikan kode kontrak dan ` +
          "hardhat.config.ts sama dengan saat deploy dan build memakai profil production.",
      );
    }
    console.log(`${name}: bytecode di chain sama dengan artifact profil production.`);
  }

  if (target.isLocal) {
    console.log("\nJaringan lokal: verifikasi Etherscan dilewati. Pemeriksaan bytecode lulus.");
    return;
  }

  for (const name of CONTRACT_NAMES) {
    const contract = record.contracts[name];
    console.log(`\nVerifikasi ${name} di Etherscan...`);
    const verified = await verifyContract(
      {
        address: contract.address,
        constructorArgs: contract.constructorArgs,
        contract: contract.fullyQualifiedName,
        provider: "etherscan",
      },
      hre,
    );
    contract.etherscan = {
      verified,
      url: `${record.explorerUrl ?? "https://sepolia.etherscan.io"}/address/${contract.address}#code`,
      checkedAt: new Date().toISOString(),
    };
  }

  await writeDeploymentRecord(recordFile, record);
  console.log(`\nSelesai. Status verifikasi ditulis ke ${recordFile}`);
}

try {
  await main();
} catch (error) {
  console.error(error instanceof ConfigError ? `\nVerifikasi dihentikan: ${error.message}` : error);
  process.exitCode = 1;
}
