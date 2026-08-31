# Access security and identity decision

Status: real employee authentication/authorization is not implemented. A temporary local-demo barrier is implemented and must not be mistaken for production access control.

## Current barrier

Every exported data API handler calls `demoAccessDenial` before reading request bodies or accessing D1/R2/AI:

- Non-development builds return `503` with an explanatory, non-cacheable error. Supplying localhost or identity-looking headers does not enable these routes.
- Development permits only the exact loopback hostnames `localhost`, `127.0.0.1` and `[::1]`. Forwarded-host headers do not override this decision.
- A supplied Origin must exactly match the request origin, including port. Writes require that matching Origin; originless POST/PATCH/reset calls are denied.
- Cross-site and same-site-but-not-same-origin Fetch Metadata is rejected. Same-origin and direct navigation are allowed. Programmatic local reads may omit Origin; Codex's local write requests explicitly supply the app origin.
- Receipt extraction and question/history routes retain their additional custom-header and consent controls.
- Approver commands retain the same local AI header/consent control. The model receives the instruction and category allowlist, never the ledger or claim IDs. Confirmation reloads canonical records and can act only on the intersection of the saved preview IDs and claims that still satisfy the rule. Runtime policy changes require the configured simulated Approver identity and are audited; these checks are demo safeguards, not production identity.

This is an accidental-deployment and browser-origin barrier, **not authentication**. Anyone able to make trusted local requests can still choose the demo identities. Do not expose the development server on a network, run it behind a public tunnel, or use real employee records. The production shell can render, but its data routes are intentionally unavailable. `npm run dev` remains the supported no-key local demo; `npm run start` is not a production-ready service.

The URL workspaces and `GET /api/workspace?role=...&view=...` validate role/view allowlists and enforce workflow scoping for the demo, but the role value is still evaluator-selected. Route separation, hidden buttons and server-derived queues are defense-in-depth product behavior, not a substitute for verified identity, membership or record authorization.

## Owner-only demo decision — 2026-08-27

The owner confirmed this is a single-person demo and only their existing ChatGPT account will sign in. Do not re-ask the company-account question for this demo or require separate employee accounts. The employee, approver and finance views are simulated personas for the owner, not independently authenticated employees.

Use dispatch-owned Sign in with ChatGPT for the hosted demo, with an explicit owner-only access policy/verified stable identity. Never copy the owner's password, browser cookies, ChatGPT session or Codex login credentials. The API key powers AI requests; it does not sign a visitor into the app. Never enroll the first arbitrary visitor as owner. The local access barrier remains in place until the actual hosted boundary is implemented and verified.

Use the platform's generated helpers and dispatch-owned sign-in/sign-out paths. Hosted acceptance must reject anonymous visitors and a different ChatGPT account across every data, upload, history and AI route, and check sign-out/expiry and spoofed identity headers. Only the verified owner may use the demo persona selector. This choice is recorded, not yet implemented or live-tested. Publication still requires separate owner approval.

The following multi-employee authorization contract remains the requirement before claiming a production Concur replacement. It is not an extra account-setup prerequisite for the owner-only demonstration. Company SSO would require a supported platform integration and a separate business decision if real employee use is later requested.

## Required authorization contract before replacing the barrier

- Resolve identity server-side from the supported, verified authentication path. Never trust body/query `actorId`, `actorName`, `actorRole`, email text, or arbitrary identity headers supplied directly by a caller.
- Key membership to stable verified identity and explicit organization membership. Display/contact email or name is not an authorization key. The first arbitrary visitor must never automatically become the owner.
- Derive permitted roles from server-owned membership; a UI role selector may choose only among that member's granted roles.
- Employees can create and see their own claims/receipts/history; only their own drafts or returned claims may be corrected. An ID, receipt key or saved-answer link cannot grant access by itself.
- Approvers see the claims assigned by the organization's approval policy and cannot decide their own claims. Approval/return requires both assignment and current revision checks.
- Finance can view authorized organization records for scheduling/payment recording/export. Finance status does not implicitly grant approval or membership administration.
- Configuration/membership administration must be explicitly assigned, audited, revocable and kept separate from payment authority. Removing a member must revoke access, not only hide UI controls.
- Apply these checks consistently to lists, detail/audit, upload/download, mutations, export, assistant queries/history and any future endpoints. Disable production demo reset; backups/restore require a separate audited workflow.
- Retain same-origin write protection, private/no-store response handling, AI consent, durable per-user limits and all existing financial invariants. Authenticate before sending data to an AI provider.

## Verification required

Current automated coverage probes all compiled production API handlers with fake identity headers and deliberately invalid bodies, requiring denial before any D1/R2 access. Local clean-room checks reject originless/foreign writes, foreign reads and reset attempts while preserving the ledger. Normal local workflows must still pass.

Compiled-route tests run the real build output in Node with a test-only `cloudflare:workers` binding trap. They prove the guard executes before binding access; they do not prove a live Sites dispatch configuration or identity provider. The test loader is not part of application imports or deployment wiring.

Before enabling hosted data access, add live provider sign-in/sign-out and expiry tests, organization non-member rejection, two employees' cross-record/receipt/history isolation, role escalation attempts, self-approval, finance-only actions/export, membership revocation and reset denial. Check both direct HTTP and the real browser. A mock identity or green local barrier test does not satisfy this production gate. Do not remove the barrier solely to make a hosted preview appear functional.
