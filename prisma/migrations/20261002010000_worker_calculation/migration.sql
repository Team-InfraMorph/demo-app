CREATE TYPE "CalculationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "Calculation" (
    "id" VARCHAR(64) NOT NULL,
    "input" INTEGER NOT NULL,
    "result" INTEGER,
    "status" "CalculationStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Calculation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Calculation_status_createdAt_idx" ON "Calculation"("status", "createdAt");
