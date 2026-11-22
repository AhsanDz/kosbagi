import { ChainStatus } from "@/components/common/chain-status";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  InvestorChainStatus,
  PortfolioDistributionDto,
  PortfolioTransactionDto,
} from "@/lib/api/types";
import {
  formatDate,
  formatNumber,
  formatPeriod,
  formatRupiah,
  formatSen,
  formatSignedRupiah,
} from "@/lib/format";
import { periodEndLabel } from "@/lib/period";
import type { ChainTxStatus } from "@/lib/types";

/** Investor tidak pernah melihat Gagal: apa pun selain Tercatat dibaca Menunggu pencatatan. */
function investorChainStatus(status: InvestorChainStatus | "FAILED"): ChainTxStatus {
  return status === "RECORDED" ? "CONFIRMED" : "QUEUED";
}

/** Dua baris dalam satu sel: nilai utama dan keterangan kecil. */
function StackedCell({ main, sub }: { main: string; sub?: string | null }) {
  return (
    <span className="flex flex-col gap-0.5 whitespace-normal">
      <span className="text-sm leading-5 font-medium text-card-foreground">{main}</span>
      {sub ? <span className="text-xs leading-4 text-muted-foreground">{sub}</span> : null}
    </span>
  );
}

function MutedCell({ children }: { children: string }) {
  return <span className="text-sm leading-5 whitespace-normal text-muted-foreground">{children}</span>;
}

interface DistributionTableProps {
  distributions: PortfolioDistributionDto[];
  /** Periode berjalan yang belum ditutup, tampil sebagai baris terakhir. */
  runningPeriod: string | null;
}

/**
 * Tabel Bagi hasil per periode (Figma: Investor / Portofolio). Satu baris per
 * periode yang sudah dibagikan, ditambah baris periode berjalan yang belum
 * punya snapshot.
 */
export function DistributionTable({ distributions, runningPeriod }: DistributionTableProps) {
  const showRunning =
    runningPeriod !== null && !distributions.some((item) => item.period === runningPeriod);

  return (
    <div className="overflow-hidden rounded-xl bg-card text-card-foreground">
      <Table className="min-w-[880px] table-fixed">
        <TableHeader>
          <TableRow className="border-0">
            <TableHead className="w-[200px]">Periode</TableHead>
            <TableHead className="w-[260px]">Saldo di blok snapshot</TableHead>
            <TableHead className="w-[180px]">Nilai per token</TableHead>
            <TableHead className="w-[180px]">Bagianmu</TableHead>
            <TableHead className="w-[300px]">Penutupan periode</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {distributions.map((item) => (
            <TableRow key={item.period} className="h-[68px]">
              <TableCell>
                <StackedCell main={formatPeriod(item.period)} sub="periode ditutup" />
              </TableCell>
              <TableCell>
                <StackedCell
                  main={`${formatNumber(item.tokenBalance)} token`}
                  sub={item.snapshotBlock != null ? `blok ${formatNumber(item.snapshotBlock)}` : null}
                />
              </TableCell>
              <TableCell>
                <StackedCell main={formatSen(item.valuePerTokenSen)} />
              </TableCell>
              <TableCell>
                <StackedCell
                  main={formatRupiah(item.amountIdr)}
                  sub={`masuk saldo ${formatDate(item.distributedAt)}`}
                />
              </TableCell>
              <TableCell>
                <ChainStatus status="CONFIRMED" txHash={item.closeTxHash ?? undefined} />
              </TableCell>
            </TableRow>
          ))}
          {showRunning ? (
            <TableRow className="h-[68px]">
              <TableCell>
                <StackedCell main={formatPeriod(runningPeriod)} sub="periode berjalan" />
              </TableCell>
              <TableCell>
                <MutedCell>Belum ada snapshot</MutedCell>
              </TableCell>
              <TableCell>
                <MutedCell>Belum dihitung</MutedCell>
              </TableCell>
              <TableCell>
                <MutedCell>Belum dihitung</MutedCell>
              </TableCell>
              <TableCell>
                <MutedCell>{`Ditutup setelah ${periodEndLabel(runningPeriod)}`}</MutedCell>
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
      {distributions.length === 0 && !showRunning ? (
        <p className="px-4 py-6 text-sm leading-5 text-muted-foreground">
          Bagi hasil muncul di sini setelah admin menutup periode pertama.
        </p>
      ) : null}
    </div>
  );
}

const TRANSACTION_LABELS: Record<string, string> = {
  PURCHASE: "Beli token",
  DISTRIBUTION: "Bagi hasil",
  KYC_APPROVED: "Lolos KYC",
  KYC: "Lolos KYC",
  WHITELIST_KYC: "Lolos KYC",
};

function amountText(item: PortfolioTransactionDto): string | null {
  if (item.amountIdr === null || item.amountIdr === 0) return null;
  return item.type === "DISTRIBUTION"
    ? formatSignedRupiah(item.amountIdr)
    : formatRupiah(item.amountIdr);
}

/**
 * Tabel Riwayat transaksi (Figma: Investor / Portofolio). Status on-chain
 * versi ringkas; pencatatan yang belum selesai selalu Menunggu pencatatan.
 */
export function TransactionTable({ transactions }: { transactions: PortfolioTransactionDto[] }) {
  return (
    <div className="overflow-hidden rounded-xl bg-card text-card-foreground">
      <Table className="min-w-[880px] table-fixed">
        <TableHeader>
          <TableRow className="border-0">
            <TableHead className="w-[170px]">Tanggal</TableHead>
            <TableHead className="w-[150px]">Jenis</TableHead>
            <TableHead className="w-[380px]">Rincian</TableHead>
            <TableHead className="w-[160px]">Nominal</TableHead>
            <TableHead className="w-[260px]">On-chain</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((item, index) => {
            const amount = amountText(item);
            return (
              <TableRow key={`${item.type}-${item.occurredAt}-${index}`} className="h-12">
                <TableCell className="font-medium">{formatDate(item.occurredAt)}</TableCell>
                <TableCell className="font-medium">{TRANSACTION_LABELS[item.type] ?? "Transaksi"}</TableCell>
                <TableCell className="truncate" title={item.description}>
                  {item.description}
                </TableCell>
                <TableCell className={amount ? "font-medium tabular-nums" : "text-muted-foreground"}>
                  {amount ?? "Tanpa biaya"}
                </TableCell>
                <TableCell>
                  {item.chain ? (
                    <ChainStatus
                      status={investorChainStatus(item.chain.status)}
                      txHash={item.chain.txHash ?? undefined}
                    />
                  ) : (
                    <span className="text-xs leading-4 text-muted-foreground">Tidak dicatat on-chain</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {transactions.length === 0 ? (
        <p className="px-4 py-6 text-sm leading-5 text-muted-foreground">Belum ada transaksi.</p>
      ) : null}
    </div>
  );
}
