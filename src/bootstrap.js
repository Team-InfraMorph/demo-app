const { spawn } = require("node:child_process");
const { resolveDatabaseUrl } = require("./database");

async function main() {
  process.env.DATABASE_URL = await resolveDatabaseUrl();
  const server = spawn(process.execPath, ["src/server.js"], {
    env: process.env,
    stdio: "inherit",
  });
  for (const signal of ["SIGTERM", "SIGINT"]) {
    process.on(signal, () => server.kill(signal));
  }
  server.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
    } else {
      process.exit(code ?? 1);
    }
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
