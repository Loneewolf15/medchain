from app.ledger.hashing import canonical_hash


def test_hash_is_deterministic_regardless_of_key_order():
    a = {"systolic": 120, "diastolic": 80, "heart_rate": 72}
    b = {"heart_rate": 72, "diastolic": 80, "systolic": 120}
    assert canonical_hash(a) == canonical_hash(b)


def test_hash_changes_when_data_changes():
    a = {"systolic": 120}
    b = {"systolic": 121}
    assert canonical_hash(a) != canonical_hash(b)


def test_hash_is_a_sha256_hex_digest():
    h = canonical_hash({"x": 1})
    assert len(h) == 64
    int(h, 16)  # raises if not valid hex
