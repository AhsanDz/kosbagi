# contracts

Smart contract KosBagi di Ethereum Sepolia, dibangun dengan Hardhat 3 dan OpenZeppelin Contracts 5. Dikelola jalur 3 (Kontrak & Blockchain).

| Kontrak | Fungsi | Catatan |
|---|---|---|
| `KosToken` | ERC-20 + ERC20Votes, satu kontrak per properti (KB-SMR01) | Hanya alamat lolos KYC yang boleh menerima token; saldo per investor maksimal 10% |
| `KosLedger` | `recordRent`, `recordExpense`, `closePeriod` | Menolak referensi pembayaran ganda; menyimpan sewa bersih dan nilai per token tiap periode |
| `KosVoting` (opsional) | `propose`, `vote`, `tally` | Bobot suara dari saldo token di blok saat proposal dibuat |

Semua fungsi tulis hanya bisa dipanggil dompet operator (AccessControl). Data on-chain hanya kode properti, nomor kamar, periode, nominal, `keccak256(order_id)`, dan hash nota, tanpa data pribadi.

## Struktur

```
contracts/
├── contracts/          kode Solidity
├── test/               test Hardhat (fixtures/ berisi angka perhitungan manual dari jalur 1)
├── ignition/modules/   modul deploy
├── scripts/            ekspor ABI ke backend, verifikasi, data demo on-chain
└── deployments/        alamat kontrak hasil deploy Sepolia
```

Perintah instalasi, test, dan deploy ditambahkan saat kerangka Hardhat dibuat (progress 1).
