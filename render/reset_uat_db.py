"""
UAT Database Wipe & Fresh Initialization Script.
- Wipes out all existing schemas and data from PostgreSQL.
- Re-creates clean schema & baseline operational data from db/init.sql
  (with Karol Bagh address & GSTIN 07AAAFB0115B1ZJ).
- Initializes Bikanervala Logo & Branding in admin_mod.system_config.
- Imports all items and pricing directly from the Excel files inside datasource/.
- Can be run standalone: python render/reset_uat_db.py
  or automatically invoked by render/db_bootstrap.py on build/deployment.
"""

import os
import sys
import json
from datetime import datetime, timezone
import psycopg

# Ensure render/ is on sys.path for sibling imports
RENDER_DIR = os.path.dirname(os.path.abspath(__file__))
if RENDER_DIR not in sys.path:
    sys.path.insert(0, RENDER_DIR)

from import_datasource import import_from_excel_files, ensure_roles_permissions

ALL_SCHEMAS = [
    "analytics_mod",
    "kot_mod",
    "pos_mod",
    "oms_mod",
    "factory_mod",
    "stores_mod",
    "vendor_mod",
    "admin_mod",
]

BIKANERVALA_BRANDING_CONFIG = {
    "customer_name": "Bikanervala Foods Pvt. Ltd.",
    "customer_trade_name": "Bikanervala Heritage Sweets",
    "customer_logo_url": "/bikanervala-customer-logo.png",
    "customer_logo_dark_url": "/bikanervala-customer-logo-dark.svg",
    "customer_logo_base64": "",
    "dual_logo_mode": True,
    "customer_logo_height_px": 38,
    "brand_tagline": "Taste of Tradition • Fresh Thinking, Smarter Retail",
    "show_annavya_powered_by": True,
    "gstin": "07AAAFB0115B1ZJ",
    "address": "10181/82 Gurudwara Road, Bikanervala Chowk, Arya Samaj Rd, Karol Bagh, New Delhi, Delhi 110005",
}


def get_database_url() -> str:
    url = os.getenv("DATABASE_URL", "postgresql://annavya:annavya_secret@127.0.0.1:5432/annavya_erp")
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


def find_init_sql() -> str:
    candidates = [
        "/app/db/init.sql",
        os.path.join(RENDER_DIR, "..", "db", "init.sql"),
        os.path.join(os.getcwd(), "db", "init.sql"),
    ]
    for c in candidates:
        if os.path.isfile(c):
            return os.path.abspath(c)
    raise FileNotFoundError(f"Could not find init.sql in candidates: {candidates}")


def wipe_all_data(cur):
    """Drops all application schemas cleanly to wipe out all data."""
    print("[UAT Reset] Wiping all existing database schemas and data...")
    for schema in ALL_SCHEMAS:
        cur.execute(f"DROP SCHEMA IF EXISTS {schema} CASCADE;")
    print("[UAT Reset] All schemas wiped cleanly.")


def initialize_bikanervala_branding(cur):
    """Initializes admin_mod.system_config with the official Bikanervala logo and outlet details."""
    print("[UAT Reset] Initializing Bikanervala Logo & Branding configuration...")
    cur.execute(
        """
        INSERT INTO admin_mod.system_config (config_key, config_value)
        VALUES ('branding', %s::jsonb)
        ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;
        """,
        (json.dumps(BIKANERVALA_BRANDING_CONFIG),),
    )


def mark_uat_initialized(cur):
    """Marks the database as cleanly initialized for UAT so restarts don't re-wipe UAT test data."""
    marker = {
        "initialized_at": datetime.now(timezone.utc).isoformat(),
        "gstin": "07AAAFB0115B1ZJ",
        "address": "10181/82 Gurudwara Road, Bikanervala Chowk, Arya Samaj Rd, Karol Bagh, New Delhi, Delhi 110005",
        "source": "datasource/*.xlsx",
    }
    cur.execute(
        """
        INSERT INTO admin_mod.system_config (config_key, config_value)
        VALUES ('uat_clean_reset_v1', %s::jsonb)
        ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;
        """,
        (json.dumps(marker),),
    )


def perform_uat_wipe_and_init(cur, init_sql_path: str, migrations_fn=None):
    """Executes full UAT wipe, schema init, migrations, branding logo init, and Excel catalog import."""
    wipe_all_data(cur)

    print(f"[UAT Reset] Executing fresh schema & baseline seed from {init_sql_path}...")
    with open(init_sql_path, "r", encoding="utf-8") as f:
        cur.execute(f.read())

    if migrations_fn is not None:
        migrations_fn(cur)

    ensure_roles_permissions(cur)
    initialize_bikanervala_branding(cur)

    print("[UAT Reset] Importing items & pricing from Excel files in datasource/...")
    imported_count = import_from_excel_files(cur)
    print(f"[UAT Reset] Imported {imported_count} items from Excel datasources.")

    mark_uat_initialized(cur)
    print("[UAT Reset] UAT database wipe & fresh initialization completed!")


def main():
    from db_bootstrap import apply_schema_migrations, wait_for_db

    url = get_database_url()
    if not wait_for_db(url):
        print("[UAT Reset] ERROR: Could not connect to database.")
        sys.exit(1)

    init_sql_path = find_init_sql()
    with psycopg.connect(url, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute("SET client_encoding = 'UTF8';")
            perform_uat_wipe_and_init(cur, init_sql_path, apply_schema_migrations)
            cur.execute("SELECT COUNT(*) FROM admin_mod.items;")
            total_items = cur.fetchone()[0]
            print(f"[UAT Reset] Final verified catalog count: {total_items} items.")


if __name__ == "__main__":
    main()
