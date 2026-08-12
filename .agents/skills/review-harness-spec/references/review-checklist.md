# Oracle review checklist

Judgment checks only. Mechanical wiring (slug map, `REPLACE_ME`, `install`
command name, gate 3 pairing, `chainValidation.network`,
`executableWithTestSigner`, **blind** PRD scan) lives in
`harness-spec-anatomy/scripts/check-spec.sh` — do not re-check those here.

Mark each item pass / fail / n/a.

## Journey ↔ assertion traceability

- [ ] **O1** Every PRD journey maps to at least one **oracle** assertion
- [ ] **O2** Every oracle assertion traces to a PRD journey (no orphans / scope creep)
- [ ] **O3** Assertions have stable ids (`C1`, `C2`, …), non-empty `statement` and
      `howToVerify`, and the Acceptance section of the PRD points at the oracle
      rather than duplicating it

## Severity and thinness

- [ ] **O4** Prefer ≤ 2 `critical` assertions; flag specs where most assertions are `critical`
- [ ] **O5** Playwright **gate** stays thin (server + routes + forbidden crash text);
      deep UX belongs in the **oracle**
- [ ] **O6** If the oracle exists: `evaluationRules.failOnUncertainty` (or equivalent
      fail-closed posture) is present

## Needles and product fit

- [ ] **O7** Static **needles** match scripts the PRD / template will actually document
      (`yarn install`, `yarn next:dev`, …) — not brittle implementation strings
- [ ] **O8** If Solidity is a non-goal: `forbiddenWorkspaces` / forbidden Hardhat paths
      align with the PRD; if Solidity is in scope: needed workspaces are not forbidden
- [ ] **O9** Spec file `skills:` (if any) lists generator skills from `skills-index.json`
      only — never `create-harness-spec` / `review-harness-spec` / `harness-spec-anatomy`

## Seed and secrets (judgment)

- [ ] **O10** No real private keys or account ids in any spec file
- [ ] **O11** `secretScan` / forbidden `.env` paths present for scaffold-hbar templates
- [ ] **O12** `seed.repo` / `seed.ref` sensible; `isolation.neverModifySeedRepo: true`
      when using a shared seed
- [ ] **O13** Command timeouts are generous enough for cold CI (install ≥ 300s typical);
      `requiresNoSecrets: true` (or equivalent)

## Quick oracle-blocker shortlist

Fail the review as not-runnable if **O1**, **O2**, or **O10** fail (plus any
Wiring blockers from `check-spec.sh`).
