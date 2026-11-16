import os
import hashlib
import json
from contextlib import contextmanager
from psycopg_pool import ConnectionPool
from psycopg.rows import dict_row

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://annavya:annavya_secret@annavya-db:5432/annavya_erp",
)

_pool: ConnectionPool | None = None


def get_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        _pool = ConnectionPool(
            conninfo=DATABASE_URL,
            min_size=1,
            max_size=10,
            kwargs={"row_factory": dict_row, "autocommit": True},
        )
    return _pool


@contextmanager
def get_conn():
    with get_pool().connection() as conn:
        yield conn


GSTIN_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def compute_gstin_check_digit(first14: str) -> str:
    factor = 1
    total = 0
    for ch in first14.upper():
        code_point = GSTIN_CHARSET.index(ch)
        product = code_point * factor
        factor = 2 if factor == 1 else 1
        total += (product // 36) + (product % 36)
    remainder = total % 36
    check_code = (36 - remainder) % 36
    return GSTIN_CHARSET[check_code]


def validate_gstin_format(gstin: str) -> tuple[bool, str]:
    if not gstin:
        return False, "GSTIN is required"
    g = gstin.strip().upper()
    if len(g) != 15:
        return False, "GSTIN must be exactly 15 characters"
    state_code = g[:2]
    if not state_code.isdigit() or not (1 <= int(state_code) <= 38):
        return False, "Invalid 2-digit State Code (must be 01-38)"
    pan = g[2:12]
    if not (pan[:5].isalpha() and pan[5:9].isdigit() and pan[9].isalpha()):
        return False, "Invalid embedded PAN format in characters 3-12"
    if g[13] != "Z":
        return False, "14th character of GSTIN must be 'Z'"
    for ch in g:
        if ch not in GSTIN_CHARSET:
            return False, f"Invalid character '{ch}' in GSTIN"
    expected = compute_gstin_check_digit(g[:14])
    if g[14] != expected:
        return False, f"Invalid GSTIN checksum (expected '{expected}', got '{g[14]}')"
    return True, "Valid GSTIN format and checksum"


def compute_cart_hash(items: list[dict]) -> str:
    canonical = json.dumps(
        [
            {
                "sku": i.get("sku"),
                "qty": round(float(i.get("qty", 0)), 4),
                "price": round(float(i.get("unit_price", 0)), 2),
            }
            for i in sorted(items, key=lambda x: str(x.get("sku", "")))
        ],
        sort_keys=True,
    )
    return hashlib.sha256(canonical.encode()).hexdigest()[:16]

