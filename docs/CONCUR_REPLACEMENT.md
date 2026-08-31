# Concur replacement scope

Decision recorded 2026-08-27. This supersedes the earlier manual-only demo scope. Kisset/KISSKET is a different project and must remain untouched.

## Product boundary

The target is a self-contained employee expense and reimbursement application. CSV is an optional copy/integration aid, never a required stage or the system of record. Automatic receipt extraction and a grounded in-app assistant are mandatory release requirements. The current app is a local demonstrator, not yet a production SAP Concur replacement.

SAP Concur is a family of products. Replacing the employee expense workflow does not imply reproducing travel booking, supplier accounts payable, bank networks, managed audit services, or SAP's integration ecosystem. The table is a proposed first-release boundary, not a claim of full suite parity; confirm the organization's actual Concur modules before migration.

## Feature-by-feature boundary and delivery status

| Capability | Target disposition | Current Keel status / reason |
| --- | --- | --- |
| Receipt storage and retrieval | Replace | Local D1/R2 flow implemented for PDF/JPG/PNG/WebP. Production access control still required. |
| Automatic merchant/date/total/currency extraction and category suggestion | Replace; mandatory | Connected; consent plus a selected receipt triggers one request and fills editable fields. Live clear PNG/PDF extraction, browser autofill, mobile camera selection and foreign-currency safeguards pass. Wider difficult-receipt accuracy remains future work. |
| Expense submission, status and business purpose | Replace | URL-driven Employee workspace, saved drafts, later receipt attachment, duplicate acknowledgement, live policy feedback and correction/resubmission implemented. Multi-receipt reports and split/itemized claims remain future work. |
| Policy checks, category limits, independent approval | Replace | Assigned Approval queue, policy/age context, optional approval notes, required request-changes notes, decision history, guarded preview-first rule approvals and audited demo policy overrides are implemented. Production roles, unattended automation and delegated/multi-level/threshold routing remain future work. |
| Finance queue and reimbursement schedule | Replace | Role-scoped reimbursements, spend/calendar insights, weekly/fortnightly/monthly schedules, internal references, payment history and explicit record-only payment handling implemented. Bank holidays/cutoffs and actual money transfers are not included. |
| Direct reimbursement to employees | Integration-dependent | Requires the paying entity/country, supported payment provider, onboarding, settlement confirmation and failure/reconciliation handling. Never equate clicking paid with a successful transfer. |
| Missing receipt, approval and reimbursement assistant | Replace manual chasing; mandatory | Rules-based tasks plus a natural-language filter interpreter and saved factual answers implemented. Four live questions, exact canonical facts, action refusal and saved-history restart passed. Wider language/browser checks, authenticated identities and external reminder delivery remain pending. |
| In-app reporting and audit history | Replace basic operational use | Role-specific metrics, category bars, reimbursement timeline/calendar, recent activity, decision/payment history and per-claim events are derived from canonical records. Filtered period reporting, immutable production retention and real access controls remain future work. |
| CSV | Additional only | Available; the workflow must finish without exporting. |
| Receipt itemization, split allocations, tax fields, mileage, per diem, multi-currency FX | Not yet replaced | Require explicit accounting/policy rules, data model, rate sources and separate acceptance tests. Do not silently approximate. Prioritize based on actual business usage. |
| Corporate-card/bank feeds and automatic receipt matching | Not initially replaced | Needs bank/card-provider contracts and a reconciliation integration; without feeds the assistant cannot know about unrecorded card transactions. |
| ERP/accounting/payroll synchronization | Not initially replaced | Needs the destination system, authorized connection, mapping and idempotent reconciliation. Optional CSV is not equivalent to this. |
| Travel booking, itinerary management and duty of care | Outside proposed first release | Separate travel product, supplier inventory and servicing responsibilities. |
| Supplier invoice/AP, purchase orders and three-way matching | Outside proposed first release | Different vendor-payables workflow, not employee reimbursement. |
| Global tax reclaim, managed human audit and fraud guarantees | Not replaced | Requires jurisdiction-specific validation, specialized services and operational controls. A model flag is not an audit guarantee. |
| Native mobile/offline capture | Not yet replaced | Responsive web capture supports the phone camera and mobile workflow. Offline queueing, sync conflicts and native applications remain separate work. |
| SSO, real identity, segregation of duties, backups, retention, privacy and monitoring | Required production gate | Owner-only ChatGPT sign-in was selected for the demo but is not implemented. The role switch simulates employees. All data APIs remain disabled outside local development; controls in `ACCESS_SECURITY.md` must pass before hosted access or real employee use. |
| Import existing Concur records/receipts and reconcile balances | Required migration gate | No importer yet. Need an authorized export, mapped identities/policies and opening-balance reconciliation before cutover. |

## Revised release gates

1. Live extraction succeeds against a diverse approved test set, including unreadable/non-receipts, rotated photos, PDFs, ambiguous dates/currencies and provider failures. Record field-level accuracy and correction rate; agree a threshold before release.
2. The assistant answers from authorized canonical records, identifies real missing information and links to the next action. No invented pending purchases, approvals or completed payments.
3. Complete receipt → confirmation → approval → reimbursement tracking without CSV. If direct payouts are selected, include provider-confirmed settlement and failure handling.
4. Real-user identity, record isolation, audit retention, backups and restore are verified before real business use.
5. The original no-key demo, automated checks and clean-room customization still work. Live-AI tests are a separate opt-in gate, never secretly dependent on developer keys.
6. Public GitHub publication, live macOS/Windows/Linux Actions, and Sites deployment still require the user's publication approval.

## Business decisions still needed

- Demo identity is decided: only the owner's ChatGPT account will sign in. Do not re-ask this for the demo. Revisit company identity requirements only if real employee deployment is requested.
- Which country is the paying organization based in, and should the app initiate real transfers or track payments made by finance?
- Which Concur modules and advanced expense types does the intended organization actually use?
- What real-data retention and AI processing policy is acceptable? Use synthetic receipts until agreed.

## Comparison sources

Reviewed official product pages on 2026-08-27: [Concur Expense](https://www.concur.com/products/concur-expense), [ExpenseIt](https://www.concur.com/products/expenseit), [product catalogue](https://www.concur.com/products), [Intelligent Audit](https://www.concur.com/products/intelligent-audit). Scope decisions and Keel implementation status above are our assessment, not SAP's endorsement or an assertion of equivalence.
