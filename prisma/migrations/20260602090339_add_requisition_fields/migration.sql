-- AlterTable
ALTER TABLE "PurchaseRequisition" ADD COLUMN     "demandType" TEXT NOT NULL DEFAULT '正常采购',
ADD COLUMN     "expectedArrivalDate" TIMESTAMP(3),
ADD COLUMN     "procurementCategory" TEXT NOT NULL DEFAULT '设备';

-- AlterTable
ALTER TABLE "RequisitionItem" ADD COLUMN     "applicableStandard" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "material" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "materialCode" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "materialGrade" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "requiredDate" TIMESTAMP(3);
