-- Filiallararo transfer uchun ombor harakati turlari.
ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'TRANSFER_IN';
ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'TRANSFER_OUT';
ALTER TYPE "StockMovementSource" ADD VALUE IF NOT EXISTS 'TRANSFER';