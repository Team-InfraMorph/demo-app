require("dotenv").config();

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { saveImage, readImage } = require("./images");

const app = express();
const prisma = new PrismaClient();
const calculationIdPattern = /^[A-Za-z0-9_-]{1,64}$/;

app.use(express.json({ limit: "16kb" }));

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res)).catch(next);
  };
}

function calculationResponse(calculation) {
  return {
    id: calculation.id,
    number: calculation.input,
    calculatedValue: calculation.result,
    status: calculation.status,
    error: calculation.error,
    updatedAt: calculation.updatedAt,
  };
}

app.get("/", (req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>InfraMorph Worker Demo</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #eef2ff; color: #172554; }
    main { width: min(560px, calc(100% - 32px)); padding: 32px; border-radius: 20px; background: white; box-shadow: 0 18px 50px rgba(30, 64, 175, .16); }
    h1 { margin: 0 0 8px; font-size: 28px; }
    p { color: #475569; }
    label { display: block; margin: 18px 0 6px; font-weight: 700; }
    input { box-sizing: border-box; width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 10px; font: inherit; }
    .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px; }
    button { padding: 12px; border: 0; border-radius: 10px; font: inherit; font-weight: 700; cursor: pointer; }
    #save { background: #2563eb; color: white; }
    #calculate { background: #dbeafe; color: #1d4ed8; }
    pre { min-height: 72px; margin: 20px 0 0; padding: 14px; overflow: auto; border-radius: 10px; background: #0f172a; color: #e2e8f0; }
  </style>
</head>
<body>
  <main>
    <h1>Worker ×2 계산 데모</h1>
    <p>작업을 저장하면 private worker가 계산해서 PostgreSQL에 기록합니다.</p>
    <label for="calculation-id">ID</label>
    <input id="calculation-id" maxlength="64" placeholder="예: order-1001">
    <label for="number">숫자</label>
    <input id="number" type="number" step="1" placeholder="예: 21">
    <div class="actions">
      <button id="save" type="button">×2 작업 저장</button>
      <button id="calculate" type="button">계산 결과 조회</button>
    </div>
    <pre id="result">ID와 숫자를 입력하세요.</pre>
  </main>
  <script>
    const idInput = document.getElementById("calculation-id");
    const numberInput = document.getElementById("number");
    const result = document.getElementById("result");

    function show(value) {
      result.textContent = JSON.stringify(value, null, 2);
    }

    document.getElementById("save").addEventListener("click", async () => {
      const response = await fetch("/api/calculations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: idInput.value, number: Number(numberInput.value) }),
      });
      show(await response.json());
    });

    document.getElementById("calculate").addEventListener("click", async () => {
      const response = await fetch("/api/calculations/" + encodeURIComponent(idInput.value.trim()));
      show(await response.json());
    });
  </script>
</body>
</html>`);
});

app.get("/health", asyncRoute(async (req, res) => {
  await prisma.note.count();
  res.json({ status: "ok" });
}));

app.post("/api/calculations", asyncRoute(async (req, res) => {
  const id = typeof req.body?.id === "string" ? req.body.id.trim() : "";
  const number = req.body?.number;
  if (!calculationIdPattern.test(id)) {
    return res.status(400).json({ error: "id must contain 1-64 letters, digits, underscores, or hyphens" });
  }
  if (!Number.isInteger(number) || number < -1073741824 || number > 1073741823) {
    return res.status(400).json({ error: "number must be an integer whose doubled value fits PostgreSQL INTEGER" });
  }

  const calculation = await prisma.calculation.upsert({
    where: { id },
    create: { id, input: number, status: "PENDING" },
    update: { input: number, result: null, status: "PENDING", error: null },
  });
  res.status(202).json(calculationResponse(calculation));
}));

app.get("/api/calculations/:id", asyncRoute(async (req, res) => {
  const calculation = await prisma.calculation.findUnique({ where: { id: req.params.id } });
  if (!calculation) {
    return res.status(404).json({ error: "calculation not found" });
  }
  res.json(calculationResponse(calculation));
}));

app.post("/api/notes", asyncRoute(async (req, res) => {
  const text = req.body && req.body.text;
  if (typeof text !== "string" || !text.trim() || text.length > 500) {
    return res.status(400).json({ error: "text must contain 1-500 characters" });
  }

  const note = await prisma.note.create({ data: { text: text.trim() } });
  res.status(201).json(note);
}));

app.get("/api/notes", asyncRoute(async (req, res) => {
  const notes = await prisma.note.findMany({ orderBy: { id: "desc" } });
  res.json(notes);
}));

app.post(
  "/api/images",
  express.raw({ type: ["image/png", "image/jpeg"], limit: "5mb" }),
  asyncRoute(async (req, res) => {
    const mime = (req.headers["content-type"] || "").split(";")[0];
    if (mime !== "image/png" && mime !== "image/jpeg") {
      return res.status(415).json({ error: "PNG or JPEG required" });
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: "image body required" });
    }

    const extension = mime === "image/png" ? "png" : "jpg";
    const key = await saveImage(req.body, extension);
    res.status(201).json({ key, url: `/api/images/${key}` });
  }),
);

app.get("/api/images/:key", asyncRoute(async (req, res) => {
  const image = await readImage(req.params.key);
  if (image === null) {
    return res.status(404).json({ error: "image not found" });
  }

  res.type(req.params.key.endsWith(".png") ? "png" : "jpeg");
  res.send(image);
}));

app.use((error, req, res, next) => {
  console.error(error);
  const tooLarge = error.type === "entity.too.large";
  res.status(tooLarge ? 413 : 500).json({
    error: tooLarge ? "image too large" : "internal error",
  });
});

const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be between 1 and 65535");
}

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`demo-app web listening on ${port}`);
});

async function shutdown(signal) {
  console.log(`received ${signal}; shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
