-- AddColumn
ALTER TABLE "transactions" ADD COLUMN "unlock_date" TIMESTAMP(6);
ALTER TABLE "transactions" ADD COLUMN "referral_level" INTEGER;
ALTER TABLE "transactions" ADD COLUMN "monthly_income_source_user_id" VARCHAR(30);

-- Update existing deposit transactions to have 6-month unlock date
UPDATE "transactions" 
SET "unlock_date" = "timestamp" + INTERVAL '6 months'
WHERE ("type" = 'DEPOSIT' AND "status" = 'COMPLETED') 
   OR ("type" = 'credit' AND "income_source" LIKE '%_deposit');

-- Create index for efficient withdrawal queries
CREATE INDEX "idx_transactions_unlock_date" ON "transactions"("user_id", "unlock_date") WHERE "unlock_date" IS NOT NULL;
CREATE INDEX "idx_transactions_referral_level" ON "transactions"("user_id", "referral_level") WHERE "referral_level" IS NOT NULL;