"""
Import script for Bikanervala & Haldiram Datasources (Packaged Foods & Vegetarian Menu).
Can be run standalone or invoked automatically by render/db_bootstrap.py during Render deployment.

Features:
- Pure Python zero-dependency Excel parser (uses zipfile + xml.etree.ElementTree) for .xlsx files.
- SQL dump loader (datasource_items.sql) for rapid bulk population of 1,657 catalog items.
- Dynamic role permission patcher to enable 'item_admin', 'order_taking', 'kiosk', and 'walkie_talkie'.
"""

import os
import sys
import argparse
import zipfile
import xml.etree.ElementTree as ET
import psycopg

def get_database_url() -> str:
    url = os.getenv("DATABASE_URL", "postgresql://annavya:annavya_secret@127.0.0.1:5432/annavya_erp")
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url

def find_file(relative_name: str) -> str:
    candidates = [
        os.path.join(os.path.dirname(os.path.abspath(__file__)), relative_name),
        os.path.join(os.getcwd(), relative_name),
        os.path.join(os.getcwd(), "render", relative_name),
        f"/app/render/{relative_name}",
        f"/app/{relative_name}",
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", relative_name),
    ]
    for c in candidates:
        if os.path.isfile(c):
            return os.path.abspath(c)
    return ""

def parse_excel_sheet(path: str, sheet_name_target: str):
    """Parses a specific worksheet from an .xlsx workbook without third-party dependencies."""
    if not os.path.isfile(path):
        return []
    with zipfile.ZipFile(path) as z:
        strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for si in tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                text = ''.join(t.text or '' for t in si.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t'))
                strings.append(text)

        wb_tree = ET.fromstring(z.read('xl/workbook.xml'))
        rels_tree = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
        rel_map = {r.get('Id'): r.get('Target').lstrip('/') for r in rels_tree.findall('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship')}

        target_file = None
        for s in wb_tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheets/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheet'):
            if s.get('name') == sheet_name_target:
                rel_id = s.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
                tgt = rel_map.get(rel_id, '')
                target_file = tgt if tgt.startswith('xl/') else f'xl/{tgt}'
                break

        if not target_file or target_file not in z.namelist():
            return []

        sheet = ET.fromstring(z.read(target_file))
        rows = []
        for r in sheet.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheetData/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
            row_data = []
            for c in r.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                t = c.get('t')
                v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                val = v.text if v is not None else ''
                if t == 's' and val.isdigit():
                    val = strings[int(val)] if int(val) < len(strings) else val
                row_data.append(val)
            rows.append(row_data)
        return rows

def ensure_roles_permissions(cur):
    """Ensures 'item_admin', 'order_taking', 'kiosk', and 'walkie_talkie' are enabled in admin_mod.roles."""
    print("[Import Datasource] Ensuring 'item_admin', 'order_taking', 'kiosk' are enabled in admin_mod.roles...")
    cur.execute("""
        UPDATE admin_mod.roles
        SET permissions = jsonb_set(
            permissions,
            '{modules}',
            '["executive","pos","rest_pos","order_taking","kiosk","shop","oms","stores","factory","kot","vendor","admin","item_admin","reports","walkie_talkie"]'::jsonb
        )
        WHERE name IN ('Super Admin', 'Director / Owner', 'Corporate Manager', 'Location Manager', 'Shop Manager');
    """)

def import_from_sql(cur) -> bool:
    """Imports 1,657 item catalog from datasource_items.sql."""
    sql_file = find_file("datasource_items.sql")
    if not sql_file:
        return False

    print(f"[Import Datasource] Loading 1,657 item catalog from SQL dump: {sql_file}")
    with open(sql_file, "r", encoding="utf-8") as f:
        sql_content = f.read()

    cur.execute(sql_content)
    return True

def import_from_excel_files(cur) -> int:
    """Parses Excel files in datasource/ and imports records into admin_mod.items."""
    pkg_file = find_file("datasource/Bikanervala_Haldiram_Packaged_Foods.xlsx")
    menu_file = find_file("datasource/Bikanervala_Haldiram_Vegetarian_Menu.xlsx")

    if not pkg_file and not menu_file:
        print("[Import Datasource] Excel files not found in datasource/ directory.")
        return 0

    imported = 0

    # 1. Import Packaged Foods (Category: FG-Sweet) from both Bikanervala and Haldiram sheets
    if pkg_file:
        for sheet_name, sku_prefix in [("Bikanervala", "PKD-BKV"), ("Haldiram", "PKD-HAL")]:
            print(f"[Import Datasource] Parsing Packaged Foods [{sheet_name}] from {pkg_file}...")
            rows = parse_excel_sheet(pkg_file, sheet_name)
            # Header is row 6 (0-indexed)
            if len(rows) > 7:
                for idx, r in enumerate(rows[7:], start=1):
                    if len(r) < 4 or not r[1].strip():
                        continue
                    cat = r[0].strip() or "Packaged Foods"
                    name = r[1].strip()
                    pack_variant = r[2].strip() if len(r) > 2 else "Standard Pack"
                    raw_sell = r[4].strip() if len(r) > 4 else ""
                    raw_orig = r[3].strip() if len(r) > 3 else ""
                    price = 0.0
                    for candidate in (raw_sell, raw_orig):
                        if candidate:
                            try:
                                price = float(candidate)
                                if price > 0:
                                    break
                            except ValueError:
                                continue
                    if price <= 0:
                        price = 100.0
                    sku = f"{sku_prefix}-{idx:04d}"
                    display_name = f"{name} ({pack_variant})" if pack_variant and pack_variant not in name else name
                    cost_price = round(price * 0.65, 2)

                    cur.execute("""
                        INSERT INTO admin_mod.items (
                            sku, name, category, sub_category, purchase_uom, inventory_uom, pos_uom,
                            conversion_factor, hsn_code, gst_pct, selling_price, cost_price,
                            shelf_life_days, min_par_level, is_loose_weighed, kitchen_station, active, item_type
                        ) VALUES (
                            %s, %s, 'FG-Sweet', %s, 'Pack', 'Pack', 'Pack',
                            1.0, '2106', 5.00, %s, %s,
                            180, 20.0, false, 'Sweet Counter', true, 'Packaged Goods'
                        )
                        ON CONFLICT (sku) DO UPDATE SET
                            name = EXCLUDED.name,
                            selling_price = EXCLUDED.selling_price,
                            cost_price = EXCLUDED.cost_price,
                            sub_category = EXCLUDED.sub_category;
                    """, (sku, display_name, cat, price, cost_price))
                    imported += 1

    # 2. Import Vegetarian Restaurant Menu (Category: FG-Rest) from both Bikanervala and Haldiram sheets
    if menu_file:
        for sheet_name, sku_prefix in [("Bikanervala", "RST-BKV"), ("Haldiram", "RST-HAL")]:
            print(f"[Import Datasource] Parsing Vegetarian Menu [{sheet_name}] from {menu_file}...")
            rows = parse_excel_sheet(menu_file, sheet_name)
            if len(rows) > 6:
                for idx, r in enumerate(rows[6:], start=1):
                    if len(r) < 4 or not r[2].strip():
                        continue
                    source_id = r[0].strip() or f"{idx:04d}"
                    cat = r[1].strip() or "Restaurant"
                    name = r[2].strip()
                    try:
                        price = float(r[3].strip()) if r[3].strip() else 0.0
                    except ValueError:
                        price = 0.0
                    if price <= 0:
                        price = 120.0
                    sku = f"{sku_prefix}-{source_id}"[:30]
                    cost_price = round(price * 0.40, 2)

                    cur.execute("""
                        INSERT INTO admin_mod.items (
                            sku, name, category, sub_category, purchase_uom, inventory_uom, pos_uom,
                            conversion_factor, hsn_code, gst_pct, selling_price, cost_price,
                            shelf_life_days, min_par_level, is_loose_weighed, kitchen_station, active, item_type
                        ) VALUES (
                            %s, %s, 'FG-Rest', %s, 'Portion', 'Portion', 'Portion',
                            1.0, '9963', 5.00, %s, %s,
                            1, 10.0, false, 'Restaurant Kitchen', true, 'Prepared Food'
                        )
                        ON CONFLICT (sku) DO UPDATE SET
                            name = EXCLUDED.name,
                            selling_price = EXCLUDED.selling_price,
                            cost_price = EXCLUDED.cost_price,
                            sub_category = EXCLUDED.sub_category;
                    """, (sku, name, cat, price, cost_price))
                    imported += 1

    print(f"[Import Datasource] Successfully imported {imported} items from Excel sheets.")
    return imported

def main():
    parser = argparse.ArgumentParser(description="Import Bikanervala Datasource Catalog into Database")
    parser.add_argument("--force", action="store_true", help="Force import even if table already has items")
    parser.add_argument("--from-excel", action="store_true", help="Import directly from Excel .xlsx files instead of SQL dump")
    args = parser.parse_args()

    url = get_database_url()
    print(f"[Import Datasource] Connecting to database at {url.split('@')[-1] if '@' in url else url}...")

    with psycopg.connect(url, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute("SET client_encoding = 'UTF8';")

            # Update roles permissions first
            ensure_roles_permissions(cur)

            cur.execute("SELECT COUNT(*) FROM admin_mod.items;")
            count_before = cur.fetchone()[0]
            print(f"[Import Datasource] Current items count in database: {count_before}")

            if count_before >= 1000 and not args.force:
                print(f"[Import Datasource] Catalog already populated ({count_before} items present). Use --force to re-import.")
            else:
                if getattr(args, 'from_excel', False):
                    import_from_excel_files(cur)
                else:
                    success = import_from_sql(cur)
                    if not success:
                        print("[Import Datasource] SQL dump not found. Falling back to parsing Excel files...")
                        import_from_excel_files(cur)

                cur.execute("SELECT COUNT(*) FROM admin_mod.items;")
                count_after = cur.fetchone()[0]
                print(f"[Import Datasource] Finished! Total items: {count_after} (change: +{count_after - count_before})")

            # Print category breakdown
            cur.execute("""
                SELECT category, COUNT(*) 
                FROM admin_mod.items 
                GROUP BY category 
                ORDER BY count DESC;
            """)
            breakdown = cur.fetchall()
            print("[Import Datasource] Current catalog breakdown:")
            for cat, cnt in breakdown:
                print(f"  • {cat}: {cnt} items")

if __name__ == "__main__":
    main()
