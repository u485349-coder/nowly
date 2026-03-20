-- CreateEnum
CREATE TYPE "PushReceiptStatus" AS ENUM ('PENDING', 'OK', 'ERROR');

-- CreateTable
CREATE TABLE "PushReceipt" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceTokenId" TEXT NOT NULL,
    "notificationType" "NotificationType" NOT NULL,
    "status" "PushReceiptStatus" NOT NULL DEFAULT 'PENDING',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "PushReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushReceipt_receiptId_key" ON "PushReceipt"("receiptId");

-- CreateIndex
CREATE INDEX "PushReceipt_status_createdAt_idx" ON "PushReceipt"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PushReceipt_userId_notificationType_createdAt_idx" ON "PushReceipt"("userId", "notificationType", "createdAt");

-- AddForeignKey
ALTER TABLE "PushReceipt" ADD CONSTRAINT "PushReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushReceipt" ADD CONSTRAINT "PushReceipt_deviceTokenId_fkey" FOREIGN KEY ("deviceTokenId") REFERENCES "DeviceToken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
