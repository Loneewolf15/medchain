# PRD and journeys

The PRD is the product brief the **generator** sees. Keep it product-facing.
Numbered, browser-verifiable pass/fail rules live in the **oracle** — keep the
run **blind**. Terms: [GLOSSARY.md](../GLOSSARY.md).

## What the PRD carries

| Carry | Examples |
|-------|----------|
| Goal, journeys, services, non-goals, deliverables | Product paragraphs |
| Route names at a product level | `/`, `/feed` |
| Wallet-gated journeys as affordances | "Post a message (needs wallet)" |
| Empty-state and testnet expectations | "Shows empty feed on testnet" |

The **oracle** owns assertion ids (`C1`, …), `howToVerify` steps, severity
labels, and mirror verification recipes. The Acceptance section of the PRD
points at the **oracle** file rather than duplicating it.

## Required sections

```markdown
# <Title> (PRD)

## Goal
One paragraph: what Hedera demo this template ships, who it is for, and what
"done" looks like in a browser without live credentials.

## Journeys
1. **Browse without a wallet** — what the user can see/do read-only.
2. **Configure / admin (if any)** — setup UI; what requires a wallet.
3. **Wallet-gated actions** — name the affordances; a successful on-chain tx
   is not required for acceptance at gates 0–3 (unless gate 3.5 is planned).

## Hedera services
- List services (HCS, HTS, …) and how they appear in the UI.
- Default network (usually testnet) and empty-state behavior when nothing is configured.

## Non-goals
- No live operator keys or `.env` required to open the app.
- Call out frameworks you forbid (e.g. Hardhat/Foundry) if this is native/services-only.

## Deliverables
- `template.json`, `README.md`, `AGENTS.md` suitable for scaffold-hbar
- Yarn workspace layout and scripts (`yarn install`, `yarn next:dev`, …)
- Routes the **oracle** will visit (names only — not verification steps)

## Acceptance
Numbered, browser-verifiable assertions live in the **oracle** JSON.
Keep this document product-facing; keep the **oracle** test-facing.
```

## Splitting read path vs wallet-gated

Ask: *Can a stranger open the app with no wallet and no `.env` and still see something useful?*

| Path | Examples | Oracle posture |
|------|----------|----------------|
| Read / browse | Home copy, network label, empty feed | `walletRequired: false`, `verifiableWithoutCredentials: true` |
| Affordance | Connect button, "needs wallet" messaging | `walletRequired: true`, still verifiable without credentials |
| Write / on-chain | Submit HCS message, mint, contract call | Only with gate 3.5 + `executableWithTestSigner: true` |

Design the PRD so the first journey is always a solid credential-free browse path.

## Journey → oracle mapping (later)

When deepening to gate 3, each PRD journey should produce 1–3 assertions:

| Journey | Typical assertions |
|---------|-------------------|
| Browse without wallet | `C1` critical home load; `C2` major read capability |
| Wallet-gated action | Affordance + clear messaging without connecting |
| On-chain (optional) | `executableWithTestSigner` only if `chainValidation` is enabled |

See [acceptance-contract-guide.md](acceptance-contract-guide.md).
