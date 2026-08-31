import { spawn } from "node:child_process";
import { resolve } from "node:path";

const command = process.argv[2];
if (!command) throw new Error("Choose dev, build, or start.");

const projectRoot = resolve(import.meta.dirname, "..");
const cli = resolve(projectRoot, "node_modules", "vinext", "dist", "cli.js");
const child = spawn(process.execPath, [cli, command, ...process.argv.slice(3)], {
  cwd: projectRoot,
  env: {
    ...process.env,
    WRANGLER_LOG_PATH: process.env.WRANGLER_LOG_PATH ?? ".wrangler/wrangler.log",
  },
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => child.kill(signal));
}

child.once("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});

child.once("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
