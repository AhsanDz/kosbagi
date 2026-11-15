-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'DUPLICATE_PAID', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentAnomalyType" AS ENUM ('AMOUNT_MISMATCH', 'UNKNOWN_ORDER', 'DUPLICATE_BILL_PAYMENT');

-- CreateEnum
CREATE TYPE "OutboxJobType" AS ENUM ('RECORD_RENT', 'WHITELIST_KYC', 'TRANSFER_TOKENS', 'RECORD_EXPENSE', 'CLOSE_PERIOD');

-- CreateEnum
CREATE TYPE "OutboxJobStatus" AS ENUM ('PENDING', 'DISPATCHED');

-- CreateEnum
CREATE TYPE "ChainTransactionStatus" AS ENUM ('PENDING', 'RECORDED', 'FAILED');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OfferingStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TokenPurchaseStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "OwnerApplicationStatus" AS ENUM ('SUBMITTED', 'ASSESSMENT', 'TOKEN_ISSUANCE', 'OFFERING', 'MANAGED');

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "order_id" TEXT NOT NULL,
    "bill_id" UUID,
    "token_purchase_id" UUID,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "amount_idr" BIGINT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "method" TEXT,
    "snap_token" TEXT,
    "snap_redirect_url" TEXT,
    "provider_status" TEXT,
    "provider_transaction_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_anomalies" (
    "id" UUID NOT NULL,
    "type" "PaymentAnomalyType" NOT NULL,
    "order_id" TEXT NOT NULL,
    "payment_id" UUID,
    "expected_amount_idr" BIGINT,
    "received_amount_idr" BIGINT,
    "provider_status" TEXT,
    "note" TEXT,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_anomalies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_jobs" (
    "id" UUID NOT NULL,
    "type" "OutboxJobType" NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "payment_id" UUID,
    "status" "OutboxJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "dispatched_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbox_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chain_transactions" (
    "id" UUID NOT NULL,
    "outbox_job_id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "tx_hash" TEXT,
    "block_number" BIGINT,
    "status" "ChainTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chain_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_submissions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "dummy_id_number" TEXT NOT NULL,
    "status" "KycStatus" NOT NULL DEFAULT 'SUBMITTED',
    "rejection_reason" TEXT,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kyc_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custodial_wallets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "address" TEXT NOT NULL,
    "derivation_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custodial_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offerings" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "tokens_offered" INTEGER NOT NULL,
    "tokens_sold" INTEGER NOT NULL DEFAULT 0,
    "status" "OfferingStatus" NOT NULL DEFAULT 'OPEN',
    "closes_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offerings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_purchases" (
    "id" UUID NOT NULL,
    "offering_id" UUID NOT NULL,
    "investor_id" UUID NOT NULL,
    "token_amount" INTEGER NOT NULL,
    "amount_idr" BIGINT NOT NULL,
    "status" "TokenPurchaseStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "reserved_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owner_applications" (
    "id" UUID NOT NULL,
    "application_number" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "owner_name" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "property_address" TEXT NOT NULL,
    "room_count" INTEGER NOT NULL,
    "monthly_rent_idr" BIGINT NOT NULL,
    "occupancy_percent" DOUBLE PRECISION NOT NULL,
    "status" "OwnerApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owner_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_order_id_key" ON "payments"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_bill_id_attempt_key" ON "payments"("bill_id", "attempt");

-- CreateIndex
CREATE UNIQUE INDEX "payments_token_purchase_id_attempt_key" ON "payments"("token_purchase_id", "attempt");

-- CreateIndex
CREATE INDEX "payment_anomalies_payment_id_idx" ON "payment_anomalies"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_anomalies_order_id_type_key" ON "payment_anomalies"("order_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_jobs_dedupe_key_key" ON "outbox_jobs"("dedupe_key");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_jobs_payment_id_key" ON "outbox_jobs"("payment_id");

-- CreateIndex
CREATE INDEX "outbox_jobs_status_created_at_idx" ON "outbox_jobs"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "chain_transactions_tx_hash_key" ON "chain_transactions"("tx_hash");

-- CreateIndex
CREATE INDEX "chain_transactions_outbox_job_id_idx" ON "chain_transactions"("outbox_job_id");

-- CreateIndex
CREATE INDEX "chain_transactions_reference_idx" ON "chain_transactions"("reference");

-- CreateIndex
CREATE INDEX "kyc_submissions_user_id_created_at_idx" ON "kyc_submissions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "kyc_submissions_status_created_at_idx" ON "kyc_submissions"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "custodial_wallets_user_id_key" ON "custodial_wallets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "custodial_wallets_address_key" ON "custodial_wallets"("address");

-- CreateIndex
CREATE UNIQUE INDEX "custodial_wallets_derivation_index_key" ON "custodial_wallets"("derivation_index");

-- CreateIndex
CREATE INDEX "offerings_property_id_idx" ON "offerings"("property_id");

-- CreateIndex
CREATE INDEX "token_purchases_offering_id_status_idx" ON "token_purchases"("offering_id", "status");

-- CreateIndex
CREATE INDEX "token_purchases_investor_id_status_idx" ON "token_purchases"("investor_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "owner_applications_application_number_key" ON "owner_applications"("application_number");

-- CreateIndex
CREATE UNIQUE INDEX "owner_applications_year_sequence_key" ON "owner_applications"("year", "sequence");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_token_purchase_id_fkey" FOREIGN KEY ("token_purchase_id") REFERENCES "token_purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_anomalies" ADD CONSTRAINT "payment_anomalies_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox_jobs" ADD CONSTRAINT "outbox_jobs_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chain_transactions" ADD CONSTRAINT "chain_transactions_outbox_job_id_fkey" FOREIGN KEY ("outbox_job_id") REFERENCES "outbox_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_submissions" ADD CONSTRAINT "kyc_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_submissions" ADD CONSTRAINT "kyc_submissions_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custodial_wallets" ADD CONSTRAINT "custodial_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offerings" ADD CONSTRAINT "offerings_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_purchases" ADD CONSTRAINT "token_purchases_offering_id_fkey" FOREIGN KEY ("offering_id") REFERENCES "offerings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_purchases" ADD CONSTRAINT "token_purchases_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Aturan di bawah ditulis tangan karena schema.prisma belum bisa menyatakannya.
-- Prisma mengabaikan index parsial dan CHECK saat membandingkan skema, jadi tidak dianggap drift.

-- Satu tagihan paling banyak punya satu pembayaran berstatus PAID. Percobaan lain yang ikut
-- terbayar berstatus DUPLICATE_PAID dan dicatat sebagai anomali.
CREATE UNIQUE INDEX "payments_bill_id_paid_key" ON "payments"("bill_id") WHERE "status" = 'PAID';

-- Aturan yang sama untuk pesanan token.
CREATE UNIQUE INDEX "payments_token_purchase_id_paid_key" ON "payments"("token_purchase_id") WHERE "status" = 'PAID';

-- Setiap pembayaran milik tepat satu sasaran: tagihan sewa atau pesanan token.
ALTER TABLE "payments" ADD CONSTRAINT "payments_exactly_one_target_check" CHECK (num_nonnulls("bill_id", "token_purchase_id") = 1);

-- Satu investor paling banyak punya satu pengajuan KYC yang masih berlaku.
CREATE UNIQUE INDEX "kyc_submissions_user_id_active_key" ON "kyc_submissions"("user_id") WHERE "status" IN ('SUBMITTED', 'APPROVED');

