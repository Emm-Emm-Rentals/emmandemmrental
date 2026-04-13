CREATE TABLE "LodgifyBookingSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "lodgifyPropertyId" TEXT,
    "lodgifyReservationId" TEXT,
    "guestEmail" TEXT,
    "redirectPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),

    CONSTRAINT "LodgifyBookingSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LodgifyBookingSession_token_key" ON "LodgifyBookingSession"("token");
CREATE UNIQUE INDEX "LodgifyBookingSession_lodgifyReservationId_key" ON "LodgifyBookingSession"("lodgifyReservationId");
CREATE INDEX "LodgifyBookingSession_userId_createdAt_idx" ON "LodgifyBookingSession"("userId", "createdAt");
CREATE INDEX "LodgifyBookingSession_listingId_createdAt_idx" ON "LodgifyBookingSession"("listingId", "createdAt");
CREATE INDEX "LodgifyBookingSession_lodgifyPropertyId_createdAt_idx" ON "LodgifyBookingSession"("lodgifyPropertyId", "createdAt");

ALTER TABLE "LodgifyBookingSession"
ADD CONSTRAINT "LodgifyBookingSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LodgifyBookingSession"
ADD CONSTRAINT "LodgifyBookingSession_listingId_fkey"
FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
