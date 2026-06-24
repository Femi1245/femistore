import { spawn } from "child_process";
import { createConnection } from "net";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT) || 3000;

function isPortInUse(p) {
  return new Promise((resolve) => {
    const socket = createConnection({ port: p, host: "127.0.0.1" });
    socket.setTimeout(400);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => resolve(false));
  });
}

const inUse = await isPortInUse(port);
if (inUse) {
  console.log("");
  console.log(`Dev server is already running at http://localhost:${port}`);
  console.log("To restart: npm run dev:restart");
  console.log("");
  process.exit(0);
}

const child = spawn("npx", ["next", "dev"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
