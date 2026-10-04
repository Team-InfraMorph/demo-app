require("dotenv").config();

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { saveImage, readImage } = require("./images");

const app = express();
const prisma = new PrismaClient();

app.use(express.json({ limit: "16kb" }));

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res)).catch(next);
  };
}

const HOME_PAGE = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>InfraMorph demo v2-a</title>
<style>
  body { font: 15px/1.5 system-ui, sans-serif; max-width: 640px; margin: 32px auto; padding: 0 16px; color: #1f2328; background: #f6f8fa; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #59636e; margin: 0 0 24px; }
  section { background: #fff; border: 1px solid #d1d9e0; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
  h2 { font-size: 16px; margin: 0 0 12px; }
  form { display: flex; gap: 8px; }
  input[type=text] { flex: 1; padding: 8px; border: 1px solid #d1d9e0; border-radius: 6px; font: inherit; }
  button { padding: 8px 14px; border: 0; border-radius: 6px; background: #1f6feb; color: #fff; font: inherit; cursor: pointer; }
  ul { list-style: none; padding: 0; margin: 12px 0 0; }
  li { padding: 8px 0; border-top: 1px solid #eef1f4; }
  .meta { color: #59636e; font-size: 12px; }
  img { max-width: 100%; border-radius: 6px; margin-top: 12px; }
  .err { color: #cf222e; }
</style>
</head>
<body>
<h1>InfraMorph demo v2-a</h1>
<p class="sub">노트와 이미지를 저장하는 데모 앱입니다.</p>
<section>
  <h2>노트</h2>
  <form id="note-form"><input type="text" id="note-text" maxlength="500" placeholder="노트를 입력하세요" required><button>저장</button></form>
  <p id="note-error" class="err"></p>
  <ul id="notes"></ul>
</section>
<section>
  <h2>이미지</h2>
  <form id="image-form"><input type="file" id="image-file" accept="image/png,image/jpeg" required><button>올리기</button></form>
  <p id="image-error" class="err"></p>
  <div id="image"></div>
</section>
<script>
  const list = document.getElementById("notes");
  async function loadNotes() {
    const notes = await fetch("/api/notes").then((r) => r.json());
    list.replaceChildren(...notes.map((n) => {
      const li = document.createElement("li");
      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = "#" + n.id + " · " + new Date(n.createdAt || Date.now()).toLocaleString();
      li.append(n.text, meta);
      return li;
    }));
  }
  document.getElementById("note-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("note-text");
    const res = await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: input.value }) });
    document.getElementById("note-error").textContent = res.ok ? "" : (await res.json()).error;
    if (res.ok) { input.value = ""; loadNotes(); }
  });
  document.getElementById("image-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const file = document.getElementById("image-file").files[0];
    const res = await fetch("/api/images", { method: "POST", headers: { "Content-Type": file.type }, body: file });
    const body = await res.json();
    document.getElementById("image-error").textContent = res.ok ? "" : body.error;
    if (res.ok) { const img = document.createElement("img"); img.src = body.url; document.getElementById("image").replaceChildren(img); }
  });
  loadNotes();
</script>
</body>
</html>
`;

app.get("/", (req, res) => {
  res.type("html").send(HOME_PAGE);
});

app.get("/health", asyncRoute(async (req, res) => {
  await prisma.note.count();
  res.json({ status: "ok" });
}));

app.post("/api/notes", asyncRoute(async (req, res) => {
  const text = req.body && req.body.text;
  if (typeof text !== "string" || !text.trim() || text.length > 500) {
    return res.status(400).json({ error: "text must contain 1-500 characters" });
  }

  const note = await prisma.note.create({
    data: { text: text.trim() },
  });
  res.status(201).json(note);
}));

app.get("/api/notes", asyncRoute(async (req, res) => {
  const notes = await prisma.note.findMany({
    orderBy: { id: "desc" },
  });
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

app.listen(port, "0.0.0.0", () => {
  console.log(`demo-app listening on ${port}`);
});