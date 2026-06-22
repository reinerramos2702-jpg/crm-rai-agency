-- Migration: módulo hotelero (Guest, Site, Room, RoomType, Booking, Payment, PaymentEvent, AuditEvent)

-- ============================================
-- Guest
-- ============================================
CREATE TABLE "Guest" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "contactId" TEXT,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "documentType" TEXT,
  "documentNumber" TEXT,
  "nationality" TEXT,
  "dateOfBirth" TIMESTAMP(3),
  "emergencyContactName" TEXT,
  "emergencyContactPhone" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "preferredLanguage" TEXT,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "notes" TEXT,
  "totalStays" INTEGER NOT NULL DEFAULT 0,
  "totalSpentCents" INTEGER NOT NULL DEFAULT 0,
  "lastStayAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Guest_workspaceId_idx" ON "Guest"("workspaceId");
CREATE INDEX "Guest_contactId_idx" ON "Guest"("contactId");
CREATE INDEX "Guest_status_idx" ON "Guest"("status");
CREATE INDEX "Guest_email_idx" ON "Guest"("email");
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- Site
-- ============================================
CREATE TABLE "Site" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'hotel',
  "address" TEXT,
  "city" TEXT,
  "country" TEXT,
  "postalCode" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "contactName" TEXT,
  "contactPhone" TEXT,
  "contactEmail" TEXT,
  "capacity" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'active',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Site_slug_key" ON "Site"("slug");
CREATE INDEX "Site_workspaceId_idx" ON "Site"("workspaceId");
CREATE INDEX "Site_status_idx" ON "Site"("status");
ALTER TABLE "Site" ADD CONSTRAINT "Site_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- RoomType
-- ============================================
CREATE TABLE "RoomType" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "basePriceCents" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "maxOccupancy" INTEGER NOT NULL DEFAULT 2,
  "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RoomType_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RoomType_workspaceId_idx" ON "RoomType"("workspaceId");
ALTER TABLE "RoomType" ADD CONSTRAINT "RoomType_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- Room
-- ============================================
CREATE TABLE "Room" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "roomTypeId" TEXT,
  "number" TEXT NOT NULL,
  "floor" TEXT,
  "status" TEXT NOT NULL DEFAULT 'available',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Room_siteId_number_key" ON "Room"("siteId", "number");
CREATE INDEX "Room_workspaceId_idx" ON "Room"("workspaceId");
CREATE INDEX "Room_siteId_idx" ON "Room"("siteId");
CREATE INDEX "Room_status_idx" ON "Room"("status");
ALTER TABLE "Room" ADD CONSTRAINT "Room_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Room" ADD CONSTRAINT "Room_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Room" ADD CONSTRAINT "Room_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- Booking
-- ============================================
CREATE TABLE "Booking" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "guestId" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "roomId" TEXT,
  "reference" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "checkInDate" TIMESTAMP(3) NOT NULL,
  "checkOutDate" TIMESTAMP(3) NOT NULL,
  "adults" INTEGER NOT NULL DEFAULT 1,
  "children" INTEGER NOT NULL DEFAULT 0,
  "source" TEXT NOT NULL DEFAULT 'direct',
  "totalAmountCents" INTEGER NOT NULL DEFAULT 0,
  "paidAmountCents" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "specialRequests" TEXT,
  "internalNotes" TEXT,
  "cancelledReason" TEXT,
  "actualCheckIn" TIMESTAMP(3),
  "actualCheckOut" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Booking_reference_key" ON "Booking"("reference");
CREATE INDEX "Booking_workspaceId_idx" ON "Booking"("workspaceId");
CREATE INDEX "Booking_guestId_idx" ON "Booking"("guestId");
CREATE INDEX "Booking_siteId_idx" ON "Booking"("siteId");
CREATE INDEX "Booking_roomId_idx" ON "Booking"("roomId");
CREATE INDEX "Booking_status_idx" ON "Booking"("status");
CREATE INDEX "Booking_checkInDate_idx" ON "Booking"("checkInDate");
CREATE INDEX "Booking_checkOutDate_idx" ON "Booking"("checkOutDate");
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- Payment
-- ============================================
CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "guestId" TEXT,
  "bookingId" TEXT,
  "siteId" TEXT,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "method" TEXT NOT NULL DEFAULT 'cash',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "paidAt" TIMESTAMP(3),
  "proofUrl" TEXT,
  "transactionRef" TEXT,
  "notes" TEXT,
  "internalComments" TEXT,
  "createdById" TEXT NOT NULL,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "refundedAmountCents" INTEGER NOT NULL DEFAULT 0,
  "refundedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");
CREATE INDEX "Payment_workspaceId_idx" ON "Payment"("workspaceId");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_guestId_idx" ON "Payment"("guestId");
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");
CREATE INDEX "Payment_siteId_idx" ON "Payment"("siteId");
CREATE INDEX "Payment_paidAt_idx" ON "Payment"("paidAt");
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- PaymentEvent (audit log de pagos)
-- ============================================
CREATE TABLE "PaymentEvent" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT,
  "meta" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PaymentEvent_paymentId_createdAt_idx" ON "PaymentEvent"("paymentId", "createdAt");
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- AuditEvent (audit log global)
-- ============================================
CREATE TABLE "AuditEvent" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "meta" JSONB NOT NULL DEFAULT '{}',
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditEvent_workspaceId_createdAt_idx" ON "AuditEvent"("workspaceId", "createdAt");
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");
CREATE INDEX "AuditEvent_userId_idx" ON "AuditEvent"("userId");
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
