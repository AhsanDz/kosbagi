import { TrayIcon } from "@phosphor-icons/react/ssr";

import { ChainStatus } from "@/components/common/chain-status";
import { KycStatusBadge } from "@/components/common/kyc-status-badge";
import { StackedListHead, StackedListItem, StackedListMeta } from "@/components/common/stacked-list";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ChainJobStatus, KycAdminItemDto, KycStatus } from "@/lib/api/types";
import { formatDateTime, shortenHash } from "@/lib/format";
import type { ChainTxStatus } from "@/lib/types";

const whitelistStatus: Record<ChainJobStatus, ChainTxStatus> = {
  PENDING: "QUEUED",
  RECORDED: "CONFIRMED",
  FAILED: "FAILED",
};

const emptyCopy: Record<KycStatus, { title: string; description: string }> = {
  SUBMITTED: {
    title: "Tidak ada pengajuan yang menunggu",
    description:
      "Pengajuan KYC baru dari investor muncul di sini. Pengajuan yang sudah diputuskan ada di tab Disetujui dan Ditolak.",
  },
  APPROVED: {
    title: "Belum ada pengajuan yang disetujui",
    description:
      "Pengajuan yang disetujui muncul di sini beserta status pencatatan lolos KYC di KosToken.",
  },
  REJECTED: {
    title: "Belum ada pengajuan yang ditolak",
    description: "Pengajuan yang ditolak muncul di sini. Investor bisa mengajukan lagi.",
  },
};

const SKELETON_ROWS = ["baris-1", "baris-2", "baris-3", "baris-4"];

function TableHeadRow() {
  return (
    <TableHeader>
      <TableRow className="border-0">
        <TableHead className="w-[240px]">Investor (dummy)</TableHead>
        <TableHead className="w-[190px]">Nomor identitas</TableHead>
        <TableHead className="w-[170px]">Diajukan</TableHead>
        <TableHead className="w-[190px]">Dompet kustodian</TableHead>
        <TableHead className="w-[210px]">Status</TableHead>
        <TableHead className="w-[140px]">Aksi</TableHead>
      </TableRow>
    </TableHeader>
  );
}

function WalletCell({ item }: { item: KycAdminItemDto }) {
  if (item.status === "APPROVED" && item.wallet) {
    return (
      <span className="font-mono" title={item.wallet.address}>
        {shortenHash(item.wallet.address)}
      </span>
    );
  }
  return (
    <span className="text-muted-foreground">
      {item.status === "REJECTED" ? "Tidak dibuat" : "Dibuat setelah disetujui"}
    </span>
  );
}

function StatusCell({ item }: { item: KycAdminItemDto }) {
  if (item.status === "APPROVED") {
    const whitelist = item.wallet?.whitelist;
    return (
      <ChainStatus
        status={whitelist ? whitelistStatus[whitelist.status] : "QUEUED"}
        txHash={whitelist?.txHash ?? undefined}
      />
    );
  }
  return <KycStatusBadge status={item.status} />;
}

interface KycTableProps {
  status: KycStatus;
  items: KycAdminItemDto[] | undefined;
  onOpen: (item: KycAdminItemDto) => void;
}

/** Tombol Tinjau (pengajuan baru) atau Detail (sudah diputuskan). */
function OpenButton({ item, onOpen }: { item: KycAdminItemDto; onOpen: (item: KycAdminItemDto) => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={(event) => {
        event.stopPropagation();
        onOpen(item);
      }}
    >
      {item.status === "SUBMITTED" ? "Tinjau" : "Detail"}
      <span className="sr-only"> pengajuan {item.user.name}</span>
    </Button>
  );
}

/**
 * Daftar pengajuan untuk kartu yang lebih sempit dari tabel 920 px (ponsel dan
 * laptop kecil, P5), supaya status dan tombol Tinjau tidak tersembunyi di luar
 * layar.
 */
