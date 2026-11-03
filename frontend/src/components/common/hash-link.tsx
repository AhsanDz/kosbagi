import { etherscanTxUrl, shortenHash } from "@/lib/format";
import type { HexString } from "@/lib/types";
import { cn } from "@/lib/utils";

interface HashLinkProps {
  hash: HexString;
  /** Teks pembaca layar, mis. "Transaksi sewa K03". */
  label: string;
  className?: string;
}

/**
 * Tx hash yang disingkat 6+4 (0x8f3a…c21d) dalam Geist Mono dan menaut ke
 * Etherscan Sepolia. Hash lengkap muncul sebagai title saat kursor diarahkan.
 */
export function HashLink({ hash, label, className }: HashLinkProps) {
  return (
    <a
      href={etherscanTxUrl(hash)}
      target="_blank"
      rel="noopener noreferrer"
      title={hash}
      className={cn(
        "rounded-sm font-mono tabular-nums underline decoration-1 underline-offset-2 hover:decoration-2",
        className
      )}
    >
      <span className="sr-only">{label}, lihat di Etherscan: </span>
      {shortenHash(hash)}
    </a>
  );
}
