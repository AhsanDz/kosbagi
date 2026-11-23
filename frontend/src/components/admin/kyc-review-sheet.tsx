"use client";

import {
  CheckIcon,
  CircleNotchIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react/ssr";

import { ChainStatusStack } from "@/components/common/chain-status-stack";
import { DataRows, type DataRow } from "@/components/common/data-rows";
import { KycStatusBadge } from "@/components/common/kyc-status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import type { KycAdminItemDto, KycChecksDto } from "@/lib/api/types";
import { formatDateTimeWib, shortenHash } from "@/lib/format";
import { cn } from "@/lib/utils";

const CHECK_LABELS: { key: keyof KycChecksDto; label: string }[] = [
  { key: "dummyPrefix", label: "Nomor identitas berawalan DUMMY-" },
  { key: "nameMatchesAccount", label: "Nama sama dengan nama akun" },
  { key: "noOtherActive", label: "Tidak ada pengajuan aktif lain" },
];

/** Pemeriksaan otomatis dari backend. Cek yang gagal ditandai silang dan berwarna destructive. */
function AutomaticChecks({ checks }: { checks: KycChecksDto }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-[14px] bg-muted p-4 text-sm leading-5">
      <h3 className="font-semibold text-foreground">Pemeriksaan otomatis</h3>
      <ul className="flex flex-col gap-2.5">
        {CHECK_LABELS.map(({ key, label }) => {
          const passed = checks[key];
          return (
            <li
              key={key}
              className={cn("flex items-center gap-2", passed ? "text-foreground" : "text-destructive")}
            >
              {passed ? (
                <CheckIcon aria-hidden className="size-4 shrink-0" />
              ) : (
                <XIcon aria-hidden className="size-4 shrink-0" />
              )}
              <span>
                {label}
                <span className="sr-only">{passed ? ": lolos" : ": tidak lolos"}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface KycReviewSheetProps {
  item: KycAdminItemDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approving: boolean;
  onApprove: () => void;
  onReject: () => void;
}

/**
 * Sheet tinjau KYC (Figma: "Sheet tinjau KYC"), 480 px di kanan. Setujui
 * langsung membuat dompet kustodian dan job WHITELIST_KYC; Tolak membuka Dialog
 * tolak KYC. Setelah diputuskan, sheet menampilkan hasilnya dan tombol Tutup.
 */
export function KycReviewSheet({
  item,
  open,
  onOpenChange,
  approving,
  onApprove,
  onReject,
}: KycReviewSheetProps) {
  const rows: DataRow[] = item
    ? [
        { label: "Nama lengkap", value: item.fullName },
        { label: "Nomor identitas dummy", value: item.dummyIdNumber, mono: true },
        { label: "Email akun", value: item.user.email },
        { label: "Diajukan", value: formatDateTimeWib(item.submittedAt) },
      ]
    : [];
  if (item?.status === "APPROVED") {
    if (item.reviewedAt) rows.push({ label: "Disetujui", value: formatDateTimeWib(item.reviewedAt) });
    if (item.wallet) {
      rows.push({
        label: "Dompet kustodian",
        value: <span title={item.wallet.address}>{shortenHash(item.wallet.address)}</span>,
        mono: true,
      });
    }
  }
  if (item?.status === "REJECTED" && item.reviewedAt) {
    rows.push({ label: "Ditolak", value: formatDateTimeWib(item.reviewedAt) });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full gap-0 bg-card p-0 text-card-foreground sm:max-w-[480px]"
      >
        <div className="flex items-center justify-between gap-4 pt-6 pr-5 pb-4 pl-7">
          <SheetTitle className="text-h4 font-semibold text-card-foreground">
            Tinjau pengajuan KYC
          </SheetTitle>
          <SheetClose asChild>
            <Button type="button" variant="ghost" size="icon">
              <XIcon aria-hidden />
              <span className="sr-only">Tutup</span>
            </Button>
          </SheetClose>
        </div>
        <SheetDescription className="sr-only">
          Data identitas dummy investor, hasil pemeriksaan otomatis, dan keputusan admin.
        </SheetDescription>

        {item ? (
          <>
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-7 pt-1 pb-6">
              <div className="flex items-center gap-2.5">
                <KycStatusBadge status={item.status} />
                {item.attempt ? (
                  <p className="text-sm leading-5 text-muted-foreground">Pengajuan ke-{item.attempt}</p>
                ) : null}
              </div>

              {item.status === "REJECTED" ? (
                <Alert variant="destructive">
                  <WarningCircleIcon aria-hidden />
                  <AlertTitle>Alasan penolakan</AlertTitle>
                  <AlertDescription>{item.rejectionReason ?? "Tanpa alasan."}</AlertDescription>
                </Alert>
              ) : null}

              <DataRows rows={rows} divided />

              {item.status === "SUBMITTED" ? (
                <>
                  <AutomaticChecks checks={item.checks} />
                  <p className="text-sm leading-5 text-muted-foreground">
                    Bila disetujui, KosBagi membuat dompet kustodian lalu mencatat alamatnya lolos
                    KYC di KosToken lewat setKycStatus. Nama dan nomor identitas tidak dicatat
                    on-chain.
                  </p>
                </>
              ) : null}

              {item.status === "APPROVED" ? (
                <ChainStatusStack
                  chain={item.wallet?.whitelist ?? null}
                  pendingDescription="Transaksi setKycStatus sedang dikirim ke Sepolia. Investor bisa membeli token setelah tercatat."
                  failedDescription={
                    item.wallet?.whitelist.lastError ??
                    "Transaksi setKycStatus belum tercatat setelah beberapa percobaan otomatis. Investor belum bisa membeli token."
                  }
                />
              ) : null}
            </div>

            <div className="flex gap-3 border-t border-border px-7 pt-4 pb-6">
              {item.status === "SUBMITTED" ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    disabled={approving}
                    onClick={onReject}
                  >
                    Tolak
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    disabled={approving}
                    aria-busy={approving}
                    onClick={onApprove}
                  >
                    {approving ? (
                      <CircleNotchIcon aria-hidden data-icon="inline-start" className="animate-spin" />
                    ) : null}
                    Setujui
                  </Button>
                </>
              ) : (
                <SheetClose asChild>
                  <Button type="button" variant="outline" className="flex-1">
                    Tutup
                  </Button>
                </SheetClose>
              )}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
