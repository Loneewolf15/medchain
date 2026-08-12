import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import Settings, get_settings
from app.database import Base, get_db
from app.deps import get_ledger
from app.ledger.simulated import SimulatedHcsLedgerService, SimulatedSmartContractLedgerService
from app.main import app


@pytest.fixture()
def db_session_factory():
    """Fresh in-memory SQLite DB per test (StaticPool keeps one connection
    alive so the in-memory DB survives across the session's lifetime)."""
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    from app import models  # noqa: F401  (register models on Base.metadata)

    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    yield TestingSessionLocal
    Base.metadata.drop_all(bind=engine)


def _make_client(db_session_factory, ledger, ledger_mode: str) -> TestClient:
    def override_get_db():
        db = db_session_factory()
        try:
            yield db
        finally:
            db.close()

    def override_get_ledger():
        return ledger

    def override_get_settings():
        return Settings(LEDGER_MODE=ledger_mode, LEDGER_SIMULATE=True, DATABASE_URL="sqlite:///:memory:")

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_ledger] = override_get_ledger
    app.dependency_overrides[get_settings] = override_get_settings

    client = TestClient(app)
    return client


@pytest.fixture()
def hcs_client(db_session_factory):
    ledger = SimulatedHcsLedgerService()
    client = _make_client(db_session_factory, ledger, "hcs")
    yield client, ledger
    app.dependency_overrides.clear()


@pytest.fixture()
def smart_contract_client(db_session_factory):
    ledger = SimulatedSmartContractLedgerService()
    client = _make_client(db_session_factory, ledger, "smart_contract")
    yield client, ledger
    app.dependency_overrides.clear()


def register_and_login(client: TestClient, email: str, role: str, password: str = "pass1234") -> dict:
    client.post(
        "/auth/register",
        json={"email": email, "password": password, "full_name": email.split("@")[0], "role": role},
    )
    resp = client.post("/auth/login", data={"username": email, "password": password})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
