import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { kosSumbersari01 } from "@/lib/data/properties";
import { etherscanAddressUrl } from "@/lib/format";
import { siteConfig } from "@/lib/site";

const pageLinks = [
  { href: "/", label: "Beranda" },
  { href: "/kos", label: "Daftar kos" },
  { href: "/pemilik", label: "Untuk pemilik kos" },
  { href: "/#cara-kerja", label: "Cara kerja" },
  { href: "/masuk", label: "Masuk" },
];

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 text-sm leading-5">
      <h2 className="font-semibold text-foreground">{title}</h2>
      <ul className="flex flex-col gap-3 text-muted-foreground">{children}</ul>
    </div>
  );
}

function ExternalItem({ href, children }: { href?: string; children: ReactNode }) {
  // Tanpa alamat (mis. repo GitHub belum dibuat), tampilkan sebagai teks biasa.
  if (!href) return <li>{children}</li>;
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-sm transition-colors hover:text-foreground hover:underline"
      >
        {children}
        <span className="sr-only"> (membuka tab baru)</span>
      </a>
    </li>
  );
}

/**
 * Footer semua halaman publik (Figma: "Footer publik"): identitas prototipe,
 * tautan halaman, tautan transparansi, dan catatan foto buatan AI.
 */
export function PublicFooter() {
  const { contracts } = kosSumbersari01;

  return (
    <footer className="border-t border-border">
      <div className="container-page flex flex-col gap-10 pt-10 pb-8 lg:pt-16 lg:pb-10">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_auto_auto] md:gap-x-10 lg:grid-cols-[minmax(0,1fr)_240px_240px] lg:gap-x-20">
          <div className="flex max-w-[480px] flex-col gap-4 text-sm leading-5">
            <Logo />
            <p className="text-foreground">
              Prototipe tugas akhir Kelompok 9, mata kuliah Teknologi Blockchain dan Platform
              Keuangan Digital, FILKOM Universitas Brawijaya.
            </p>
            <p className="text-muted-foreground">
              Semua data dummy. Pembayaran memakai Midtrans sandbox, pencatatan memakai Ethereum
              Sepolia testnet. Tidak ada uang nyata.
            </p>
          </div>

          <FooterColumn title="Halaman">
            {pageLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="rounded-sm transition-colors hover:text-foreground hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn title="Transparansi">
            <ExternalItem href={etherscanAddressUrl(contracts.kosToken)}>
              Kontrak KosToken di Etherscan
            </ExternalItem>
            <ExternalItem href={etherscanAddressUrl(contracts.kosLedger)}>
              Kontrak KosLedger di Etherscan
            </ExternalItem>
            <ExternalItem href={siteConfig.repositoryUrl}>Repositori GitHub</ExternalItem>
          </FooterColumn>
        </div>

        <div className="flex flex-col gap-2 text-xs leading-4 text-muted-foreground sm:flex-row sm:justify-between">
          <p>© 2026 Kelompok 9 FILKOM UB</p>
          <p>Foto kos adalah ilustrasi buatan AI.</p>
        </div>
      </div>
    </footer>
  );
}
