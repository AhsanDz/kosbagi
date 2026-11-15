import type { Metadata } from "next";

import { DemoAccountList } from "@/components/auth/demo-account-list";
import { LoginForm } from "@/components/auth/login-form";
import { SkipLink } from "@/components/common/skip-link";
import { TextLink } from "@/components/common/text-link";
import { PublicNavbar } from "@/components/public/public-navbar";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk dengan akun demo investor, penghuni, pengelola, atau admin. Semua data dummy.",
};

/**
 * Halaman Masuk (Figma: Publik / Masuk). Di luar route group (publik), jadi
 * tanpa footer, dan navbar-nya tanpa tombol Masuk. Kiri: kartu akun demo per
 * peran; kanan: form email dengan state error.
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SkipLink />
      <PublicNavbar showLogin={false} />
      <main id="isi-utama" tabIndex={-1} className="flex-1 outline-none">
        <div className="container-page grid items-start gap-10 pt-8 pb-16 lg:grid-cols-[minmax(0,1fr)_408px] lg:gap-[72px] lg:pt-14">
          <div className="flex min-w-0 flex-col gap-6">
            <h1 className="max-w-[520px] font-display text-display-section-mobile font-black text-foreground uppercase md:text-display-page">
              Masuk dengan akun demo
            </h1>
            <p className="max-w-[560px] text-base leading-6 text-muted-foreground md:text-lg md:leading-7">
              Pilih peran untuk mencoba alur KosBagi. Semua akun dan transaksinya berisi data dummy.
            </p>
            <DemoAccountList />
            <p className="flex flex-wrap items-center gap-2 pt-2 text-sm leading-5 text-muted-foreground">
              Pemilik kos yang ingin bergabung?
              <TextLink href="/pemilik" className="text-foreground">
                Ajukan kos
              </TextLink>
            </p>
          </div>

          <LoginForm />
        </div>
      </main>
    </div>
  );
}
