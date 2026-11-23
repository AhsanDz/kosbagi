import Link from "next/link";
import { WarningCircleIcon } from "@phosphor-icons/react/ssr";

import { ChainStatusStack } from "@/components/common/chain-status-stack";
import { DataRows, type DataRow } from "@/components/common/data-rows";
import { KycStatusBadge } from "@/components/common/kyc-status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { CustodialWalletDto, KycDto } from "@/lib/api/types";
import { formatDateTimeWib, shortenHash } from "@/lib/format";
import type { KycViewState } from "@/lib/kyc";
import { cn } from "@/lib/utils";

const copy: Record<Exclude<KycViewState, "NONE">, { title: string; description: string }> = {
  SUBMITTED: {
    title: "Pengajuanmu sedang ditinjau",
    description:
      "Admin memeriksa data dummy yang kamu kirim. Kamu belum bisa membeli token sampai pengajuan disetujui.",
  },
  REGISTERING: {
    title: "KYC disetujui, dompet sedang didaftarkan",
    description:
      "Dompet kustodianmu sudah dibuat dan sedang dicatat lolos KYC di KosToken. Biasanya kurang dari satu menit.",
  },
  WALLET_FAILED: {
    title: "KYC disetujui, dompet sedang didaftarkan",
    description:
      "Dompet kustodianmu sudah dibuat, tetapi pencatatan lolos KYC di KosToken belum berhasil. Operator KosBagi sedang mengulangnya.",
  },
  RECORDED: {
    title: "Kamu sudah bisa membeli token",
    description:
      "Dompet kustodianmu tercatat lolos KYC di KosToken, jadi token KB-SMR01 bisa dikirim ke dompet ini.",
  },
  REJECTED: {
    title: "Pengajuanmu ditolak",
    description: "Perbaiki data di form bawah sesuai alasan dari admin, lalu ajukan lagi.",
  },
};

interface KycStatusCardProps {
  state: Exclude<KycViewState, "NONE">;
  kyc: KycDto;
  wallet: CustodialWalletDto | null;
  className?: string;
}

/**
 * Kartu status KYC (Figma: "Kartu status KYC"). Menggantikan form setelah
 * investor mengajukan. Setelah disetujui, kartu menampilkan dompet kustodian dan
 * status pencatatan setKycStatus di KosToken.
 */
export function KycStatusCard({ state, kyc, wallet, className }: KycStatusCardProps) {
  const approved = state === "REGISTERING" || state === "RECORDED" || state === "WALLET_FAILED";
  const { title, description } = copy[state];

  const rows: DataRow[] = [
    { label: "Nama lengkap", value: kyc.fullName },
    { label: "Nomor identitas dummy", value: kyc.dummyIdNumber, mono: true },
    { label: "Diajukan", value: formatDateTimeWib(kyc.submittedAt) },
  ];
  if (approved && kyc.reviewedAt) {
    rows.push({ label: "Disetujui", value: formatDateTimeWib(kyc.reviewedAt) });
  }
  if (approved && wallet) {
    rows.push({
      label: "Dompet kustodian",
      value: <span title={wallet.address}>{shortenHash(wallet.address)}</span>,
      mono: true,
    });
  }
  if (state === "REJECTED" && kyc.reviewedAt) {
    rows.push({ label: "Ditolak", value: formatDateTimeWib(kyc.reviewedAt) });
  }

  return (
    <section
      aria-labelledby="judul-status-kyc"
      className={cn(
        "flex flex-col items-start gap-5 rounded-xl bg-card px-5 py-7 text-card-foreground md:px-8",
        className
      )}
    >
      <KycStatusBadge status={kyc.status} />
      <div className="flex flex-col gap-1.5">
        <h2 id="judul-status-kyc" className="text-h4 font-semibold">
          {title}
        </h2>
        <p className="text-sm leading-5 text-muted-foreground">{description}</p>
      </div>

      {state === "REJECTED" ? (
        <Alert variant="destructive">
          <WarningCircleIcon aria-hidden />
          <AlertTitle>Alasan dari admin</AlertTitle>
          <AlertDescription>{kyc.rejectionReason ?? "Admin tidak menuliskan alasan."}</AlertDescription>
        </Alert>
      ) : null}

      <DataRows rows={rows} divided />

      {approved ? (
        <ChainStatusStack
          chain={wallet?.whitelist ?? null}
          pendingDescription="Transaksi setKycStatus sedang dikirim ke Sepolia. Halaman ini diperbarui otomatis."
          failedDescription="Transaksi setKycStatus belum tercatat setelah beberapa percobaan. Operator KosBagi sedang mengulangnya."
        />
      ) : null}

      {state === "SUBMITTED" ? (
        <Button asChild variant="outline">
          <Link href="/investor/penawaran">Lihat penawaran</Link>
        </Button>
      ) : null}
      {state === "RECORDED" ? (
        <Button asChild>
          <Link href="/investor/penawaran">Beli token KB-SMR01</Link>
        </Button>
      ) : null}
      {state === "REGISTERING" || state === "WALLET_FAILED" ? (
        <Button type="button" disabled>
          Beli token KB-SMR01
        </Button>
      ) : null}
    </section>
  );
}
