# Grilling a harness spec

Prefer the Matt Pocock `/grilling` skill when it is available. Otherwise follow
this protocol. Either way, apply the harness decision tree below.

## Protocol

1. Interview relentlessly about every aspect of the demo until you reach a
   shared understanding. Walk down each branch of the decision tree, resolving
   dependencies between decisions one-by-one.
2. Ask **one question at a time**. Wait for the answer before continuing.
   Asking multiple questions at once is bewildering.
3. For each question, provide your **recommended answer**.
4. If a *fact* can be found by exploring the environment, look it up rather
   than asking. Decisions belong to the user.

### Facts to look up (do not ask)

- Is this a harness clone? (`specs/`, `skeletons/new-template/`, `skills-index.json`)
- Which generator skills exist? (read `skills-index.json`)
- What do existing **spec files** under `specs/` do for house conventions?
- What scripts does the scaffold-hbar seed document? (README / package.json when present)

5. Do **not** write files until the user confirms shared understanding.

## Decision tree (dependency order)

Walk these decisions in order. Later choices depend on earlier answers.

1. **Product goal** — one paragraph: what the demo is, who it is for, what
   "done" looks like in a browser without live credentials.
   *Recommend:* keep the first journey credential-free.

2. **Slug** — kebab-case name for paths and the slug map.
   *Recommend:* short product noun (`proof-wall`, `x402-metered-api`).

3. **Solidity in scope?** — yes / no.
   - Yes → Hardhat/Foundry workspaces allowed; consider `hts-system-contract`
     (and deploy/`chainValidation` later).
   - No → forbid Hardhat/Foundry workspaces in the **spec file**; prefer native
     service skills (`hedera-consensus-service`, `hedera-token-service`).

4. **Hedera services** — HCS, HTS, HSS, precompiles, mirror reads, …
   *Recommend:* map each service to a generator skill name from
   `skills-index.json`.

5. **Routes** — at least `/`, plus any secondary paths.
   *Recommend:* only routes the first green run will actually ship.

6. **Wallet-gated writes?** — which journeys need a wallet?
   - Read-only / affordance-only → gates 0–3 are enough; keep gate 3.5 commented.
   - Real on-chain writes must be graded → gate 3.5 + `executableWithTestSigner`
     become meaningful (still opt-in; confirm explicitly).

7. **Gate ambition for the first green run** — default **gate 0–1 only**.
   Offer 2 / 3 / 3.5 only after the user opts in. Ambition decides which files
   get filled vs left as commented stubs.

8. **Confirm shared understanding** — summarize the decisions (slug, services,
   routes, Solidity, gates, generator skills). Wait for an explicit go-ahead
   before emitting files.
