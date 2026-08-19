import os
import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.config import get_settings
from app.models import Role, User
from app.security import get_current_user

router = APIRouter(prefix="/system", tags=["system"])

class LedgerModeUpdate(BaseModel):
    mode: str

@router.get("/settings")
def get_system_settings(current_user: User = Depends(get_current_user)):
    """Returns global system configuration."""
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    settings = get_settings()
    return {
        "ledger_mode": settings.LEDGER_MODE.value
    }

@router.post("/settings/ledger")
def update_ledger_mode(payload: LedgerModeUpdate, current_user: User = Depends(get_current_user)):
    """Updates the global ledger mode and persists to .env"""
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    mode = payload.mode
    if mode not in ("hcs", "smart_contract"):
        raise HTTPException(status_code=400, detail="Invalid ledger mode")
        
    # Update global settings in memory
    settings = get_settings()
    # We must construct the Enum since LEDGER_MODE is an Enum
    from app.ledger.factory import LedgerMode
    settings.LEDGER_MODE = LedgerMode(mode)
    
    # Persist to .env
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            content = f.read()
            
        # Replace or append
        if re.search(r"^LEDGER_MODE=.*", content, flags=re.MULTILINE):
            content = re.sub(r"^LEDGER_MODE=.*", f"LEDGER_MODE={mode}", content, flags=re.MULTILINE)
        else:
            content += f"\nLEDGER_MODE={mode}\n"
            
        with open(env_path, "w") as f:
            f.write(content)
            
    return {"message": "Ledger mode updated successfully", "mode": mode}
