import { lstat, readFile, rename, writeFile, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const target = fileURLToPath(new URL("../.dev.vars", import.meta.url));
const temporary = `${target}.tmp-${randomUUID()}`;

function readSecret() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("Open the private setup in an interactive terminal. Keys cannot be supplied as command arguments or piped input.");
  process.stdout.write("Paste your OpenAI key here (it stays hidden), then press Enter. Ctrl+C cancels.\nKey: ");
  return new Promise((resolve, reject) => {
    let secret = "";
    const previousRaw = process.stdin.isRaw;
    const finish = (error) => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(previousRaw);
      process.stdin.pause();
      process.stdout.write("\n");
      if (error) reject(error); else resolve(secret.trim());
    };
    const onData = (chunk) => {
      for (const char of chunk.toString()) {
        if (char === "\u0003") return finish(new Error("Setup cancelled. Nothing was changed."));
        if (char === "\r" || char === "\n") return finish();
        if (char === "\u007f" || char === "\b") secret = secret.slice(0, -1);
        else if (/^[\x20-\x7e]$/.test(char)) secret += char;
      }
    };
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", onData);
  });
}

try {
  let previous = "";
  try {
    const info = await lstat(target);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error("The local secret file is not a regular file; ask Codex to check it.");
    previous = await readFile(target, "utf8");
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  const key = await readSecret();
  if (!/^sk-[A-Za-z0-9_-]{20,}$/.test(key)) throw new Error("That does not look like an OpenAI secret key. Nothing was changed.");
  const kept = previous.split(/\r?\n/).filter((line) => !/^\s*(?:export\s+)?OPENAI_API_KEY\s*=/.test(line)).join("\n").trimEnd();
  await writeFile(temporary, `${kept}${kept ? "\n" : ""}OPENAI_API_KEY=${key}\n`, { mode: 0o600, flag: "wx" });
  await rename(temporary, target);
  process.stdout.write("AI key saved privately on this computer. No API request was made. Ask Codex to restart Keel and verify extraction with a sample receipt.\n");
} catch (error) {
  await unlink(temporary).catch(() => {});
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
