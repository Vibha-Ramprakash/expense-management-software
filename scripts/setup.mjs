import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const modes = {
  demo: {
    title: "Launch the current Keel demo locally",
    next: [
      "Ask your AI coding agent to read AGENTS.md and launch Keel.",
      "The agent will install from the lockfile, reset the synthetic demo ledger, run the checks, start the app, and open the printed local URL.",
      "No AI key is needed. Optional live receipt extraction is connected separately with npm run connect:ai.",
    ],
  },
  customize: {
    title: "Customize Keel for an organization",
    next: [
      "Ask your AI coding agent to read AGENTS.md and docs/CUSTOMIZATION.md, then interview you using business questions only.",
      "Supported settings are organization name, accent color, two-decimal currency, categories and limits, approvers, and reimbursement cadence.",
      "The agent will run npm run configure, reset affected demo data, verify the result, and open the customized app.",
    ],
  },
  build: {
    title: "Plan or build a different expense product from this reference",
    next: [
      "Give your AI coding agent the prompt in START_HERE.md.",
      "It will first clarify users, workflows, policies, currencies, approval routing, reimbursement recording, AI boundaries, identity, integrations, and hosting.",
      "It must distinguish a supported setting from a feature change and preserve exact money, audit history, role restrictions, and the production access barrier.",
    ],
  },
};

function print(mode) {
  const selected = modes[mode];
  console.log(`\n${selected.title}\n`);
  for (const line of selected.next) console.log(`- ${line}`);
  console.log("\nStart here: START_HERE.md\n");
}

const explicit = process.argv.find((argument) => argument.startsWith("--mode="))?.slice(7);
if (explicit) {
  if (!modes[explicit]) {
    console.error("Choose --mode=demo, --mode=customize, or --mode=build.");
    process.exitCode = 1;
  } else print(explicit);
} else if (!input.isTTY || !output.isTTY) {
  console.log("\nKeel setup choices\n\n1. Launch the current demo\n2. Customize Keel\n3. Plan or build a different expense product\n\nRun npm run setup in an interactive terminal, or read START_HERE.md.\n");
} else {
  const rl = createInterface({ input, output });
  try {
    console.log("\nWelcome to Keel\n");
    console.log("1. Launch the current Keel demo locally");
    console.log("2. Customize Keel for an organization");
    console.log("3. Plan or build a different expense product from this reference");
    const answer = (await rl.question("\nWhat would you like to do? [1]: ")).trim() || "1";
    const mode = { 1: "demo", 2: "customize", 3: "build" }[answer];
    if (!mode) {
      console.error("Choose 1, 2, or 3.");
      process.exitCode = 1;
    } else print(mode);
  } finally {
    rl.close();
  }
}
