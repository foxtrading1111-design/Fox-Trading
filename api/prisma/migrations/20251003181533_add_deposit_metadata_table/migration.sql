-- CreateTable
CREATE TABLE "public"."deposit_metadata" (
    "id" VARCHAR(30) NOT NULL,
    "transaction_id" VARCHAR(30) NOT NULL,
    "blockchain" VARCHAR(20) NOT NULL,
    "screenshot" TEXT,
    "transaction_hash" VARCHAR(200),
    "wallet_address" VARCHAR(200),
    "ip_address" VARCHAR(50),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deposit_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deposit_metadata_transaction_id_key" ON "public"."deposit_metadata"("transaction_id");

-- CreateIndex
CREATE INDEX "idx_deposit_metadata_transaction" ON "public"."deposit_metadata"("transaction_id");

-- AddForeignKey
ALTER TABLE "public"."deposit_metadata" ADD CONSTRAINT "deposit_metadata_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
