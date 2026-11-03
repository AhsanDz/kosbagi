import { FlaskIcon } from "@phosphor-icons/react/ssr";

/**
 * Banner sandbox (Figma: "Banner sandbox"). Wajib di setiap layar setelah masuk,
 * di atas header, dan tidak bisa ditutup. Teks pesannya tidak boleh diubah.
 */
export function SandboxBanner() {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-warning bg-warning-muted px-4 py-2 text-warning-muted-foreground md:px-6"
    >
      <p className="flex items-center gap-2 text-sm leading-5 font-semibold">
        <FlaskIcon aria-hidden className="size-4 shrink-0" />
        Mode sandbox: data dummy, tanpa uang nyata
      </p>
      <p className="text-xs leading-4">Midtrans sandbox · Ethereum Sepolia testnet</p>
    </div>
  );
}
