import { ChainStatus } from "@/components/common/chain-status";
import { TextLink } from "@/components/common/text-link";
import { RoomBoard } from "@/components/property/room-board";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { currentPeriod, roomRents } from "@/lib/data/rooms";
import { recentTransactions } from "@/lib/data/transactions";
import { etherscanAddressUrl, formatDate, formatNumber, shortenHash } from "@/lib/format";
import type { HexString, Property } from "@/lib/types";

/** Tab Blockchain: alamat kontrak, papan kamar bulan ini, dan transaksi terbaru. */
export function BlockchainTab({ property }: { property: Property }) {
  const contracts: { name: string; description: string; address: HexString }[] = [
    {
      name: `KosToken (${property.tokenSymbol})`,
      description:
        "ERC-20 dengan batas 10% per alamat; hanya alamat lolos KYC yang bisa menerima token.",
      address: property.contracts.kosToken,
    },
    {
      name: "KosLedger",
      description:
        "Mencatat sewa (recordRent), biaya (recordExpense), dan penutupan periode (closePeriod).",
      address: property.contracts.kosLedger,
    },
  ];

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-2">
        <h2 className="text-h3 font-semibold text-foreground">Kontrak di Ethereum Sepolia</h2>
        <p className="max-w-[680px] text-base leading-6 text-muted-foreground">
          Setelah kontrak dideploy, semua angka di halaman ini bisa dicek langsung di Etherscan.
          Penulisan ke kontrak hanya lewat dompet operator KosBagi. Alamat dan hash transaksi yang
          tampil saat ini masih contoh.
        </p>
      </section>

      <ul className="flex flex-col border-b border-border">
        {contracts.map((contract) => (
          <li
            key={contract.name}
            className="flex flex-col gap-3 border-t border-border py-5 sm:flex-row sm:items-center sm:gap-6"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h3 className="text-base leading-6 font-medium text-foreground">{contract.name}</h3>
              <p className="text-sm leading-5 text-muted-foreground">{contract.description}</p>
            </div>
            <span className="font-mono text-sm leading-5 text-foreground" title={contract.address}>
              {shortenHash(contract.address)}
            </span>
            <TextLink href={etherscanAddressUrl(contract.address)} external>
              Etherscan<span className="sr-only"> untuk kontrak {contract.name}</span>
            </TextLink>
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-4">
        <h2 className="text-h3 font-semibold text-foreground">Sewa bulan ini</h2>
        <RoomBoard
          rooms={roomRents}
          period={currentPeriod}
          propertyName={property.name}
          roomCount={property.roomCount}
          ledgerAddress={property.contracts.kosLedger}
          className="max-w-[644px]"
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-h3 font-semibold text-foreground">Transaksi terbaru</h2>
        <div className="overflow-hidden rounded-xl bg-card">
          <Table>
            <TableCaption className="sr-only">
              Transaksi terbaru {property.name} beserta status pencatatan on-chain
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Kamar</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Nominal</TableHead>
                <TableHead>On-chain</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTransactions.map((transaction) => (
                <TableRow key={transaction.orderId}>
                  <TableCell className="font-mono text-xs leading-4">{transaction.orderId}</TableCell>
                  <TableCell>{transaction.subject}</TableCell>
                  <TableCell>{formatDate(transaction.date)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatNumber(transaction.amountIdr)}
                  </TableCell>
                  <TableCell>
                    <ChainStatus status={transaction.chainStatus} txHash={transaction.txHash} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
