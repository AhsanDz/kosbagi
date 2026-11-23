"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  CircleNotchIcon,
  HourglassIcon,
  InfoIcon,
  ShieldCheckIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { BillStatusBadge } from "@/components/common/bill-status-badge";
import { ChainStatusStack } from "@/components/common/chain-status-stack";
import { DataRows, type DataRow } from "@/components/common/data-rows";
import { KycStatusBadge } from "@/components/common/kyc-status-badge";
import { TearLine } from "@/components/common/tear-line";
import { PendingBadge } from "@/components/investor/pending-badge";
import { PaymentCountdown } from "@/components/tenant/payment-countdown";
import { RecordedStamp } from "@/components/tenant/recorded-stamp";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type {
  CurrentOfferingPayload,
  CustodialWalletDto,
  PurchaseDto,
} from "@/lib/api/types";
import { paymentMethodName } from "@/lib/billing";
import { formatDateTimeWib, formatNumber, formatRupiah, formatTimeWib, shortenHash } from "@/lib/format";
import {
  checkAmount,
  estimateMonthlyPayout,
  parseTokenAmount,
  type TicketState,
} from "@/lib/purchase";
import { cn } from "@/lib/utils";

/** Semua yang dibutuhkan tiket dari halaman penawaran. */
export interface BuyTicketController {
  state: TicketState;
  payload: CurrentOfferingPayload;
  purchase: PurchaseDto | null;
  wallet: CustodialWalletDto | null;
  amountText: string;
  setAmountText: (value: string) => void;
  agreed: boolean;
  setAgreed: (value: boolean) => void;
  paying: boolean;
  pay: () => void;
  resume: () => void;
  startNewOrder: () => void;
  markExpired: () => void;
}

const SECTION_X = "px-5 md:px-7";

function TicketHead({ label, aside, total, caption, muted = false }: {
  label: ReactNode;
  aside: ReactNode;
  total: string;
  caption: string;
  muted?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5 pt-6 pb-5", SECTION_X)}>
      <div className="flex items-center justify-between gap-3 pb-2">
        {label}
        {aside}
      </div>
      <p
        className={cn(
          "text-number-lg font-semibold whitespace-nowrap tabular-nums",
          muted ? "text-muted-foreground" : "text-card-foreground"
        )}
      >
        {total}
      </p>
      <p className="text-sm leading-5 text-muted-foreground">{caption}</p>
    </div>
  );
}

function TicketLabel() {
  return <p className="text-sm leading-5 font-medium text-muted-foreground">Tiket beli</p>;
}

function SymbolChip({ symbol }: { symbol: string }) {
  return (
    <span className="rounded-[6px] bg-muted px-2 py-[3px] font-mono text-xs leading-4 text-foreground">
      {symbol}
    </span>
  );
}

function OrderLabel({ orderId }: { orderId: string }) {
  return <p className="font-mono text-xs leading-4 text-muted-foreground">{orderId}</p>;
}

function Heading({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-h5 font-semibold">{title}</h3>
      <p className="text-sm leading-5 text-muted-foreground">{children}</p>
    </div>
  );
}

function Note({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-xs leading-4 text-muted-foreground">
      {icon}
      <span>{children}</span>
    </p>
  );
}

const methodNote = (
  <Note icon={<InfoIcon aria-hidden className="size-4 shrink-0" />}>
    Sampai 100 token bisa lewat virtual account, QRIS, atau e-wallet. Di atas 100 token hanya
    virtual account.
  </Note>
);

function walletRow(wallet: CustodialWalletDto | null): DataRow[] {
  if (!wallet) return [];
  return [
    {
      label: "Dompet kustodian",
      value: <span title={wallet.address}>{shortenHash(wallet.address)}</span>,
      mono: true,
    },
  ];
}

/**
 * Tiket beli (Figma: "Tiket beli"): 13 varian dalam satu komponen. Total memakai
 * Angka/Besar supaya total terbesar yang sah (1.800 token, Rp180.000.000) muat di
 * lebar 432 px. Skenario 8 dan 9 ditolak sebelum pembayaran dibuat: tombol Bayar
 * nonaktif dan pesan tampil di bawah isian.
 */
