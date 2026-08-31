# Design contract

## Direction

Keel should feel like a calm financial operations desk: precise, tactile, and fast. It is not a generic analytics dashboard and should not drift into finance-blue gradients, glossy cards, or decorative illustration.

The distinctive product moment is the combination of a large receipt call-to-action, a compact live workflow queue, and a receipt-like detail surface. The interface uses warm paper, near-black green, and one configurable high-visibility accent.

## Tokens

- Canvas: `#F4F2EC`
- Elevated paper: `#FBFAF7`
- Ink: `#171A15`
- Secondary ink: `#5E6259`
- Divider: `#D9D9D0`
- Default accent: `#D9FF56`, read from `config/business.json`
- Danger: `#B83E43`
- Success: `#237B4B`
- Information: `#315D96`
- Type: Geist for UI and totals; Geist Mono only for compact operational data
- Radius: 8px controls, 14px groups, 22px dialogs

## Layout and hierarchy

- Desktop: 248px dark navigation, sticky role/action bar, flexible workspace, optional right detail drawer.
- The first viewport must expose receipt entry, key workflow totals, and the start of the live queue.
- The queue is the primary operational surface; do not bury it behind charts.
- Operate-mode headings name the current route literally (for example, “Employee overview,” “My expenses,” “Approval queue,” “Reimbursements,” and “Expense policy”). Do not use promotional taglines or campaign-style subtitles as product headings. “What needs your attention?” is fixed wording.
- Detail opens beside the queue on wide screens and as a full overlay on smaller screens.
- Mobile navigation slides in. Expense rows collapse into labeled operational cards without page-level horizontal overflow; amount, status and next action remain explicit.
- The Approver overview may place a compact Command desk before its queue: instruction, consent, preview, exact matched rows, consequence copy and confirmation. It must read as a bounded operational control—not a floating chatbot—and stack into one column on mobile. Expense policy uses the same field/button language for direct category-limit edits.

## Interaction rules

- Use familiar icons from the installed Lucide library; icons accompany text for consequential actions.
- Buttons have visible hover and focus states. Minimum touch target is 38px; primary form actions are at least 43px.
- Native dialog semantics are used for receipt entry, including Escape dismissal. The dialog is fixed and exactly viewport-centered with safe spacing at wide desktop, 768px, 390px and 360px; it scrolls internally and keeps actions sticky.
- Motion is short and functional and is removed by `prefers-reduced-motion`.
- Status is never communicated by color alone: every status includes a label and marker.
- Above-limit warnings include explicit text.
- Financial displays preserve exact cents and show separate currency totals. The reimbursement tile names the configured schedule (including fortnightly anchor or monthly short-month rule), not a promised transfer date. Keep the existing tile structure and typography.
- The paid metric says “Recorded paid this month” and “Finance record · UTC”; it must not say “Settled.” Planned reimbursement dates and finance-recorded timestamps are distinct.
- Receipt entry is a desktop two-column preview/editor and a mobile single-column workbench with collapsible preview and camera capture. It exposes explicit AI data-transfer consent, automatic one-request extraction once consent and file coexist, reading/error states, editable suggestions, uncertainty/foreign-currency warnings, live policy feedback, duplicate acknowledgement and review confirmation. Preserve the paper/ink palette and native dialog. CSV is secondary to the in-app workflow. No disconnected feature may appear to have succeeded.
- Draft entry reuses the receipt dialog and keeps saved fields when attaching a receipt. The attention assistant extends the queue's existing paper/list style below the main queue, with named questions, record links, loading/error/empty states and an explicit rules-based limitation. It must not imply a connected AI conversation or automatic bank payments.
- Opening or editing a claim fetches its current canonical record. Audit events are keyed to the selected claim/revision. A successful save closes entry even if the subsequent list refresh fails; explain that the save succeeded and never encourage duplicate submission.
- Claim details receive focus on opening, support Escape and return focus to their opener. At overlay widths (1180px and below), trap focus within details and make the obscured workspace inert. Receipt entry has a programmatic dialog name.
- Natural-language questions extend the attention panel inline, using existing paper surfaces, dividers, labels and controls. Separate consented/billed questions from free quick filters. Show the interpreted filter, canonical answer timestamp, saved-result status, refusal/error and empty states; saved links/history selection focus the result. Never present a stored answer as live or imply a chat memory that is not implemented. Do not replace the queue with a chat interface.

## Responsive and accessibility acceptance

- Operable at 360px, 768px, 1024px, and wide desktop widths.
- Keyboard users can reach role switching, receipt submission, filtering, rows, drawer actions, and CSV export.
- Visible focus uses the configured accent mixed with dark ink.
- Inputs have programmatic labels, errors reach the status toast, and loading/empty states contain text.
- Body text and controls meet WCAG AA contrast against their surfaces.

## Durable visual decision

The operational-paper direction, dark rail, receipt workbench, and single configurable accent are intentional. Future customization may change the accent and organization identity but should retain hierarchy, density, status semantics, and financial clarity.
