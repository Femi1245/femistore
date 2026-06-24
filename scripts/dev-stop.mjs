import { execSync } from "child_process";

const port = Number(process.env.PORT) || 3000;

function killPortWindows(p) {
  try {
    const out = execSync(`netstat -ano | findstr :${p}`, { encoding: "utf8" });
    const pids = new Set();
    for (const line of out.split("\n")) {
      if (!line.includes("LISTENING")) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid)) pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
        console.log(`Stopped process ${pid} on port ${p}`);
      } catch {
        // Process may have already exited
      }
    }
  } catch {
    // Nothing listening
  }
}

function killPortUnix(p) {
  try {
    const out = execSync(`lsof -ti :${p}`, { encoding: "utf8" }).trim();
    if (!out) return;
    for (const pid of out.split("\n")) {
      try {
        process.kill(Number(pid), "SIGTERM");
        console.log(`Stopped process ${pid} on port ${p}`);
      } catch {
        // ignore
      }
    }
  } catch {
    // Nothing listening
  }
}

if (process.platform === "win32") {
  killPortWindows(port);
} else {
  killPortUnix(port);
}

console.log("Done.");
