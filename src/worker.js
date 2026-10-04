require("dotenv").config();

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
let stopping = false;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function processNextCalculation() {
  const candidate = await prisma.calculation.findFirst({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });
  if (!candidate) {
    return false;
  }

  const claim = await prisma.calculation.updateMany({
    where: { id: candidate.id, status: "PENDING" },
    data: { status: "PROCESSING", error: null },
  });
  if (claim.count !== 1) {
    return true;
  }

  try {
    const result = candidate.input * 2;
    const completed = await prisma.calculation.updateMany({
      where: { id: candidate.id, status: "PROCESSING" },
      data: { result, status: "COMPLETED", error: null },
    });
    if (completed.count === 1) {
      console.log(JSON.stringify({ event: "calculation.completed", id: candidate.id, result }));
    }
  } catch (error) {
    await prisma.calculation.updateMany({
      where: { id: candidate.id, status: "PROCESSING" },
      data: { status: "FAILED", error: String(error.message || error).slice(0, 500) },
    });
    throw error;
  }
  return true;
}

async function main() {
  console.log("demo-app worker started");
  while (!stopping) {
    const processed = await processNextCalculation();
    if (!processed) {
      await delay(1000);
    }
  }
}

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    console.log(`received ${signal}; stopping worker`);
    stopping = true;
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
