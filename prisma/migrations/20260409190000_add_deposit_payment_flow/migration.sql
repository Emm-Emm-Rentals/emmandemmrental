-- AlterTable: add deposit/balance fields to Reservation
ALTER TABLE "Reservation" ADD COLUMN "paymentType" TEXT NOT NULL DEFAULT 'full';
ALTER TABLE "Reservation" ADD COLUMN "depositAmount" INTEGER;
ALTER TABLE "Reservation" ADD COLUMN "balanceDueAmount" INTEGER;
ALTER TABLE "Reservation" ADD COLUMN "balanceDueDate" TIMESTAMP(3);
ALTER TABLE "Reservation" ADD COLUMN "balancePaid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Reservation" ADD COLUMN "balancePaidAt" TIMESTAMP(3);
ALTER TABLE "Reservation" ADD COLUMN "balanceStripePaymentIntentId" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "stripePaymentMethodId" TEXT;
