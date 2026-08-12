# Glossary

Use these terms exactly. Do not substitute "pack", "benchmark pack", or
"acceptance file" when a glossary word fits.

**Spec** — the coupled set of files the harness consumes for one benchmark
(PRD, **spec file**, static validator, command validator, and optionally
Playwright smoke + **oracle**). _Avoid_: pack, benchmark pack.

**Spec file** — `specs/<name>.yaml` specifically: seed, generator, validators,
gates, and constraints. One file inside the **spec**.

**Slug** — the kebab-case name (`proof-wall`, `x402-metered-api`) that must
agree at every site in the slug map (`name`, `templateMetadata.name`, paths,
static `template.json` name, oracle `template`).

**Blind** — the generation-integrity property. The PRD is vendored to the
generator; the **oracle** grades the running app. Pasting assertion ids,
`howToVerify`, or severity labels into the PRD destroys the property. Phrase
the rule as: **keep the run blind**.

**Oracle** — the acceptance contract JSON (`contracts/<name>-acceptance.json`).
Source of truth for semantic pass/fail under gate 3. Grades numbered
assertions — not the raw PRD.

**Gate** — a validation tier that can stop a run: 0–1 (deterministic), 2
(Playwright), 3 (semantic / **oracle**), 3.5 (on-chain). Every enabled **gate**
must pass.

**Needle** — a static text assertion (`textAssertions[].contains`) that pins a
string the generated template must document (e.g. `yarn next:dev`). Prefer
stable script names over incidental implementation detail.
