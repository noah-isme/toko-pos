-- Add minStock column to Product table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Product' AND column_name = 'minStock'
    ) THEN
        ALTER TABLE "Product" ADD COLUMN "minStock" INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Create LowStockAlert table
CREATE TABLE IF NOT EXISTS "LowStockAlert" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clearedAt" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "LowStockAlert_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "LowStockAlert_outletId_clearedAt_idx" ON "LowStockAlert"("outletId", "clearedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "LowStockAlert_productId_outletId_triggeredAt_key" ON "LowStockAlert"("productId", "outletId", "triggeredAt");

-- Add foreign keys (with error handling if they already exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'LowStockAlert_productId_fkey'
    ) THEN
        ALTER TABLE "LowStockAlert" ADD CONSTRAINT "LowStockAlert_productId_fkey"
        FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'LowStockAlert_outletId_fkey'
    ) THEN
        ALTER TABLE "LowStockAlert" ADD CONSTRAINT "LowStockAlert_outletId_fkey"
        FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
