-- Skema v4 (progress 4): biaya dan nota, penutupan periode, distribusi bagi hasil, pembayaran sewa
-- setelah periode ditutup, riwayat Coba lagi, dan tanda "sudah ditangani" job antrean. Semua
-- tambahan berupa tabel baru dan nilai enum baru; kolom tabel v3 tidak berubah, sehingga data v3
-- tetap sah dan kode yang memakai model v3 tetap jalan.

-- CreateEnum
CREATE TYPE "DistributionHolderType" AS ENUM ('ORIGINAL_OWNER', 'INVESTOR', 'TREASURY');

-- AlterEnum
-- Nilai enum baru tidak dipakai di migrasi ini, jadi aman ditambahkan bersama di PostgreSQL 12+.
ALTER TYPE "PaymentAnomalyType" ADD VALUE 'PAID_AFTER_PERIOD_CLOSED';

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'PAID_AFTER_CLOSE';

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "period" CHAR(7) NOT NULL,
    "category_code" SMALLINT NOT NULL,
    "description" TEXT NOT NULL,
    "amount_idr" BIGINT NOT NULL,
    "receipt_date" DATE NOT NULL,
    "receipt_hash" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "stored_file_name" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "outbox_job_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "period_closings" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "period" CHAR(7) NOT NULL,
    "outbox_job_id" UUID NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gross_rent_idr" BIGINT,
    "total_expenses_idr" BIGINT,
    "platform_fee_idr" BIGINT,
    "tax_idr" BIGINT,
    "net_rent_idr" BIGINT,
    "total_supply" INTEGER,
    "value_per_token_sen" BIGINT,
    "snapshot_block" BIGINT,
    "chain_read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "period_closings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distributions" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "period" CHAR(7) NOT NULL,
    "period_closing_id" UUID NOT NULL,
    "distributed_by_id" UUID NOT NULL,
    "distributed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "net_rent_idr" BIGINT NOT NULL,
    "total_supply" INTEGER NOT NULL,
    "value_per_token_sen" BIGINT NOT NULL,
    "snapshot_block" BIGINT NOT NULL,
    "total_shares_idr" BIGINT NOT NULL,
    "rounding_remainder_idr" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "distributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribution_shares" (
    "id" UUID NOT NULL,
    "distribution_id" UUID NOT NULL,
    "holder_type" "DistributionHolderType" NOT NULL,
    "user_id" UUID,
    "wallet_address" TEXT NOT NULL,
    "token_balance" INTEGER NOT NULL,
    "share_idr" BIGINT NOT NULL,
    "credited_to" "DistributionHolderType" NOT NULL,

    CONSTRAINT "distribution_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_job_retries" (
    "id" UUID NOT NULL,
    "outbox_job_id" UUID NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_job_retries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expenses_receipt_hash_key" ON "expenses"("receipt_hash");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_stored_file_name_key" ON "expenses"("stored_file_name");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_outbox_job_id_key" ON "expenses"("outbox_job_id");

-- CreateIndex
CREATE INDEX "expenses_property_id_period_idx" ON "expenses"("property_id", "period");

-- CreateIndex
CREATE UNIQUE INDEX "period_closings_outbox_job_id_key" ON "period_closings"("outbox_job_id");

-- CreateIndex
CREATE UNIQUE INDEX "period_closings_property_id_period_key" ON "period_closings"("property_id", "period");

-- CreateIndex
CREATE UNIQUE INDEX "distributions_period_closing_id_key" ON "distributions"("period_closing_id");

-- CreateIndex
CREATE UNIQUE INDEX "distributions_property_id_period_key" ON "distributions"("property_id", "period");

-- CreateIndex
CREATE INDEX "distribution_shares_user_id_idx" ON "distribution_shares"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "distribution_shares_distribution_id_wallet_address_key" ON "distribution_shares"("distribution_id", "wallet_address");

-- CreateIndex
CREATE INDEX "outbox_job_retries_outbox_job_id_requested_at_idx" ON "outbox_job_retries"("outbox_job_id", "requested_at");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_outbox_job_id_fkey" FOREIGN KEY ("outbox_job_id") REFERENCES "outbox_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "period_closings" ADD CONSTRAINT "period_closings_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "period_closings" ADD CONSTRAINT "period_closings_outbox_job_id_fkey" FOREIGN KEY ("outbox_job_id") REFERENCES "outbox_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "period_closings" ADD CONSTRAINT "period_closings_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distributions" ADD CONSTRAINT "distributions_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distributions" ADD CONSTRAINT "distributions_period_closing_id_fkey" FOREIGN KEY ("period_closing_id") REFERENCES "period_closings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distributions" ADD CONSTRAINT "distributions_distributed_by_id_fkey" FOREIGN KEY ("distributed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_shares" ADD CONSTRAINT "distribution_shares_distribution_id_fkey" FOREIGN KEY ("distribution_id") REFERENCES "distributions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_shares" ADD CONSTRAINT "distribution_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox_job_retries" ADD CONSTRAINT "outbox_job_retries_outbox_job_id_fkey" FOREIGN KEY ("outbox_job_id") REFERENCES "outbox_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox_job_retries" ADD CONSTRAINT "outbox_job_retries_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Tanda "sudah ditangani" untuk job yang gagal permanen.
-- CreateTable
CREATE TABLE "outbox_job_resolutions" (
    "id" UUID NOT NULL,
    "outbox_job_id" UUID NOT NULL,
    "resolved_by_id" UUID NOT NULL,
    "resolved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT NOT NULL,

    CONSTRAINT "outbox_job_resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "outbox_job_resolutions_outbox_job_id_key" ON "outbox_job_resolutions"("outbox_job_id");

-- AddForeignKey
ALTER TABLE "outbox_job_resolutions" ADD CONSTRAINT "outbox_job_resolutions_outbox_job_id_fkey" FOREIGN KEY ("outbox_job_id") REFERENCES "outbox_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox_job_resolutions" ADD CONSTRAINT "outbox_job_resolutions_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Aturan di bawah ditulis tangan karena schema.prisma belum bisa menyatakannya.

-- Kode kategori muat di uint8 (argumen category KosLedger.recordExpense), nominal biaya positif,
-- dan hash nota selalu 0x diikuti 64 heksadesimal huruf kecil.
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_code_check" CHECK ("category_code" BETWEEN 1 AND 255);
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_amount_idr_check" CHECK ("amount_idr" > 0);
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_receipt_hash_check" CHECK ("receipt_hash" ~ '^0x[0-9a-f]{64}$');

-- Investor selalu punya akun; pemilik lama dan perbendaharaan tidak. Saldo dan bagian tidak pernah
-- negatif. Pemilik lama dan perbendaharaan selalu dicatat walau saldonya 0; investor bersaldo 0
-- tidak dicatat (diatur kode aplikasi).
ALTER TABLE "distribution_shares" ADD CONSTRAINT "distribution_shares_user_check" CHECK (("holder_type" = 'INVESTOR') = ("user_id" IS NOT NULL));
ALTER TABLE "distribution_shares" ADD CONSTRAINT "distribution_shares_token_balance_check" CHECK ("token_balance" >= 0);
ALTER TABLE "distribution_shares" ADD CONSTRAINT "distribution_shares_share_idr_check" CHECK ("share_idr" >= 0);
ALTER TABLE "distributions" ADD CONSTRAINT "distributions_rounding_remainder_idr_check" CHECK ("rounding_remainder_idr" >= 0);

-- Catatan admin saat menandai job sudah ditangani: 5 sampai 300 karakter.
ALTER TABLE "outbox_job_resolutions" ADD CONSTRAINT "outbox_job_resolutions_note_check" CHECK (char_length("note") BETWEEN 5 AND 300);
