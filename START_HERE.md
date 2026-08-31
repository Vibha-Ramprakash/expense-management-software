# Start with Keel

Keel can be used in three honest ways:

1. Launch the finished local Phase 1 demo unchanged.
2. Customize the supported business settings without rewriting application code.
3. Use the repository as an agent-readable reference to plan and build a different expense product.

A repository must not execute code merely because it was cloned. Instead, Keel gives coding agents a required first question in `AGENTS.md` and provides the same safe chooser through `npm run setup` after dependencies are installed.

## Copy this prompt into Codex, Claude Code, or another coding agent

> Clone https://github.com/Vibha-Ramprakash/expense-management-software and read AGENTS.md completely. Before changing anything, ask whether I want to (1) launch the current Keel demo locally, (2) customize Keel for my organization, or (3) use Keel as a reference to plan and build a different expense product. Own the technical setup and ask me business questions only. Never ask me to paste an API key into chat. Preserve exact financial handling, immutable audit history, role restrictions, and the local-only production access barrier. Do not describe payment recording as a real transfer or Keel as a complete SAP Concur replacement.

## What the agent should ask for

For supported customization, the agent asks for:

- Organization name and accent color
- Operating currency
- Expense categories and per-expense limits
- Approver names and email addresses
- Weekly, every-two-weeks, or monthly reimbursement timing and lead time

For a different product or a larger extension, the agent first clarifies:

- Intended users, roles, and record ownership
- Draft, submission, approval, correction, reimbursement, and audit workflow
- Categories, policy rules, currencies, and approval routing
- Whether reimbursement is only recorded or actually transferred
- Receipt extraction and assistant expectations, including consent and human review
- Identity, organization membership, authorization, retention, and hosting
- Required card, bank, payroll, accounting, travel, or ERP integrations
- Evidence, test, accessibility, mobile, and deployment expectations

The agent must then separate settings supported by `config/business.json` from real feature work, update specifications before changing behavior, and prove the result with the repository checks.

## Manual quick start

Requires Node.js 22.13 or newer:

```bash
npm ci
npm run setup
npm run reset
npm run dev
```

Open the exact local URL printed in the terminal. The demo uses synthetic records and needs no API key, Docker service, database install, or cloud account. Live AI is optional and must be connected privately with `npm run connect:ai`.

Read `README.md` for the product scope and `docs/ACCESS_SECURITY.md` before considering any hosted use.
