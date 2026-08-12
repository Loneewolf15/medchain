import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import init_db
from app.routers import access, auth, clinical, diagnostic, iot, ledger, patients

logging.basicConfig(level=logging.INFO)
settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Blockchain-backed medical record dApp. PHI lives off-chain "
        "(SQL); record hashes and access events are anchored to Hedera. "
        f"Current ledger mode: {settings.LEDGER_MODE.value} "
        f"({'simulated' if settings.LEDGER_SIMULATE else 'live testnet'})."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten before any real deployment
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(clinical.router)
app.include_router(diagnostic.router)
app.include_router(access.router)
app.include_router(iot.router)
app.include_router(ledger.router)


@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "ledger_mode": settings.LEDGER_MODE.value,
        "simulated": settings.LEDGER_SIMULATE,
        "docs": "/docs",
    }
