# Receipt AI and private owner setup

Status: integration and local UI implemented; live synthetic PNG/PDF smoke tests passed on 2026-08-28 and the real browser autofill flow passed on 2026-08-31. Wider difficult-receipt accuracy remains future work. Manual entry is retained for the reproducible no-key demo and recovery.

Latest live attempt (2026-08-28): after the owner enabled billing, `gpt-5.4-mini` correctly extracted the synthetic EUR 22.50 PNG and EUR 54.20 PDF. A USD 25.60 PDF was correctly flagged as a currency mismatch with its amount blanked in the EUR workspace. All expected merchant/date/category/currency fields matched and review remained required. The earlier 2026-08-27 quota failure is resolved for this test; it was not a bad-key problem. See `LIVE_AI_ACCEPTANCE.md` for reusable fixtures and the bounded rehearsal, and `ACCEPTANCE_EVIDENCE.md` for exact scope.

## Nontechnical owner setup

1. Open the [OpenAI API dashboard](https://platform.openai.com/). Sign in and choose/create a dedicated project for Keel.
2. In that API account's billing settings, enable API usage and choose a modest initial budget. Review the current billing/limit behavior in the dashboard; do not promise a soft alert is a hard spending cap.
3. Open the project's [API keys](https://platform.openai.com/api-keys) and create a new secret key for Keel with the model/Responses permissions it needs.
4. Never paste the key into chat, a screenshot, source code or a command. Tell Codex “key ready.” Codex runs `npm run connect:ai` in a visible interactive terminal. Paste only once into that hidden-input prompt and press Enter. Nothing appears while pasting, not even dots; this is expected. Look for the saved confirmation rather than pasting repeatedly.
5. Codex restarts the local app, verifies it does not expose the key, and tests extraction using a synthetic/approved receipt. The owner checks the suggested facts before submitting.

The setup writes only the ignored `.dev.vars` file and preserves unrelated existing entries. It does not make an API request or purchase credits. On POSIX it uses owner-only file permissions; use the operating system's account/file protections on Windows. The application and repository must never print or return the key. Verify ignore rules before first setup and never stage local secret files.

The natural-language question desk uses the same connection, with its own explicit question-sharing consent. See `AI_ASSISTANT.md` for saved history, read-only authority, usage metadata and local question limits. Connecting the key alone is not proof that either AI feature passed live acceptance.

If the provider reports exhausted credit or a quota/spend limit, ask the owner to review [API billing](https://platform.openai.com/settings/organization/billing) for the account/project that issued the key. Do not purchase credit, increase limits or retry repeatedly on the owner's behalf. Resume a bounded synthetic test after the owner confirms the billing change. Record only safe status/error codes, never raw provider error bodies or credentials. See [OpenAI's error guidance](https://developers.openai.com/api/docs/guides/error-codes#api-errors).

## Implementation

- `lib/receipt-extraction.mjs`: Worker-compatible fetch adapter using OpenAI Responses, model `gpt-5.4-mini`, strict structured output, no model tools, 45-second timeout and bounded output.
- `POST /api/receipts/extract`: accepts a PDF/JPEG/PNG/WebP up to 8 MB plus explicit per-receipt consent. MIME signatures and size are checked. Only same-origin local development may call live AI; hosted mode is disabled until authentication and durable per-user quotas exist.
- `components/ReceiptForm.tsx`: shows data-transfer disclosure and starts exactly one read when both a selected receipt and explicit consent are present. Changing the file cancels stale work and resets consent. It fills editable merchant/date/amount/currency/category, exposes uncertainty and requires review. Currency mismatch blocks submission; no implicit FX conversion. Business purpose is entered by the employee, not invented from a receipt. Desktop shows receipt and fields side by side; mobile supports camera capture and a collapsible preview.
- Extraction is a transient preview, not a submitted expense. Successful submission persists the original receipt and the user-confirmed fields through the existing route. Extraction cannot approve, schedule, pay, edit policy or write to the ledger.
- PDF bytes are sent inline as `input_file`; images as `input_image`. No persistent Files API upload is created. `store:false` is set for Responses. This does NOT claim zero provider retention; review the provider's data controls before processing real employee data.
- No original filenames, secrets, receipts or provider error bodies are logged. The client gets safe failure messages. Refusals, non-receipts, invalid dates, ambiguous totals, unknown currencies, invalid categories and incomplete responses never become fabricated “successful” extraction.
- The local in-flight gate limits concurrent attempts only; it is not a durable rate or spend limit. No automatic retry incurs surprise usage. Production needs authenticated per-user quotas, retention/deletion controls and audited extraction provenance.

## Verification split

`npm run check` includes deterministic adapter tests using explicitly mocked provider responses. They prove formatting, validation and failure handling, not actual OCR accuracy. The no-key clone must still start and make no external AI requests during CI.

Full live acceptance remains mandatory: expand the three-fixture smoke test using an owner-authorized API key, record model/date and test-set outcomes without secrets or personal receipts, verify varied real image/PDF cases and error/timeout behavior, then exercise human confirmation and the full workflow in the browser. The confirmed synthetic PDF completed approval/reimbursement tracking through HTTP with CSV unused, but this does not prove browser interaction or accuracy on difficult receipts. Record foreign-currency receipts as unsupported, not silently converted.

Official guidance: [Images and vision](https://developers.openai.com/api/docs/guides/images-vision), [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [API key quickstart](https://developers.openai.com/api/docs/quickstart#create-and-export-an-api-key).
