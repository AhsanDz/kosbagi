"use client";

import { CopyIcon } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";

import type { HexString } from "@/lib/types";

/** Tombol salin hash lengkap, dipakai di Status on-chain ukuran Tumpuk. */
export function CopyHashButton({ hash }: { hash: HexString }) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(hash);
      toast.success("Hash transaksi disalin");
    } catch {
      toast.error("Hash belum tersalin. Salin manual dari Etherscan.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Salin hash transaksi"
      title="Salin hash transaksi"
      className="-m-1.5 inline-flex size-6 shrink-0 items-center justify-center rounded-sm"
    >
      <CopyIcon aria-hidden className="size-3" />
    </button>
  );
}
