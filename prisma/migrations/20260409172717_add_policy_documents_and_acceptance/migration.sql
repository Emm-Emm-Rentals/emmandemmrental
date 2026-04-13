-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "agreementAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "agreementPolicyId" TEXT,
ADD COLUMN     "agreementPolicyTitle" TEXT,
ADD COLUMN     "agreementPolicyVersion" INTEGER,
ADD COLUMN     "paymentPolicyAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "paymentPolicyId" TEXT,
ADD COLUMN     "paymentPolicyTitle" TEXT,
ADD COLUMN     "paymentPolicyVersion" INTEGER;

-- CreateTable
CREATE TABLE "PolicyDocument" (
    "id" TEXT NOT NULL,
    "policyKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PolicyDocument_policyKey_isActive_idx" ON "PolicyDocument"("policyKey", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyDocument_policyKey_version_key" ON "PolicyDocument"("policyKey", "version");
