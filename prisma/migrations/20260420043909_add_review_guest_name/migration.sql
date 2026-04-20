-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "guestName" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;
