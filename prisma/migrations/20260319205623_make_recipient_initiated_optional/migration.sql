-- DropForeignKey
ALTER TABLE "payout_requests" DROP CONSTRAINT "payout_requests_initiated_by_fkey";

-- DropForeignKey
ALTER TABLE "payout_requests" DROP CONSTRAINT "payout_requests_recipient_id_fkey";

-- AlterTable
ALTER TABLE "payout_requests" ALTER COLUMN "recipient_id" DROP NOT NULL,
ALTER COLUMN "initiated_by" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "recipients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