export function BuyTicket({ controller, className }: { controller: BuyTicketController; className?: string }) {
  const { state, payload, purchase } = controller;
  const { offering } = payload;
  const price = offering.pricePerTokenIdr;
  const symbol = offering.tokenSymbol;

  const shell = (children: ReactNode, stamp = false) => (
    <section
      aria-label="Tiket beli"
      aria-live="polite"
      className={cn("relative flex flex-col rounded-xl bg-card text-card-foreground", className)}
    >
      {children}
      {stamp ? <RecordedStamp rotated={false} className="absolute -top-1 -right-2" /> : null}
    </section>
  );

  if (state === "FORM") return shell(<TicketForm controller={controller} />);

  if (state === "NEED_KYC" || state === "REGISTERING_WALLET" || state === "SOLD_OUT") {
    const caption =
      state === "SOLD_OUT"
        ? `per token. Penawaran ${symbol} sudah ditutup.`
        : `per token. Batas ${formatNumber(payload.investor.maxPerInvestor)} token per investor.`;
    return shell(
      <>
        <TicketHead
          label={<TicketLabel />}
          aside={<SymbolChip symbol={symbol} />}
          total={formatRupiah(price)}
          caption={caption}
        />
        <TearLine />
        <div className={cn("flex flex-col items-start gap-4 pt-[22px] pb-7", SECTION_X)}>
          {state === "NEED_KYC" ? (
            <>
              <KycStatusBadge
                status={
                  payload.investor.kycStatus && payload.investor.kycStatus !== "NONE"
                    ? payload.investor.kycStatus
                    : "NONE"
                }
              />
              <Heading title="Verifikasi KYC dulu">
                Token hanya bisa dikirim ke dompet kustodian yang lolos KYC di kontrak KosToken.
                Verifikasinya memakai data dummy.
              </Heading>
              <Button asChild className="w-full">
                <Link href="/investor/kyc">
                  <ShieldCheckIcon aria-hidden data-icon="inline-start" />
                  Verifikasi KYC
                </Link>
              </Button>
            </>
          ) : null}
          {state === "REGISTERING_WALLET" ? (
            <>
              <KycStatusBadge status="APPROVED" />
              <Heading title="Dompetmu sedang didaftarkan">
                KYC sudah disetujui. Alamat dompet kustodianmu sedang dicatat lolos KYC di
                KosToken, biasanya kurang dari satu menit.
              </Heading>
              <DataRows rows={walletRow(controller.wallet)} />
              <ChainStatusStack
                chain={controller.wallet?.whitelist ?? null}
                pendingDescription="Transaksi setKycStatus sedang dikirim ke Sepolia. Halaman ini diperbarui otomatis."
                failedDescription="Transaksi setKycStatus belum tercatat setelah beberapa percobaan. Operator KosBagi sedang mengulangnya."
              />
              <Button type="button" className="w-full" disabled>
                Bayar
              </Button>
            </>
          ) : null}
          {state === "SOLD_OUT" ? (
            <>
              <Heading title="Penawaran sudah penuh">
                Seluruh {formatNumber(offering.tokensOffered)} token {symbol} sudah terjual. Bagi
                hasil untuk pemegang token mulai dihitung setelah periode ditutup admin.
              </Heading>
              <Button asChild variant="outline" className="w-full">
                <Link href="/investor/portofolio">Lihat portofolio</Link>
              </Button>
            </>
          ) : null}
        </div>
      </>
    );
  }

  // Semua keadaan di bawah ini punya pesanan.
  if (!purchase) return null;
  const tokens = formatNumber(purchase.tokenAmount);
  const caption = `${tokens} token × ${formatRupiah(price)}`;
  const orderId = purchase.orderNumber ?? purchase.payment?.orderId ?? "Pesanan token";
  const total = formatRupiah(purchase.amountIdr);
  // Batas sisihan token; backend selalu mengisinya selama pesanan menunggu bayar.
  const reservedUntil = purchase.reservedUntil ?? purchase.payment?.expiresAt ?? null;
  const paidRows: DataRow[] = [
    ...walletRow(controller.wallet),
    ...(purchase.payment?.paidAt
      ? [{ label: "Dibayar", value: formatDateTimeWib(purchase.payment.paidAt) }]
      : []),
  ];

  const badge: Record<Exclude<TicketState, "FORM" | "NEED_KYC" | "REGISTERING_WALLET" | "SOLD_OUT">, ReactNode> = {
    PENDING: reservedUntil ? (
      <PendingBadge expiresAt={reservedUntil} />
    ) : (
      <BillStatusBadge status="PENDING" />
    ),
    CHECKING: <BillStatusBadge status="CHECKING" />,
    PAID_SENDING: <BillStatusBadge status="PAID" />,
    PAID_RECORDED: null,
    EXPIRED: <BillStatusBadge status="EXPIRED" />,
    FAILED: <BillStatusBadge status="FAILED" />,
  };

  return shell(
    <>
      <TicketHead
        label={<OrderLabel orderId={orderId} />}
        aside={badge[state]}
        total={total}
        caption={caption}
        muted={state === "EXPIRED" || state === "FAILED"}
      />
      <TearLine />
      <div className={cn("flex flex-col gap-4 pt-[22px] pb-7", SECTION_X)}>
        {state === "PENDING" ? (
          <>
            <DataRows
              className="gap-4"
              rows={[
                { label: "Jumlah", value: `${tokens} token` },
                ...(reservedUntil
                  ? [{ label: "Dipesan sampai", value: formatTimeWib(reservedUntil) }]
                  : []),
              ]}
            />
            {reservedUntil ? (
              <PaymentCountdown expiresAt={reservedUntil} onExpired={controller.markExpired} />
            ) : null}
            <Button
              type="button"
              className="w-full"
              disabled={controller.paying}
              aria-busy={controller.paying}
              onClick={controller.resume}
            >
              {controller.paying ? (
                <CircleNotchIcon aria-hidden data-icon="inline-start" className="animate-spin" />
              ) : null}
              Lanjutkan pembayaran
            </Button>
            <Note icon={<HourglassIcon aria-hidden className="size-4 shrink-0" />}>
              Selama waktu ini {tokens} token disisihkan untukmu dan tidak bisa dipesan investor
              lain.
            </Note>
          </>
        ) : null}

        {state === "CHECKING" ? (
          <>
            <Alert variant="info">
              <InfoIcon aria-hidden />
              <AlertTitle>Menunggu konfirmasi Midtrans</AlertTitle>
              <AlertDescription>Biasanya beberapa detik. Halaman ini diperbarui sendiri.</AlertDescription>
            </Alert>
            <DataRows
              className="gap-4"
              rows={[
                { label: "Jumlah", value: `${tokens} token` },
                ...(paymentMethodName(purchase.payment?.method)
                  ? [{ label: "Metode", value: paymentMethodName(purchase.payment?.method) }]
                  : []),
              ]}
            />
          </>
        ) : null}

        {state === "PAID_SENDING" || state === "PAID_RECORDED" ? (
          <>
            {state === "PAID_SENDING" ? (
              <Heading title={`${tokens} token sedang dikirim`}>
                Pembayaran lunas. Worker sedang memindahkan token dari perbendaharaan properti ke
                dompet kustodianmu.
              </Heading>
            ) : (
              <Heading title={`${tokens} token sudah di dompetmu`}>
                Token {symbol} dipindahkan dari perbendaharaan properti ke dompet kustodianmu lewat
                transferFromTreasury.
              </Heading>
            )}
            <DataRows className="gap-4" rows={paidRows} />
            <ChainStatusStack
              chain={purchase.transfer ?? { status: "PENDING", txHash: null }}
              pendingDescription="Transaksi transferFromTreasury sedang dikirim ke Sepolia. Biasanya selesai kurang dari satu menit."
              failedDescription="Pembayaranmu tetap lunas. Operator KosBagi mengulang pengiriman token ke dompetmu."
            />
            {state === "PAID_SENDING" ? (
              <Button asChild variant="outline" className="w-full">
                <Link href="/investor/portofolio">Lihat portofolio</Link>
              </Button>
            ) : (
              <div className="flex gap-3">
                <Button asChild className="flex-1">
                  <Link href="/investor/portofolio">Lihat portofolio</Link>
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={controller.startNewOrder}>
                  Beli lagi
                </Button>
              </div>
            )}
          </>
        ) : null}

        {state === "EXPIRED" || state === "FAILED" ? (
          <>
            {state === "EXPIRED" ? (
              <Heading title="Pesanan kedaluwarsa">
                Batas bayar 5 menit sudah lewat. {tokens} token yang disisihkan dilepas lagi ke
                penawaran.
              </Heading>
            ) : (
              <Heading title="Pembayaran dibatalkan">
                Midtrans membatalkan transaksi {orderId}. Tagihan pesanan ini ditutup dan token
                dilepas lagi ke penawaran.
              </Heading>
            )}
            <Button type="button" className="w-full" onClick={controller.startNewOrder}>
              Buat pesanan baru
            </Button>
          </>
        ) : null}
      </div>
    </>,
    state === "PAID_RECORDED"
  );
}

