# Evidence implementation review

The initial implementation was incomplete. Review found a JWT in the PDF URL,
broken evidence-detail interpolation, missing provenance checks, an unused revision
column, non-idempotent migration, unimplemented highlights, missing modal styles,
missing focus handling, 13 lint errors, and calls to a nonexistent toast API.

These have been corrected. See docs/features/evidence-contract.md for the actual
contract, storage policy, page conventions, limitations and reproducible commands.
The agent-prompts and agent-prompt directories are ignored and remain local.

Verification results and deployment commit/status are recorded in
`docs/features/evidence-verification.md`.
