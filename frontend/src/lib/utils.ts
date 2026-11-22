import { createCn } from "cn/config"

/**
 * Penggabung class Tailwind (pengganti clsx + tailwind-merge) yang sudah
 * mengenal token tipografi KosBagi. Tanpa konfigurasi ini, kelas seperti
 * `text-button` atau `text-h3` dikira warna teks dan bisa terhapus saat
 * digabung dengan `text-foreground`.
 */
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display-number",
            "display-hero",
            "display-section",
            "display-page",
            "display-mobile",
            "display-section-mobile",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "number-lg",
            "number-md",
            "number-hero",
            "mono-lg",
            "display-stamp",
            "button",
          ],
        },
      ],
      shadow: [{ shadow: ["float"] }],
    },
  },
})