/** Varian Siap bayar, Belum setuju, Melebihi sisa, dan Melebihi batas. */
function TicketForm({ controller }: { controller: BuyTicketController }) {
  const { payload, amountText, setAmountText, agreed, setAgreed, paying } = controller;
  const { offering, investor } = payload;
  const price = offering.pricePerTokenIdr;
  const amount = parseTokenAmount(amountText);
  const problem = checkAmount(amount, offering, investor);
  const exceedsRemaining = problem === "EXCEEDS_REMAINING";
  const exceedsQuota = problem === "EXCEEDS_QUOTA";
  const exceeded = exceedsRemaining || exceedsQuota;
  const valid = problem === null && amount !== null;
  const shownAmount = amount ?? 0;

  const helpId = "jumlah-token-bantuan";
  let help: ReactNode;
  if (exceedsRemaining) {
    help = `Melebihi sisa penawaran. Maksimal ${formatNumber(offering.tokensRemaining)} token.`;
  } else if (exceedsQuota) {
    help = `Melebihi batas kepemilikan 10%. Sisa kuota kamu ${formatNumber(investor.remainingQuota)} token.`;
  } else if (valid) {
    help = `Estimasi bagi hasil ±${formatRupiah(estimateMonthlyPayout(shownAmount))} per bulan untuk ${formatNumber(shownAmount)} token.`;
  } else {
    help = "Isi jumlah token yang ingin dibeli, minimal 1 token.";
  }

  return (
    <>
      <TicketHead
        label={<TicketLabel />}
        aside={<SymbolChip symbol={offering.tokenSymbol} />}
        total={formatRupiah(shownAmount * price)}
        caption={`${formatNumber(shownAmount)} token × ${formatRupiah(price)}`}
        muted={exceeded}
      />
      <TearLine />
      <div className={cn("flex flex-col gap-4 pt-[22px] pb-7", SECTION_X)}>
        <div className="flex flex-col gap-2">
          <Label id="jumlah-token-label" htmlFor="jumlah-token">
            Jumlah token
          </Label>
          <label
            className={cn(
              "flex h-12 cursor-text items-center gap-2 rounded-md border bg-card px-4 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring focus-within:outline-solid",
              exceeded ? "border-destructive" : "border-input focus-within:border-foreground"
            )}
          >
            <input
              id="jumlah-token"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={amountText}
              aria-labelledby="jumlah-token-label"
              aria-describedby={helpId}
              aria-invalid={exceeded ? true : undefined}
              onChange={(event) => setAmountText(event.target.value)}
              className="field-sizing-content min-w-[1ch] max-w-[8ch] [appearance:textfield] bg-transparent text-h5 font-semibold text-foreground tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span aria-hidden className="min-w-0 flex-1 text-sm leading-5 text-muted-foreground">
              token
            </span>
            <span aria-hidden className="text-sm leading-5 whitespace-nowrap text-muted-foreground">
              × {formatRupiah(price)}
            </span>
          </label>
          <p
            id={helpId}
            role={exceeded ? "alert" : undefined}
            className={cn(
              "flex items-start gap-1 text-xs leading-4",
              exceeded ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {exceeded ? <WarningCircleIcon aria-hidden className="mt-px size-3.5 shrink-0" /> : null}
            <span>{help}</span>
          </p>
          <div className="flex gap-3 pt-1">
            <QuotaBox
              label="Sisa penawaran"
              value={`${formatNumber(offering.tokensRemaining)} token`}
              alert={exceedsRemaining}
            />
            <QuotaBox
              label="Sisa kuota kamu"
              value={`${formatNumber(investor.remainingQuota)} token`}
              alert={exceedsQuota}
            />
          </div>
        </div>

        {exceedsQuota ? (
          <div className="flex items-center gap-4">
            <p className="min-w-0 flex-1 text-sm leading-5 text-muted-foreground">
              Kamu sudah memegang {formatNumber(investor.holdingTokens)} token {offering.tokenSymbol}.
            </p>
            {investor.remainingQuota > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setAmountText(String(investor.remainingQuota))}
              >
                Pakai {formatNumber(investor.remainingQuota)} token
              </Button>
            ) : null}
          </div>
        ) : null}

        {methodNote}
      </div>
      <TearLine />
      <div className={cn("flex flex-col gap-3.5 pt-5 pb-7", SECTION_X)}>
        <div className="flex items-start gap-3">
          <Checkbox
            id="setuju-risiko"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked === true)}
          />
          <Label htmlFor="setuju-risiko" className="block font-normal">
            Saya sudah membaca ringkasan risiko dan paham token ini hak atas bagi hasil sewa, bukan
            kepemilikan kos.
          </Label>
        </div>
        <Button
          type="button"
          className="w-full"
          disabled={!valid || !agreed || paying}
          aria-busy={paying}
          onClick={controller.pay}
        >
          {paying ? (
            <CircleNotchIcon aria-hidden data-icon="inline-start" className="animate-spin" />
          ) : null}
          {valid ? `Bayar ${formatRupiah(shownAmount * price)}` : "Bayar"}
        </Button>
        <p className="text-xs leading-4 text-muted-foreground">
          Pembayaran lewat Midtrans sandbox. Token dipesan untukmu selama 5 menit setelah tombol
          Bayar ditekan.
        </p>
      </div>
    </>
  );
}

function QuotaBox({ label, value, alert }: { label: string; value: string; alert: boolean }) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-0.5 rounded-md p-3",
        alert ? "bg-destructive-muted text-destructive-muted-foreground" : "bg-muted"
      )}
    >
      <p className={cn("text-xs leading-4", alert ? "" : "text-muted-foreground")}>{label}</p>
      <p className={cn("text-sm leading-5 font-semibold", alert ? "" : "text-foreground")}>{value}</p>
    </div>
  );
}
