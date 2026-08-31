# Security policy

Keel Phase 1 is a local demonstration, not a hosted multi-employee expense system.

- Use synthetic data only.
- Never commit `.env*`, `.dev.vars*`, API keys, GitHub tokens, receipts containing real personal or payment information, or local database files.
- Connect optional OpenAI receipt extraction privately through `npm run connect:ai`; do not paste keys into issues, pull requests, prompts, or chat.
- Do not remove or bypass the production access barrier in order to publish the demo. Real identity, organization membership, route authorization, retention, and backup requirements must be implemented and verified first.
- Payment recording is an auditable application event. Keel does not transfer money.

Please report a vulnerability privately to the repository owner rather than opening a public issue containing exploit details or secrets. See `docs/ACCESS_SECURITY.md` for the complete current boundary.
