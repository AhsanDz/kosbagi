/**
 * Kartu bukti (Figma: "Kartu bukti"): apa yang dicatat di blockchain dan apa
 * yang tidak. Selalu gelap: class "dark" memakai token mode Gelap untuk bagian
 * ini saja, di kedua tema halaman.
 */
export function ProofCard() {
  return (
    <section
      aria-labelledby="judul-bukti"
      className="dark flex flex-col items-start gap-3.5 rounded-xl bg-card p-5 text-card-foreground lg:flex-row lg:items-center lg:gap-10 lg:px-8 lg:py-6"
    >
      <h2 id="judul-bukti" className="text-h4 font-semibold whitespace-nowrap">
        Bukti sewamu
      </h2>
      <div className="flex min-w-0 flex-col gap-1 text-sm leading-5 lg:flex-1">
        <p className="font-semibold text-success">Dicatat di blockchain</p>
        <p className="text-muted-foreground">Kamar, periode, nominal, dan hash nomor tagihan.</p>
      </div>
      <div className="flex min-w-0 flex-col gap-1 text-sm leading-5 text-muted-foreground lg:flex-1">
        <p className="font-semibold">Tidak pernah dicatat</p>
        <p>Namamu, nomor identitas, dan nomor rekening.</p>
      </div>
    </section>
  );
}
