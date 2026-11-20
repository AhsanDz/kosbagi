-- Skema v3 (progress 3): pembelian token dan kuitansi sewa.
-- Semua tambahan berupa nilai enum baru, kolom opsional, dan aturan CHECK, sehingga data v2
-- tetap sah dan seed jalur 1 yang memakai model v2 tetap jalan.

-- AlterEnum
-- Nilai enum baru tidak dipakai di migrasi ini, jadi aman ditambahkan bersama di PostgreSQL 12+.
ALTER TYPE "PaymentAnomalyType" ADD VALUE 'DUPLICATE_PURCHASE_PAYMENT';
ALTER TYPE "PaymentAnomalyType" ADD VALUE 'PURCHASE_UNFULFILLABLE';

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'UNFULFILLED';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "bank" TEXT;

-- AlterTable
ALTER TABLE "token_purchases" ADD COLUMN     "order_number" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "token_purchases_order_number_key" ON "token_purchases"("order_number");

-- Aturan di bawah ditulis tangan karena schema.prisma belum bisa menyatakannya.

-- Penjualan tidak pernah melebihi jumlah yang ditawarkan, walau ada bug di kode aplikasi.
ALTER TABLE "offerings" ADD CONSTRAINT "offerings_tokens_sold_check" CHECK ("tokens_sold" >= 0 AND "tokens_sold" <= "tokens_offered");

-- Pesanan selalu berisi minimal satu token.
ALTER TABLE "token_purchases" ADD CONSTRAINT "token_purchases_token_amount_check" CHECK ("token_amount" > 0);
