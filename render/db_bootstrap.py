import os
import sys
import time
import psycopg

def get_database_url() -> str:
    url = os.getenv("DATABASE_URL", "postgresql://annavya:annavya_secret@127.0.0.1:5432/annavya_erp")
    # Render sometimes provides postgres:// instead of postgresql://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url

def find_init_sql() -> str:
    candidates = [
        "/app/db/init.sql",
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "db", "init.sql"),
        os.path.join(os.getcwd(), "db", "init.sql"),
    ]
    for c in candidates:
        if os.path.isfile(c):
            return os.path.abspath(c)
    raise FileNotFoundError(f"Could not find init.sql in candidates: {candidates}")

def wait_for_db(url: str, max_retries: int = 30, delay: float = 1.0) -> bool:
    print(f"[Render DB Bootstrap] Waiting for database at {url.split('@')[-1] if '@' in url else url}...")
    for i in range(1, max_retries + 1):
        try:
            with psycopg.connect(url, autocommit=True) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1;")
                    print(f"[Render DB Bootstrap] Database connection established (attempt {i}/{max_retries}).")
                    return True
        except Exception as e:
            if i % 5 == 0 or i == max_retries:
                print(f"[Render DB Bootstrap] Waiting for DB... attempt {i}/{max_retries} ({e})")
            time.sleep(delay)
    return False

