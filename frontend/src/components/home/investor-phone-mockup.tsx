import Image from "next/image";

import { formatRupiah, shortenHash } from "@/lib/format";
import { roomRents } from "@/lib/data/rooms";
import { cn } from "@/lib/utils";

const previewRows = ["K03", "K05", "K04"]
  .map((code) => roomRents.find((room) => room.code === code))
  .filter((room) => room !== undefined);

/**
 * Mockup ponsel investor (Figma: "Mockup ponsel investor"): pratinjau layar
 * Portofolio (progress 4) yang dibangun dari komponen dan token, bukan gambar.
 * Layar selalu memakai mode Gelap (class "dark"); bingkai mengikuti --foreground.
 * Isinya ilustrasi, jadi disembunyikan dari pembaca layar dan diganti label.
 */
export function InvestorPhoneMockup({ className }: { className?: string }) {
  return (
    <figure
      aria-label="Pratinjau layar Portofolio investor dengan data dummy: perkiraan bagi hasil November Rp43.875 untuk 100 token."
      className={cn("relative h-[528px] w-[264px] lg:h-[600px] lg:w-[300px]", className)}
    >
      <div
        aria-hidden
        className="absolute top-0 right-0 h-[600px] w-[300px] origin-top-right scale-[0.88] rounded-[48px] bg-foreground p-2.5 shadow-float lg:scale-100"
      >
        <div className="dark flex h-full flex-col gap-[18px] overflow-hidden rounded-[38px] bg-background px-5 py-[22px] text-foreground">
          <div className="flex justify-between text-xs leading-4 font-medium">
            <span>09.41</span>
            <span className="text-muted-foreground">Sepolia</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs leading-4 text-muted-foreground">Perkiraan bagi hasil November</span>
            <span className="text-number-lg font-semibold tabular-nums">
              {formatRupiah(43_875)}
            </span>
            <span className="text-xs leading-4 text-muted-foreground">
              100 token KB-SMR01 × Rp438,75
            </span>
          </div>

          {/* Grafik garis bagi hasil: dua vektor hasil ekspor Figma. */}
          <div className="relative h-[72px] w-full shrink-0 overflow-hidden">
            <div className="absolute inset-[11.11%_0_13.89%_0]">
              <div className="absolute inset-[-2.32%_-0.52%]">
                <Image src="/images/mockup/payout-line.svg" alt="" fill unoptimized />
              </div>
            </div>
            <div className="absolute inset-[5.56%_-1.67%_83.33%_98.33%]">
              <Image src="/images/mockup/payout-dot.svg" alt="" fill unoptimized />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs leading-4 font-medium text-muted-foreground">
              Sewa masuk, November
            </span>
            {previewRows.map((room) =>
              room.billStatus === "PAID" && room.txHash ? (
                <div
                  key={room.code}
                  className="flex items-center justify-between rounded-md bg-success px-2.5 py-2 text-success-foreground"
                >
                  <span className="text-sm leading-5 font-semibold">{room.code}</span>
                  <span className="font-mono text-xs leading-4">{shortenHash(room.txHash)}</span>
                </div>
              ) : (
                <div
                  key={room.code}
                  className="flex items-center justify-between rounded-md bg-muted px-2.5 py-2"
                >
                  <span className="text-sm leading-5 font-semibold">{room.code}</span>
                  <span className="font-mono text-xs leading-4 text-muted-foreground">
                    belum dibayar
                  </span>
                </div>
              )
            )}
          </div>

          <div className="mt-auto flex h-11 w-full items-center justify-center rounded-full bg-primary text-button font-semibold text-primary-foreground">
            Tarik saldo
          </div>
        </div>
      </div>
    </figure>
  );
}
