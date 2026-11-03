import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";

// Hardhat 3 tidak membaca file .env secara otomatis. Bila contracts/.env ada,
// isinya dimuat ke process.env supaya configVariable() di bawah bisa membacanya.
// Nilainya baru dibaca saat jaringan Sepolia atau verifikasi Etherscan dipakai,
// jadi `npx hardhat test` (jaringan lokal) tetap jalan tanpa file .env.
const envFile = fileURLToPath(new URL(".env", import.meta.url));
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

// Versi compiler dan target EVM dipin supaya bytecode selalu sama di semua
// laptop anggota dan cocok saat diverifikasi di Etherscan. 0.8.34 dipilih karena
// versi terbaru yang mengompilasi OpenZeppelin 5.6.1 tanpa warning (0.8.35 ke
// atas memberi peringatan kata kunci baru `at` dan `error` di kode OpenZeppelin)
// dan sama dengan template resmi Hardhat 3. Analisis bug compiler 0.8.34 ada di
// docs/kontrak/rancangan-kontrak.md. Sepolia dan jaringan lokal Hardhat sama-sama
// memakai hard fork Osaka.
const SOLIDITY_VERSION = "0.8.34";
const EVM_VERSION = "osaka";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      // Dipakai `hardhat build` dan `hardhat test`.
      default: {
        version: SOLIDITY_VERSION,
        settings: {
          evmVersion: EVM_VERSION,
        },
      },
      // Dipakai saat deploy (Hardhat Ignition) dan verifikasi.
      production: {
        version: SOLIDITY_VERSION,
        settings: {
          evmVersion: EVM_VERSION,
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("OPERATOR_PRIVATE_KEY")],
    },
  },
  verify: {
    etherscan: {
      apiKey: configVariable("ETHERSCAN_API_KEY"),
    },
  },
});
