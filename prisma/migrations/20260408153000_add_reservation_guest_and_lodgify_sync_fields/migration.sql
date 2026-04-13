ALTER TABLE "Reservation"
ADD COLUMN "bookingSource" TEXT NOT NULL DEFAULT 'direct',
ADD COLUMN "primaryGuestName" TEXT,
ADD COLUMN "primaryGuestEmail" TEXT,
ADD COLUMN "primaryGuestPhone" TEXT,
ADD COLUMN "primaryGuestLocale" TEXT,
ADD COLUMN "primaryGuestStreetAddress1" TEXT,
ADD COLUMN "primaryGuestStreetAddress2" TEXT,
ADD COLUMN "primaryGuestCity" TEXT,
ADD COLUMN "primaryGuestState" TEXT,
ADD COLUMN "primaryGuestPostalCode" TEXT,
ADD COLUMN "primaryGuestCountryCode" TEXT,
ADD COLUMN "lodgifyPropertyId" TEXT,
ADD COLUMN "lodgifyRoomTypeId" TEXT,
ADD COLUMN "lodgifyReservationId" TEXT,
ADD COLUMN "lodgifySyncStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN "lodgifySyncError" TEXT,
ADD COLUMN "lodgifySyncedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Reservation_lodgifyReservationId_key" ON "Reservation"("lodgifyReservationId");
