-- AlterTable
ALTER TABLE "PurchaseRequisition" DROP COLUMN "expectedArrivalDate",
ADD COLUMN     "attachments" JSONB NOT NULL DEFAULT '[]';