def apply_schema_migrations(cur):
    """
    Applies idempotent schema migrations to existing databases.
    Ensures missing columns like failed_attempts, is_locked, role_ids, mfa_* are present
    so logins and workflows never fail on Render.
    """
    migrations = [
        # 1. admin_mod.users (Authentication, lockout, PIN, MFA)
        ("admin_mod.users", "role_ids", "ALTER TABLE admin_mod.users ADD COLUMN IF NOT EXISTS role_ids JSONB DEFAULT '[]'::jsonb;"),
        ("admin_mod.users", "is_locked", "ALTER TABLE admin_mod.users ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;"),
        ("admin_mod.users", "failed_attempts", "ALTER TABLE admin_mod.users ADD COLUMN IF NOT EXISTS failed_attempts INT DEFAULT 0;"),
        ("admin_mod.users", "mfa_enabled", "ALTER TABLE admin_mod.users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;"),
        ("admin_mod.users", "mfa_secret", "ALTER TABLE admin_mod.users ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(80) DEFAULT NULL;"),
        ("admin_mod.users", "mfa_enrolled_at", "ALTER TABLE admin_mod.users ADD COLUMN IF NOT EXISTS mfa_enrolled_at TIMESTAMPTZ;"),

        # 2. admin_mod.items (Food photography, custom package, kitchen routing)
        ("admin_mod.items", "image_url", "ALTER TABLE admin_mod.items ADD COLUMN IF NOT EXISTS image_url TEXT;"),
        ("admin_mod.items", "kitchen_station", "ALTER TABLE admin_mod.items ADD COLUMN IF NOT EXISTS kitchen_station VARCHAR(40);"),
        ("admin_mod.items", "item_type", "ALTER TABLE admin_mod.items ADD COLUMN IF NOT EXISTS item_type VARCHAR(40) DEFAULT 'Prepared Food';"),
        ("admin_mod.items", "package_components", "ALTER TABLE admin_mod.items ADD COLUMN IF NOT EXISTS package_components JSONB DEFAULT '[]'::jsonb;"),
        ("admin_mod.items", "is_custom_package", "ALTER TABLE admin_mod.items ADD COLUMN IF NOT EXISTS is_custom_package BOOLEAN DEFAULT FALSE;"),

        # 3. pos_mod.shifts (Shift handover, cash drawer remittance, start/verify actors)
        ("pos_mod.shifts", "counter_name", "ALTER TABLE pos_mod.shifts ADD COLUMN IF NOT EXISTS counter_name VARCHAR(60) DEFAULT 'Cash Counter 1';"),
        ("pos_mod.shifts", "started_by", "ALTER TABLE pos_mod.shifts ADD COLUMN IF NOT EXISTS started_by VARCHAR(80) DEFAULT 'Shop Manager';"),
        ("pos_mod.shifts", "verified_by", "ALTER TABLE pos_mod.shifts ADD COLUMN IF NOT EXISTS verified_by VARCHAR(80);"),
        ("pos_mod.shifts", "handover_to", "ALTER TABLE pos_mod.shifts ADD COLUMN IF NOT EXISTS handover_to VARCHAR(80);"),
        ("pos_mod.shifts", "remittance_breakdown", "ALTER TABLE pos_mod.shifts ADD COLUMN IF NOT EXISTS remittance_breakdown JSONB DEFAULT '{}'::jsonb;"),
        ("pos_mod.shifts", "handover_at", "ALTER TABLE pos_mod.shifts ADD COLUMN IF NOT EXISTS handover_at TIMESTAMPTZ;"),

        # 4. pos_mod.pos_orders (Customer estimate details)
        ("pos_mod.pos_orders", "customer_name", "ALTER TABLE pos_mod.pos_orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(120);"),
        ("pos_mod.pos_orders", "customer_mobile", "ALTER TABLE pos_mod.pos_orders ADD COLUMN IF NOT EXISTS customer_mobile VARCHAR(20);"),

        # 5. oms_mod.bulk_orders (Corporate & Wedding hampers fields 1-6 & PDF)
        ("oms_mod.bulk_orders", "customer_email", "ALTER TABLE oms_mod.bulk_orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);"),
        ("oms_mod.bulk_orders", "company_gstin", "ALTER TABLE oms_mod.bulk_orders ADD COLUMN IF NOT EXISTS company_gstin VARCHAR(32);"),
        ("oms_mod.bulk_orders", "billing_address", "ALTER TABLE oms_mod.bulk_orders ADD COLUMN IF NOT EXISTS billing_address TEXT;"),
        ("oms_mod.bulk_orders", "shipping_address", "ALTER TABLE oms_mod.bulk_orders ADD COLUMN IF NOT EXISTS shipping_address TEXT;"),
        ("oms_mod.bulk_orders", "quotation_pdf_url", "ALTER TABLE oms_mod.bulk_orders ADD COLUMN IF NOT EXISTS quotation_pdf_url TEXT;"),

        # 6. kot_mod.dining_tables (Restaurant floor alignment)
        ("kot_mod.dining_tables", "floor_name", "ALTER TABLE kot_mod.dining_tables ADD COLUMN IF NOT EXISTS floor_name VARCHAR(60) DEFAULT 'Ground Floor';"),
    ]

    print("[Render DB Bootstrap] Applying idempotent schema migrations...")
    for table, col, sql in migrations:
        try:
            cur.execute(sql)
        except Exception as e:
            print(f"[Render DB Bootstrap] Migration warning on {table}.{col}: {e}")

    # Set default values for any NULL failed_attempts or is_locked
    try:
        cur.execute("UPDATE admin_mod.users SET failed_attempts = 0 WHERE failed_attempts IS NULL;")
        cur.execute("UPDATE admin_mod.users SET is_locked = false WHERE is_locked IS NULL;")
        cur.execute("UPDATE admin_mod.users SET role_ids = '[]'::jsonb WHERE role_ids IS NULL;")
        cur.execute("UPDATE admin_mod.users SET mfa_enabled = false WHERE mfa_enabled IS NULL;")
    except Exception as e:
        print(f"[Render DB Bootstrap] Data fixup warning: {e}")

    # Ensure bulk_orders order_type check allows corporate gifting and new types
    try:
        cur.execute("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'bulk_orders_order_type_check'
                ) THEN
                    ALTER TABLE oms_mod.bulk_orders DROP CONSTRAINT bulk_orders_order_type_check;
                END IF;
                ALTER TABLE oms_mod.bulk_orders ADD CONSTRAINT bulk_orders_order_type_check 
                CHECK (order_type IN (
                    'Marriage', 'Corporate', 'Festival', 'Catering', 
                    'Corporate Gifting', 'Retail Bulk', 'Event Catering', 
                    'Festive Hampers', 'Institutional'
                ));
            END $$;
        """)
    except Exception as e:
        print(f"[Render DB Bootstrap] Constraint update warning on bulk_orders: {e}")

    print("[Render DB Bootstrap] Schema migrations verified and applied successfully!")

def bootstrap_database():
    url = get_database_url()
    if not wait_for_db(url):
        print("[Render DB Bootstrap] ERROR: Could not connect to database after maximum retries. Exiting.")
        sys.exit(1)

    init_sql_path = find_init_sql()
    print(f"[Render DB Bootstrap] Using SQL initialization script: {init_sql_path}")

    with psycopg.connect(url, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute("SET client_encoding = 'UTF8';")

            # Check if schema & core table already exist
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'admin_mod' AND table_name = 'outlets'
                );
            """)
            row = cur.fetchone()
            is_initialized = row[0] if row else False

            if not is_initialized:
                print("[Render DB Bootstrap] Fresh database detected. Executing init.sql schema and seed records...")
                with open(init_sql_path, "r", encoding="utf-8") as f:
                    sql_script = f.read()

                cur.execute(sql_script)
                print("[Render DB Bootstrap] Database schema and initial seed data created successfully!")
            else:
                print("[Render DB Bootstrap] Existing database detected.")

            # ALWAYS apply migrations so any missing columns are created
            apply_schema_migrations(cur)

            # Verify core counts
            cur.execute("SELECT COUNT(*) FROM admin_mod.items;")
            item_count = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM admin_mod.outlets;")
            outlet_count = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM admin_mod.users;")
            user_count = cur.fetchone()[0]
            print(f"[Render DB Bootstrap] Verification passed: {item_count} items across {outlet_count} outlets with {user_count} staff users ready.")

if __name__ == "__main__":
    bootstrap_database()
