import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { artifacts } from "hardhat";

// Menyalin ABI kontrak ke backend supaya worker tidak bergantung pada folder
// artifacts/. Jalankan lewat `npm run export-abi` setelah antarmuka kontrak berubah;
// test "Ekspor ABI" gagal bila file di backend tertinggal dari kontrak.
// Isi file berupa array ABI saja, siap dipakai `new ethers.Contract(alamat, abi, signer)`.
const CONTRACT_NAMES = ["KosToken", "KosLedger"] as const;
const OUTPUT_DIR = new URL("../../backend/src/blockchain/abi/", import.meta.url);

await mkdir(OUTPUT_DIR, { recursive: true });

for (const name of CONTRACT_NAMES) {
  const { abi } = await artifacts.readArtifact(name);
  const target = new URL(`${name}.json`, OUTPUT_DIR);
  await writeFile(target, `${JSON.stringify(abi, null, 2)}\n`);
  console.log(`${name}: ${abi.length} entri ABI -> ${fileURLToPath(target)}`);
}
