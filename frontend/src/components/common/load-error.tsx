import { ArrowsClockwiseIcon, WarningCircleIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

interface LoadErrorProps {
  /** Mis. "Data KYC gagal dimuat". */
  title: string;
  retrying: boolean;
  onRetry: () => void;
  className?: string;
}

/**
 * State error halaman peran (Figma: Empty state, varian Error): pesan dan
 * tombol Muat ulang. Deskripsinya sama dengan frame Tagihan error.
 */
export function LoadError({ title, retrying, onRetry, className }: LoadErrorProps) {
  return (
    <div role="alert" className={cn("rounded-xl bg-card text-card-foreground", className)}>
      <Empty className="rounded-xl border-0 px-6 py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="text-destructive">
            <WarningCircleIcon aria-hidden />
          </EmptyMedia>
          <EmptyTitle className="mt-2">{title}</EmptyTitle>
          <EmptyDescription>
            Server KosBagi tidak merespons. Periksa koneksi, lalu muat ulang.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={retrying}
            aria-busy={retrying}
            onClick={onRetry}
          >
            <ArrowsClockwiseIcon
              aria-hidden
              data-icon="inline-start"
              className={retrying ? "animate-spin" : undefined}
            />
            Muat ulang
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
