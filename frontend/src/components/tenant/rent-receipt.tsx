import type { ReactNode } from "react";

import { BillStatusBadge } from "@/components/common/bill-status-badge";
import { TearLine } from "@/components/common/tear-line";
import { RecordedStamp } from "@/components/tenant/recorded-stamp";
import type { BillDetailDto, RentReceiptDto } from "@/lib/api/types";
import { paymentMethodName } from "@/lib/billing";
import {
  formatDateTimeWib,
  formatPeriod,
  formatPeriodRange,
  formatRupiah,
  shortenHash,
} from "@/lib/format";
import { cn } from "@/lib/utils";

interface ReceiptRowProps {
  label: string;
  children: ReactNode;
  mono?: boolean;
}

function ReceiptRow({ label, children, mono = false }: ReceiptRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className={cn("min-w-0 text-right break-words", mono && "font-mono")}>{children}</dd>
    </div>
  );
}

interface RentReceiptProps {
  bill: BillDetailDto;
  receipt: RentReceiptDto;
  className?: string;
}

/**
 * Kuitansi sewa (Figma: "Kuitansi sewa"): kertas kuitansi tegak dengan dua garis
 * sobek. Memuat nama penghuni karena dokumen ini untuk penghuni; panel on-chain
 * di sebelahnya menegaskan nama itu tidak dicatat di blockchain. Kartu ini juga
 * satu-satunya bagian yang ikut dicetak (data-print-area).
 */
export function RentReceipt({ bill, receipt, className }: RentReceiptProps) {
  const recorded = bill.chain?.status === "RECORDED";
  // Data lampau seed lunas tanpa pembayaran Midtrans, jadi tidak punya order_id.
  // Nomornya sengaja tidak dibentuk di sini supaya tidak disangka order_id Midtrans.
  const historic = receipt.orderId === null;
  const method = paymentMethodName(receipt.method, receipt.bank);
  const paidAtValue = receipt.paidAt ?? bill.paidAt;
  const paidAt = paidAtValue ? formatDateTimeWib(paidAtValue) : null;

  return (
    <article
      data-print-area
      aria-labelledby="judul-kuitansi"
      className={cn("relative flex w-full flex-col rounded-xl bg-card text-card-foreground", className)}
    >
      <div className="flex flex-col items-start gap-3 px-5 pt-7 pb-6 md:px-8">
        <BillStatusBadge status="PAID" />
        <div className="flex w-full flex-col gap-1">
          <h2 id="judul-kuitansi" className="text-h5 font-semibold">
            Kuitansi sewa {formatPeriod(bill.period)}
          </h2>
          <p className="text-h1 font-semibold whitespace-nowrap tabular-nums md:text-number-hero">
            {formatRupiah(bill.amountIdr)}
          </p>
          <p className="text-sm leading-5 text-muted-foreground">
            {paidAt ? `Lunas ${paidAt}` : "Lunas"}
          </p>
        </div>
      </div>

      <TearLine />

      <dl className="flex flex-col gap-3 px-5 py-[22px] text-sm leading-5 md:px-8">
        {receipt.orderId ? (
          <ReceiptRow label="Nomor tagihan" mono>
            {receipt.orderId}
          </ReceiptRow>
        ) : (
          <ReceiptRow label="Nomor tagihan">
            <span className="text-muted-foreground">Data lampau, tanpa order Midtrans</span>
          </ReceiptRow>
        )}
        <ReceiptRow label="Diterima dari">{receipt.tenantName} (dummy)</ReceiptRow>
        <ReceiptRow label="Kamar">
          {receipt.roomNumber}, {receipt.propertyName}
        </ReceiptRow>
        <ReceiptRow label="Periode sewa">{formatPeriodRange(bill.period)}</ReceiptRow>
        {method ? <ReceiptRow label="Metode">{method}</ReceiptRow> : null}
        {paidAt ? <ReceiptRow label="Waktu bayar">{paidAt}</ReceiptRow> : null}
        {receipt.transactionId ? (
          <ReceiptRow label="ID transaksi Midtrans" mono>
            <span title={receipt.transactionId}>{shortenTransactionId(receipt.transactionId)}</span>
          </ReceiptRow>
        ) : null}
      </dl>

      <TearLine />

      <dl className="flex flex-col gap-3 px-5 py-[22px] text-sm leading-5 md:px-8">
        <ReceiptRow label="Sewa kamar">{formatRupiah(bill.amountIdr)}</ReceiptRow>
        <ReceiptRow label="Biaya tambahan">{formatRupiah(0)}</ReceiptRow>
        <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
          <dt className="text-base leading-6 font-medium">Total dibayar</dt>
          <dd className="text-number-md font-semibold whitespace-nowrap tabular-nums">
            {formatRupiah(bill.amountIdr)}
          </dd>
        </div>
      </dl>

      <p className="rounded-b-xl bg-muted px-5 pt-3.5 pb-[18px] text-xs leading-4 text-muted-foreground md:px-8">
        Kuitansi elektronik KosBagi untuk {receipt.propertyName}.{" "}
        {historic
          ? "Data dummy tagihan lampau yang lunas tanpa pembayaran Midtrans."
          : "Data dummy dari Midtrans sandbox."}
      </p>

      {recorded ? <RecordedStamp rotated={false} className="absolute top-4 right-3" /> : null}
    </article>
  );
}

/** ID transaksi Midtrans berupa UUID: "7c1d0e5a…b2f4" (8 + 4 karakter). */
function shortenTransactionId(id: string): string {
  if (id.startsWith("0x")) return shortenHash(id);
  return id.length > 14 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}
