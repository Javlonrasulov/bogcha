ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_tenantId_idempotencyKey_key" ON "Payment"("tenantId", "idempotencyKey");

ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "receiveIdempotencyKey" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseOrder_tenantId_receiveIdempotencyKey_key" ON "PurchaseOrder"("tenantId", "receiveIdempotencyKey");
