---
name: review-harness-spec
description: Audit an existing hedera-harness spec for wiring and oracle problems before a run. Use when the user wants a harness spec reviewed before running it.
---

# Review Harness Spec

Audit a hedera-harness **spec** on disk along two axes. Catch mistakes the
harness only surfaces after a generator attempt is already burning.

Load the shared vocabulary first: read
[`../harness-spec-anatomy/SKILL.md`](../harness-spec-anatomy/SKILL.md) and its
[GLOSSARY.md](../harness-spec-anatomy/GLOSSARY.md).

Authoring-only skill. The **spec file** `skills:` list carries generator skills.

## Step 1: Locate the spec

Ask for the **slug** (or infer from open files). Resolve paths relative to the
harness clone root (or the user-chosen root) using the file table in
`harness-spec-anatomy`. Read every file that exists. If the **spec file** is
missing, stop and ask.

## Step 2: Wiring axis

Run the anatomy script (resolve path relative to the installed skill):

```bash
bash <path-to>/harness-spec-anatomy/scripts/check-spec.sh <harness-root> <slug>
```

Report its findings **verbatim** under `## Wiring`. If the script is missing,
fall back to the slug map, gate pairing rules, and **blind** checks in
`harness-spec-anatomy` by hand — still under `## Wiring`.

## Step 3: Oracle axis

Judgment only — what a script cannot see. Work through
[references/review-checklist.md](references/review-checklist.md). Cover at least:

- Every PRD journey maps to ≥ 1 **oracle** assertion
- Every assertion traces back to a PRD journey (no orphans / scope creep)
- Severity budget sane (prefer ≤ 2 `critical`)
- **Needles** pin real yarn scripts, not brittle implementation strings
- Playwright **gate** stays thin; deep UX lives in the **oracle**
- Generator `skills:` list is appropriate (no authoring skills)

Report under `## Oracle`. Do **not** merge or rerank with Wiring — a **spec**
can be perfectly wired and still grade the wrong thing.

## Step 4: Emit the report

```markdown
# Harness Spec Review — <slug>

## Summary
- **Gate ambition**: 0–1 | +2 | +3 | +3.5
- **Ready to run gate 0–1?**: yes / no
- **Wiring findings**: N
- **Oracle findings**: N

## Wiring
- [script output or hand-checked findings]

## Oracle
### Blocker
- [id] <what> — <where> — <fix>
### Warning
- [id] <what> — <where> — <fix>
### OK
- Short list of important judgment checks that passed

## Suggested next commands
```bash
npm run harness -- validate specs/<slug>.yaml --workspace runs/<id>/workspace
# or, when Wiring is clean and Oracle has no blockers:
npm run harness -- run specs/<slug>.yaml --max-attempts 3
```
```

Be constructive: every finding needs a concrete fix. Prefer fixing Wiring and
Oracle blockers before suggesting a full `run`.

## Additional resources

- [references/review-checklist.md](references/review-checklist.md)
- Companion: `/create-harness-spec`
- Vocabulary: `/harness-spec-anatomy`
