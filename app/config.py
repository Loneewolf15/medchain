"""
Central configuration for the app.

The important flag here is LEDGER_MODE. It controls how much of the
system's trust logic actually lives on Hedera:

  LEDGER_MODE=hcs              (default)
      - Every clinical/diagnostic record write gets hashed and the hash
        is anchored to a Hedera Consensus Service (HCS) topic.
      - Every access grant/revoke/view is logged to the same (or a
        second) HCS topic as an immutable audit trail.
      - Access control DECISIONS (who is allowed to see what) are made
        and enforced off-chain, in Postgres/SQLite.
      - Cheap, fast, simple. Good default for a demo and for most of
        development, since it needs no contract deployment.

  LEDGER_MODE=smart_contract
      - Everything HCS mode does, PLUS:
      - Access control DECISIONS are enforced on-chain by a deployed
        Solidity contract (Hedera Smart Contract Service / HSCS).
        grantAccess/revokeAccess/hasAccess calls go to the contract
        instead of just a DB table, so access rules are trustless and
        auditable independent of our backend.

Both modes talk to the same LedgerService interface (see app/ledger/base.py)
so the rest of the app (routers, services) never needs to know which mode
is active. Swap it with one env var.
"""
from enum import Enum
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class LedgerMode(str, Enum):
    HCS = "hcs"
    SMART_CONTRACT = "smart_contract"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- App ---
    APP_NAME: str = "MedChain"
    ENV: str = "development"
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    # --- Database (off-chain store for all PHI) ---
    DATABASE_URL: str = "sqlite:///./medchain.db"

    # --- Ledger mode flag ---
    LEDGER_MODE: LedgerMode = LedgerMode.HCS

    # If True, ledger calls are stubbed out with an in-memory fake instead
    # of talking to real Hedera testnet. Turn this off once you have real
    # HEDERA_OPERATOR_ID / HEDERA_OPERATOR_KEY and want to hit testnet.
    LEDGER_SIMULATE: bool = True

    # --- Hedera credentials (only needed when LEDGER_SIMULATE=False) ---
    HEDERA_NETWORK: str = "testnet"  # testnet | previewnet | mainnet
    HEDERA_OPERATOR_ID: str | None = None
    HEDERA_OPERATOR_KEY: str | None = None

    # Existing topic/contract IDs, so you don't redeploy every run.
    # Leave blank the first time; the bootstrap script will create them
    # and print the IDs to paste back in here / your .env.
    HEDERA_RECORD_TOPIC_ID: str | None = None
    HEDERA_AUDIT_TOPIC_ID: str | None = None
    HEDERA_ACCESS_CONTRACT_ID: str | None = None

    # --- Auth ---
    JWT_SECRET: str = "dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 12

    # --- IoT simulator ---
    IOT_SIMULATION_INTERVAL_SECONDS: int = 10


@lru_cache
def get_settings() -> Settings:
    return Settings()