function KycList({ items, onOpen }: { items: KycAdminItemDto[] | undefined; onOpen: KycTableProps["onOpen"] }) {
  if (items !== undefined && items.length === 0) return null;

  return (
    <ul className="@min-[57.5rem]:hidden" aria-label="Pengajuan KYC">
      {items === undefined
        ? SKELETON_ROWS.map((key) => (
            <StackedListItem key={key} className="gap-2.5">
              <Skeleton className="h-3 w-35 max-w-full" />
              <Skeleton className="h-3 w-48 max-w-full" />
              <Skeleton className="h-3 w-24" />
            </StackedListItem>
          ))
        : items.map((item) => (
            <StackedListItem key={item.id} className="gap-2">
              <StackedListHead title={item.user.name} value={<StatusCell item={item} />} />
              <StackedListMeta className="break-all">{item.user.email}</StackedListMeta>
              <StackedListMeta>
                <span className="font-mono">{item.dummyIdNumber}</span>, diajukan{" "}
                {formatDateTime(item.submittedAt)}
              </StackedListMeta>
              <StackedListMeta>
                Dompet kustodian: <WalletCell item={item} />
              </StackedListMeta>
              <div className="pt-1">
                <OpenButton item={item} onOpen={onOpen} />
              </div>
            </StackedListItem>
          ))}
    </ul>
  );
}

/**
 * Tabel pengajuan KYC (Figma: "Baris KYC"). Klik baris membuka Sheet tinjau;
 * tombol Tinjau atau Detail di kolom Aksi memberi jalan yang sama lewat
 * keyboard. Di tab Disetujui, kolom Status menampilkan pencatatan lolos KYC
 * di KosToken. Di kartu yang sempit tabel diganti daftar (KycList).
 */
export function KycTable({ status, items, onOpen }: KycTableProps) {
  return (
    <div className="@container overflow-hidden rounded-xl bg-card text-card-foreground">
      <div className="hidden @min-[57.5rem]:block">
        <Table className="min-w-[920px] table-fixed">
          <TableHeadRow />
          <TableBody>
            {items === undefined
              ? SKELETON_ROWS.map((key) => (
                  <TableRow key={key} aria-hidden className="h-[68px]">
                    <TableCell>
                      <Skeleton className="h-3 w-35 max-w-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-3 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-3 w-19" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-3 w-24" />
                    </TableCell>
                    <TableCell />
                    <TableCell />
                  </TableRow>
                ))
              : items.map((item) => (
                  <TableRow
                    key={item.id}
                    onClick={(event) => {
                      // Tautan Etherscan di kolom Status membuka tab baru, bukan Sheet.
                      if ((event.target as HTMLElement).closest("a")) return;
                      onOpen(item);
                    }}
                    className="h-[68px] cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="whitespace-normal">
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm leading-5 font-medium">{item.user.name}</span>
                        <span className="truncate text-xs leading-4 text-muted-foreground">
                          {item.user.email}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="truncate font-mono">{item.dummyIdNumber}</TableCell>
                    <TableCell>{formatDateTime(item.submittedAt)}</TableCell>
                    <TableCell>
                      <WalletCell item={item} />
                    </TableCell>
                    <TableCell>
                      <StatusCell item={item} />
                    </TableCell>
                    <TableCell>
                      {/* Revisi P4: tombol kolom Aksi memakai Outline dan rata kiri bersama judul kolom. */}
                      <OpenButton item={item} onOpen={onOpen} />
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
      <KycList items={items} onOpen={onOpen} />
      {items === undefined ? <p className="sr-only">Memuat pengajuan KYC.</p> : null}
      {items !== undefined && items.length === 0 ? (
        <Empty className="rounded-none border-0 px-6 py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TrayIcon aria-hidden />
            </EmptyMedia>
            <EmptyTitle className="mt-2">{emptyCopy[status].title}</EmptyTitle>
            <EmptyDescription>{emptyCopy[status].description}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
    </div>
  );
}
