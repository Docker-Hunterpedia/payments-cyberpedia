-- Add appliedMinor (amount applied to the installment, in the course
-- currency) and backfill existing same-currency payments.
ALTER TABLE "payment_transactions" ADD COLUMN "appliedMinor" INTEGER NOT NULL DEFAULT 0;
UPDATE "payment_transactions" SET "appliedMinor" = "amountMinor";
ALTER TABLE "payment_transactions" ALTER COLUMN "appliedMinor" DROP DEFAULT;
