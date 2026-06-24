import { spawn } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const stop = spawn("node", ["scripts/dev-stop.mjs"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

stop.on("exit", () => {
  const dev = spawn("node", ["scripts/dev.mjs"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  dev.on("exit", (code) => process.exit(code ?? 0));
});
