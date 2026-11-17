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

def bootstrap_database():
    url = get_database_url()
    if not wait_for_db(url):
        print("[Render DB Bootstrap] ERROR: Could not connect to database after maximum retries. Exiting.")
        sys.exit(1)

    init_sql_path = find_init_sql()
    print(f"[Render DB Bootstrap] Using SQL initialization script: {init_sql_path}")

    with psycopg.connect(url, autocommit=True) as conn:
        with conn.cursor() as cur:
            # Check if schema & core table already exist
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'admin_mod' AND table_name = 'outlets'
                );
            """)
            row = cur.fetchone()
            is_initialized = row[0] if row else False

            if is_initialized:
                cur.execute("SELECT COUNT(*) FROM admin_mod.items;")
                item_count = cur.fetchone()[0]
                print(f"[Render DB Bootstrap] Database is already initialized. Found {item_count} catalog items. Skipping init.sql.")
                return

            print("[Render DB Bootstrap] Fresh database detected. Executing init.sql schema and seed records...")
            cur.execute("SET client_encoding = 'UTF8';")
            with open(init_sql_path, "r", encoding="utf-8") as f:
                sql_script = f.read()

            cur.execute(sql_script)
            print("[Render DB Bootstrap] Database schema and initial seed data created successfully!")

            # Verify
            cur.execute("SELECT COUNT(*) FROM admin_mod.items;")
            item_count = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM admin_mod.outlets;")
            outlet_count = cur.fetchone()[0]
            print(f"[Render DB Bootstrap] Verification passed: {item_count} items across {outlet_count} outlets ready.")

if __name__ == "__main__":
    bootstrap_database()
