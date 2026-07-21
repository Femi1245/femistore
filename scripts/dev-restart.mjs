import { spawn } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const stop = spawn(process.execPath, ["scripts/dev-stop.mjs"], {
  cwd: root,
  stdio: "inherit",
  shell: false,
});

stop.on("exit", () => {
  const dev = spawn(process.execPath, ["scripts/dev.mjs"], {
    cwd: root,
    stdio: "inherit",
    shell: false,
    env: process.env,
  });
  dev.on("exit", (code) => process.exit(code ?? 0));
});
