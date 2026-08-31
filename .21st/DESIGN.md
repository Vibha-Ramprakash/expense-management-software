# Keel design context

- Product: expense reimbursement workflow
- Stack: React, Tailwind CSS v4, Vite/vinext
- Mode: light operational workspace
- Density: compact, legible financial operations

## Sources

- Tokens and responsive behavior: `app/globals.css`
- Product component: `components/KeelApp.tsx`
- Business-controlled accent: `config/business.json`
- Normative design specification: `docs/DESIGN_CONTRACT.md`

## Direction

Use an operational-paper direction with a near-black green rail, warm paper surfaces, a receipt workbench, compact workflow density, and one configurable high-visibility accent. Preserve the queue hierarchy and explicit financial status language.

Avoid generic finance-blue gradients, glass effects, excessive cards, decorative charts, huge marketing headlines, and animation that does not communicate a state change.

Use Lucide icons already installed in the project. Keep visible focus, status labels in addition to color, native dialog semantics, reduced-motion support, and horizontal table scrolling when financial columns cannot collapse safely.
