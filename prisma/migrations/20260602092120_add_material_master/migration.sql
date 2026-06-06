-- CreateTable
CREATE TABLE "MaterialMaster" (
    "id" TEXT NOT NULL,
    "materialCode" TEXT NOT NULL,
    "materialName" TEXT NOT NULL,
    "specification" TEXT NOT NULL DEFAULT '',
    "material" TEXT NOT NULL DEFAULT '',
    "materialGrade" TEXT NOT NULL DEFAULT '',
    "applicableStandard" TEXT NOT NULL DEFAULT '',
    "unit" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialMaster_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaterialMaster_materialCode_key" ON "MaterialMaster"("materialCode");

-- CreateIndex
CREATE INDEX "MaterialMaster_materialName_idx" ON "MaterialMaster"("materialName");
