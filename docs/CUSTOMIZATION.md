# Supported customization

## Business interview

Ask the user these questions in plain business language, grouping naturally:

1. What organization name should appear, what accent color represents the brand, and what operating currency should the demo use?
2. What expense categories do you use, and what is the per-expense limit for each?
3. Who may approve claims, and should reimbursements run weekly, every two weeks, or monthly? Ask the weekday for weekly/every-two-weeks runs, a first run date for every two weeks, or a day of the month for monthly runs. Ask how many calendar days finance needs before a run.

Clarify only ambiguous business answers. Do not ask about frameworks, databases, hosting, environment variables, JSON, ports, or test tools.

## Apply answers

Run `npm run configure` for the guided interview, or after collecting answers run:

```bash
npm run configure -- --organization "Aster & Co." --accent "#8CE6D0" --currency USD --categories "Travel=1500;Meals=90;Equipment=1000" --approvers "Rina Shah <rina@example.com>;Tom Vale <tom@example.com>" --frequency weekly --weekday Thursday --lead-days 2
```

The script validates and writes `config/business.json`. The primary user never edits it manually. After category or currency changes, run `npm run reset` so regenerated demo data aligns with the new policy, then `npm run check`, launch, and inspect the rendered result.

Every role workspace reads the same supported configuration through the server-derived workspace selector. Organization name and accent update the shell; category names/limits update entry feedback and approver exceptions; the primary approver updates identity, assignment and metrics; reimbursement configuration updates finance scheduling/calendar labels. None of these require application-code edits.

During a local demo, the configured Approver may temporarily override one category limit through Expense policy or a confirmed Command desk preview. These D1 overrides are audited and reset with demo data; they do not rewrite `config/business.json`. Use `npm run configure` for durable repository-level customization.

## Supported settings

- Product and organization display names (product name remains Keel unless explicitly requested)
- Six-digit hexadecimal accent color
- Recognized two-decimal operating currency (for example EUR, USD, CHF, GBP or INR). Zero-/three-decimal currencies are rejected, not silently treated as cents.
- Category names and positive per-expense limits
- Approver names and email addresses
- Actual weekly, fortnightly or monthly reimbursement cadence with 0–30 calendar days of lead time

## Reimbursement choices

- Weekly: `--frequency weekly --weekday Friday --lead-days 2` selects the first eligible Friday.
- Every two weeks: `--frequency fortnightly --weekday Thursday --anchor-date 2026-08-27 --lead-days 3` selects dates 14 days apart, starting at the specified first run. The first date must match the weekday. No run is scheduled before that first date.
- Monthly: `--frequency monthly --day-of-month 31 --lead-days 2` selects the first eligible monthly run. A short month uses its last calendar day, then subsequent months return to the chosen day. Weekday/anchor options do not apply.

Eligibility is the UTC scheduling date plus the lead time, inclusive. Zero lead time permits today's run. These are calendar dates, not business-day, bank-cutoff or holiday guarantees; weekend/holiday adjustment is not implemented. A saved schedule is not proof of a transfer. Changing configuration affects future scheduling only; existing scheduled/paid dates stay unchanged. Supporting daily, twice-monthly or bank-calendar rules is a feature change, not an arbitrary frequency label.

The configurator validates the entire configuration before writing. Invalid options, duplicate categories/approvers, excessive amount precision, unsafe amounts, invalid weekdays/dates and unsupported currencies leave the original configuration unchanged. Limits use the same exact decimal parser as claims, with no rounding.

## Feature changes, not settings

Identity and permissions, OCR, accounting/card/bank integrations, new workflow states, tax logic, multiple currencies, editing submitted records, approval chains, delegation, payment reversal, notifications, and production deployment policy require application changes. Read the product/data/build specifications, explain the proposed business behavior, preserve invariants, and update documentation and tests with the implementation.
