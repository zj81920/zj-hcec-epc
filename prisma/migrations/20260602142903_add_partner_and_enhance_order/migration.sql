-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "applicableStandard" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "brand" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "material" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "materialCode" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "materialGrade" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "purpose" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "requiredDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProcurementOrder" ADD COLUMN     "attachments" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "deliveryAddress" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "purchaser" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "supplierContact" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "supplierId" TEXT,
ADD COLUMN     "supplierPhone" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "taxId" TEXT NOT NULL DEFAULT '',
    "contactPerson" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "qualification" TEXT NOT NULL DEFAULT '',
    "bankName" TEXT NOT NULL DEFAULT '',
    "bankAccount" TEXT NOT NULL DEFAULT '',
    "rating" INTEGER NOT NULL DEFAULT 3,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT '启用',
    "remark" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Partner_type_idx" ON "Partner"("type");

-- CreateIndex
CREATE INDEX "Partner_status_idx" ON "Partner"("status");
