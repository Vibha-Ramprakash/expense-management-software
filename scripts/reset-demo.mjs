import { access, rm } from "node:fs/promises";
import { resolve, sep } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const stateRoot = resolve(projectRoot, ".wrangler", "state");

if (!stateRoot.startsWith(`${projectRoot}${sep}`)) {
  throw new Error("Refusing to reset a path outside this project.");
}

try {
  await access(stateRoot);
  await rm(stateRoot, { recursive: true, force: true });
  console.log("Local demo data cleared. The next start will restore the demo automatically.");
} catch {
  console.log("No local demo data was present. The next start will create it automatically.");
}
