# MedChain

Blockchain-backed medical record & tracking dApp — final year project.

FastAPI backend, Hedera (HCS + optional HSCS) for tamper-evident anchoring
and access control, SQLite/Postgres for the actual PHI (never on-chain),
Next.js frontend (separate, not in this repo yet).

## The core idea

- **All PHI lives off-chain**, in a normal SQL database — vitals, biometrics,
  history, allergies, diagnostics, prescriptions, identity records.
- **Hedera never sees PHI.** Every record write is hashed (SHA-256) and only
  the hash is anchored on-chain, via Hedera Consensus Service (HCS), as an
  immutable, timestamped audit trail. This proves a record existed with
  specific contents at a specific time, without putting any patient data
  on a public ledger.
- **Access control** (who can see which patient's clinical / diagnostic /
  administrative data) has two possible backends, switched with one flag:

  | `LEDGER_MODE`      | Where access decisions are enforced                          |
  |--------------------|----------------------------------------------------------------|
  | `hcs` (default)    | In the app database. Grants/revokes are still logged to HCS for audit, but the actual allow/deny check is a DB query — cheap, fast, no contract needed. |
  | `smart_contract`   | On-chain, by a deployed Solidity contract (`contracts/AccessControl.sol`) via Hedera Smart Contract Service (HSCS). The DB row becomes a read-through cache; the contract is the source of truth. |

  Both modes implement the exact same `LedgerService` interface
  (`app/ledger/base.py`), so routers and services never know or care which
  one is active — flip `LEDGER_MODE` in `.env` and restart.

- **`LEDGER_SIMULATE`** (default `true`) swaps in an in-memory fake for
  whichever mode is active, so you can build/demo/test with zero Hedera
  credentials and zero network calls. Flip to `false` once you have testnet
  credentials and want the real thing.

## Quick start

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # defaults are fine for local dev
uvicorn app.main:app --reload
# → http://127.0.0.1:8000/docs
```

Run the tests:

```bash
pytest -q
```

## Trying it out via /docs

1. `POST /auth/register` — create a doctor, nurse, lab_scientist, or patient user.
2. `POST /auth/login` (OAuth2 password form, not JSON) — get a bearer token,
   click "Authorize" in `/docs` and paste it in.
3. `POST /patients` (as staff) — creates a patient. The staff member who
   creates the patient is auto-granted `all`-scope access (the "attending"),
   and can grant/revoke others from there via `/patients/{id}/access`.
4. `POST /patients/{id}/clinical-records` — write vitals/biometrics/history/allergy.
   The response includes `record_hash` and `ledger_tx_id` — proof it was anchored.
5. `POST /patients/{id}/iot/reading` — simulate one device reading right now
   (blood pressure / heart rate / SpO2 / temperature / glucose), or
   `POST /patients/{id}/iot/start` to get a reading every
   `IOT_SIMULATION_INTERVAL_SECONDS` in the background.
6. `GET /ledger/status` — see which mode is active and whether it's simulated.

## Switching to real Hedera testnet

1. Get free testnet credentials at https://portal.hedera.com
2. Put `HEDERA_OPERATOR_ID` / `HEDERA_OPERATOR_KEY` in `.env`, set
   `LEDGER_SIMULATE=false`.
3. Run `python scripts/bootstrap_hedera.py` (add `--contract` if
   `LEDGER_MODE=smart_contract`) — it creates the HCS topic (and deploys
   `AccessControl.sol` if asked), and prints the IDs to paste into `.env`.
4. Restart the app. Every record/grant/revoke/view now produces a real
   Hedera transaction id you can look up on
   [HashScan](https://hashscan.io/testnet).

## Project structure

```
app/
  config.py          settings incl. LEDGER_MODE / LEDGER_SIMULATE flags
  models.py           SQLAlchemy models: clinical / diagnostic / administrative
  ledger/
    base.py            LedgerService interface + AnchorReceipt
    hcs_service.py      real HCS implementation
    smart_contract_service.py   real HSCS implementation (extends HCS)
    simulated.py        in-memory fakes for both modes
    factory.py           picks the right implementation from the flag
  services/
    access_service.py   grant/revoke/check access (mode-agnostic)
    record_service.py    hash + anchor any record write
  routers/               auth, patients, clinical, diagnostic, access, iot, ledger
  iot_simulator.py       fake vitals generator (swap for a real device later)
contracts/
  AccessControl.sol     on-chain grant/revoke/hasAccess, only used in smart_contract mode
scripts/
  bootstrap_hedera.py    one-time: create HCS topic, deploy AccessControl.sol
tests/                   full API flow tested in BOTH ledger modes, via mocks
```

## What's simulated vs. real right now

- `hiero-sdk-python` (the real Hedera SDK) is a genuine dependency and the
  `hcs_service.py` / `smart_contract_service.py` code paths are real,
  working Hedera calls — they're just not exercised by default
  (`LEDGER_SIMULATE=true`) so you're not forced to hold testnet credentials
  just to develop or run `pytest`.
- The IoT device is a simulator (`app/iot_simulator.py`) generating
  plausible vitals with an occasional out-of-range "alert" reading. A real
  device would hit the same `create_and_anchor_vitals()` function via a
  small ingest endpoint — nothing else changes.
