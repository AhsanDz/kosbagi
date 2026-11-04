import type { Metadata } from "next";

import { NotFoundContent } from "@/components/common/not-found-content";
import { PublicNavbar } from "@/components/public/public-navbar";

export const metadata: Metadata = { title: "Halaman tidak ditemukan" };

/** 404 untuk alamat yang tidak cocok dengan rute mana pun. */
export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col">
      <PublicNavbar />
      <main className="flex-1">
        <NotFoundContent />
      </main>
    </div>
  );
}
