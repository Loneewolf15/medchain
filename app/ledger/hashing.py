import hashlib
import json
from typing import Any


def canonical_hash(payload: dict[str, Any]) -> str:
    """Deterministic sha256 hash of a JSON-serialisable dict.

    We NEVER put the payload itself on-chain (it's PHI) — only this hash.
    Sorting keys + fixed separators guarantees the same dict always hashes
    the same way regardless of insertion order.
    """
    blob = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()
