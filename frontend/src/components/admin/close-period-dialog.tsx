"use client";

import { CircleNotchIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PeriodReceiptDto } from "@/lib/api/types";
import { formatPeriod, formatRupiah, formatSen } from "@/lib/format";

interface ClosePeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  period: string;
  receipt: PeriodReceiptDto;
  submitting: boolean;
  onConfirm: () => void;
}

/**
 * Dialog konfirmasi tutup periode (Figma: "Dialog konfirmasi"). closePeriod
 * permanen di Sepolia, jadi admin diminta memastikan angka struk sekali lagi.
 */
export function ClosePeriodDialog({
  open,
  onOpenChange,
  period,
  receipt,
  submitting,
  onConfirm,
}: ClosePeriodDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => (submitting ? undefined : onOpenChange(next))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tutup periode {formatPeriod(period)}?</DialogTitle>
          <DialogDescription>
            Sewa bersih {formatRupiah(receipt.netRentIdr)} dan nilai {formatSen(receipt.valuePerTokenSen)}{" "}
            per token akan dicatat permanen di Sepolia. Langkah ini tidak bisa dibatalkan.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={submitting}>
              Batal
            </Button>
          </DialogClose>
          <Button type="button" disabled={submitting} aria-busy={submitting} onClick={onConfirm}>
            {submitting ? (
              <CircleNotchIcon aria-hidden data-icon="inline-start" className="animate-spin" />
            ) : null}
            Tutup periode
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
