-- Annavya Food Retail Chain ERP — Unified PostgreSQL Schema & Seed Data
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================================
-- 1. SCHEMAS (Modular Domain Isolation)
-- ==========================================
CREATE SCHEMA IF NOT EXISTS admin_mod;
CREATE SCHEMA IF NOT EXISTS vendor_mod;
CREATE SCHEMA IF NOT EXISTS stores_mod;
CREATE SCHEMA IF NOT EXISTS factory_mod;
CREATE SCHEMA IF NOT EXISTS oms_mod;
CREATE SCHEMA IF NOT EXISTS pos_mod;
CREATE SCHEMA IF NOT EXISTS kot_mod;

-- ==========================================
-- 2. ADMIN MODULE (Modules 8 & 11)
-- ==========================================
CREATE TABLE admin_mod.outlets (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    legal_name VARCHAR(180) NOT NULL,
    trade_name VARCHAR(150) NOT NULL,
    ownership_type VARCHAR(20) NOT NULL CHECK (ownership_type IN ('CO', 'Franchised', 'DO')),
    outlet_type VARCHAR(40) NOT NULL CHECK (outlet_type IN ('Restaurant', 'Sweet Shop', 'Restaurant + Sweet Shop', 'Manufacturing')),
    gstin VARCHAR(15) NOT NULL,
    gstn_verified BOOLEAN DEFAULT FALSE,
    gstn_reg_type VARCHAR(40) DEFAULT 'Regular',
    gstn_verified_at TIMESTAMPTZ,
    fssai_no VARCHAR(30) NOT NULL,
    fssai_expiry DATE NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(60) NOT NULL,
    state VARCHAR(60) NOT NULL,
    state_code VARCHAR(2) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    property_type VARCHAR(20) DEFAULT 'Leased',
    royalty_pct NUMERIC(5,2) DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE admin_mod.roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(60) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE admin_mod.users (
    id SERIAL PRIMARY KEY,
    emp_id VARCHAR(30) UNIQUE NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    email VARCHAR(120) NOT NULL,
    role_id INT REFERENCES admin_mod.roles(id),
    outlet_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
    pin VARCHAR(10) DEFAULT '1234',
    active BOOLEAN DEFAULT TRUE,
    last_active TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE admin_mod.items (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(140) NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('RM', 'WIP', 'FG-Sweet', 'FG-Rest', 'Packaging')),
    sub_category VARCHAR(60) NOT NULL,
    purchase_uom VARCHAR(20) NOT NULL,
    inventory_uom VARCHAR(20) NOT NULL,
    pos_uom VARCHAR(20) NOT NULL,
    conversion_factor NUMERIC(10,4) DEFAULT 1,
    hsn_code VARCHAR(12) NOT NULL,
    gst_pct NUMERIC(5,2) NOT NULL,
    selling_price NUMERIC(10,2) DEFAULT 0,
    cost_price NUMERIC(10,2) DEFAULT 0,
    shelf_life_days INT DEFAULT 30,
    min_par_level NUMERIC(10,2) DEFAULT 10,
    is_loose_weighed BOOLEAN DEFAULT FALSE,
    default_tare_grams NUMERIC(8,2) DEFAULT 0,
    kitchen_station VARCHAR(40),
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE admin_mod.boms (
    id SERIAL PRIMARY KEY,
    fg_sku VARCHAR(30) NOT NULL REFERENCES admin_mod.items(sku),
    fg_name VARCHAR(140) NOT NULL,
    output_qty NUMERIC(10,3) NOT NULL DEFAULT 1,
    output_uom VARCHAR(20) NOT NULL DEFAULT 'kg',
    expected_loss_pct NUMERIC(5,2) DEFAULT 2.0,
    version VARCHAR(16) DEFAULT 'v1.0',
    ingredients JSONB NOT NULL
);

CREATE TABLE admin_mod.system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(80) UNIQUE NOT NULL,
    config_value JSONB NOT NULL
);

CREATE TABLE admin_mod.audit_logs (
    id SERIAL PRIMARY KEY,
    module VARCHAR(40) NOT NULL,
    action VARCHAR(80) NOT NULL,
    actor VARCHAR(80) NOT NULL,
    outlet_code VARCHAR(20),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 3. VENDOR MODULE (Module 7)
-- ==========================================
CREATE TABLE vendor_mod.vendors (
    id SERIAL PRIMARY KEY,
    vendor_code VARCHAR(30) UNIQUE NOT NULL,
    legal_name VARCHAR(160) NOT NULL,
    trade_name VARCHAR(140) NOT NULL,
    contact_person VARCHAR(100) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    email VARCHAR(120) NOT NULL,
    pan VARCHAR(10) NOT NULL,
    gstin VARCHAR(15) NOT NULL,
    gstn_verified BOOLEAN DEFAULT TRUE,
    fssai_no VARCHAR(30) NOT NULL,
    fssai_expiry DATE NOT NULL,
    bank_account VARCHAR(40) NOT NULL,
    ifsc VARCHAR(20) NOT NULL,
    msme BOOLEAN DEFAULT FALSE,
    payment_terms VARCHAR(40) DEFAULT 'Net 15 Days',
    status VARCHAR(20) DEFAULT 'ACTIVE',
    regions JSONB NOT NULL DEFAULT '[]'::jsonb,
    quality_rating NUMERIC(3,1) DEFAULT 4.5,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vendor_mod.vendor_rm_mapping (
    id SERIAL PRIMARY KEY,
    vendor_code VARCHAR(30) NOT NULL,
    rm_sku VARCHAR(30) NOT NULL,
    rm_name VARCHAR(140) NOT NULL,
    priority_rank INT NOT NULL CHECK (priority_rank IN (1, 2, 3)),
    vendor_sku_code VARCHAR(40),
    moq NUMERIC(10,2) DEFAULT 10,
    uom VARCHAR(20) NOT NULL,
    lead_time_days INT DEFAULT 2,
    quality_score NUMERIC(3,1) DEFAULT 4.5
);

CREATE TABLE vendor_mod.price_masters (
    id SERIAL PRIMARY KEY,
    vendor_code VARCHAR(30) NOT NULL,
    rm_sku VARCHAR(30) NOT NULL,
    outlet_scope VARCHAR(40) DEFAULT 'ALL',
    rate_per_uom NUMERIC(10,2) NOT NULL,
    slab_min_qty NUMERIC(10,2) DEFAULT 100,
    slab_rate NUMERIC(10,2) NOT NULL,
    gst_pct NUMERIC(5,2) DEFAULT 5.0,
    freight_included BOOLEAN DEFAULT TRUE,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE DEFAULT (CURRENT_DATE + INTERVAL '180 days'),
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE vendor_mod.tenders (
    id SERIAL PRIMARY KEY,
    tender_no VARCHAR(30) UNIQUE NOT NULL,
    title VARCHAR(160) NOT NULL,
    rm_sku VARCHAR(30) NOT NULL,
    rm_name VARCHAR(140) NOT NULL,
    required_qty NUMERIC(10,2) NOT NULL,
    uom VARCHAR(20) NOT NULL,
    delivery_schedule VARCHAR(120),
    status VARCHAR(20) DEFAULT 'OPEN',
    awarded_vendor_code VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vendor_mod.tender_bids (
    id SERIAL PRIMARY KEY,
    tender_id INT REFERENCES vendor_mod.tenders(id) ON DELETE CASCADE,
    vendor_code VARCHAR(30) NOT NULL,
    vendor_name VARCHAR(140) NOT NULL,
    unit_rate NUMERIC(10,2) NOT NULL,
    gst_pct NUMERIC(5,2) DEFAULT 5.0,
    freight_cost NUMERIC(10,2) DEFAULT 0,
    credit_days INT DEFAULT 15,
    quality_score NUMERIC(3,1) DEFAULT 4.5,
    lead_time_days INT DEFAULT 2,
    sample_qc_passed BOOLEAN DEFAULT TRUE,
    landed_cost NUMERIC(12,2) NOT NULL,
    is_winner BOOLEAN DEFAULT FALSE
);

CREATE TABLE vendor_mod.purchase_orders (
    id SERIAL PRIMARY KEY,
    po_no VARCHAR(30) UNIQUE NOT NULL,
    vendor_code VARCHAR(30) NOT NULL,
    vendor_name VARCHAR(140) NOT NULL,
    outlet_code VARCHAR(20) NOT NULL,
    store_code VARCHAR(30) NOT NULL,
    status VARCHAR(30) DEFAULT 'ISSUED',
    items JSONB NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    invoice_no VARCHAR(40),
    invoice_amount NUMERIC(12,2),
    three_way_match_status VARCHAR(30) DEFAULT 'PENDING',
    qc_notes TEXT,
    created_by VARCHAR(80) DEFAULT 'Procurement Officer',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 4. STORES MODULE (Module 4)
-- ==========================================
CREATE TABLE stores_mod.stores (
    id SERIAL PRIMARY KEY,
    store_code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    outlet_code VARCHAR(20) NOT NULL,
    store_type VARCHAR(40) NOT NULL,
    temp_zone VARCHAR(20) NOT NULL CHECK (temp_zone IN ('Ambient', 'Chilled', 'Frozen')),
    capacity_kg NUMERIC(10,2) DEFAULT 5000,
    storekeeper VARCHAR(80) NOT NULL,
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE stores_mod.stock_batches (
    id SERIAL PRIMARY KEY,
    store_code VARCHAR(30) NOT NULL,
    sku VARCHAR(30) NOT NULL,
    item_name VARCHAR(140) NOT NULL,
    category VARCHAR(20) NOT NULL,
    batch_no VARCHAR(40) NOT NULL,
    qty NUMERIC(12,3) NOT NULL,
    uom VARCHAR(20) NOT NULL,
    unit_cost NUMERIC(10,2) NOT NULL,
    mfg_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    qc_status VARCHAR(20) DEFAULT 'PASSED',
    source_ref VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stores_mod.stock_movements (
    id SERIAL PRIMARY KEY,
    movement_no VARCHAR(40) UNIQUE NOT NULL,
    movement_type VARCHAR(30) NOT NULL,
    store_code VARCHAR(30) NOT NULL,
    target_store_code VARCHAR(30),
    sku VARCHAR(30) NOT NULL,
    batch_no VARCHAR(40),
    qty NUMERIC(12,3) NOT NULL,
    uom VARCHAR(20) NOT NULL,
    reason_code VARCHAR(80),
    ref_no VARCHAR(50),
    actor VARCHAR(80),
    eway_bill_no VARCHAR(40),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stores_mod.purchase_requisitions (
    id SERIAL PRIMARY KEY,
    pr_no VARCHAR(30) UNIQUE NOT NULL,
    store_code VARCHAR(30) NOT NULL,
    sku VARCHAR(30) NOT NULL,
    item_name VARCHAR(140) NOT NULL,
    requested_qty NUMERIC(10,2) NOT NULL,
    uom VARCHAR(20) NOT NULL,
    reason VARCHAR(160),
    status VARCHAR(20) DEFAULT 'OPEN',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 5. SWEET PRODUCTION FACTORY MODULE (Module 5)
-- ==========================================
CREATE TABLE factory_mod.production_orders (
    id SERIAL PRIMARY KEY,
    prod_no VARCHAR(30) UNIQUE NOT NULL,
    fg_sku VARCHAR(30) NOT NULL,
    fg_name VARCHAR(140) NOT NULL,
    sweet_line VARCHAR(40) NOT NULL,
    planned_qty NUMERIC(10,2) NOT NULL,
    actual_qty NUMERIC(10,2),
    uom VARCHAR(20) NOT NULL DEFAULT 'kg',
    source_type VARCHAR(30) NOT NULL,
    source_ref VARCHAR(50),
    kettle_line VARCHAR(40) DEFAULT 'Kettle Line A',
    shift VARCHAR(20) DEFAULT 'Morning Shift',
    status VARCHAR(30) DEFAULT 'Planned',
    expected_rm_cost NUMERIC(12,2) DEFAULT 0,
    actual_rm_cost NUMERIC(12,2) DEFAULT 0,
    labor_overhead NUMERIC(10,2) DEFAULT 0,
    yield_variance_pct NUMERIC(6,2) DEFAULT 0,
    batch_no VARCHAR(40),
    mfg_date DATE,
    expiry_date DATE,
    qc_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE factory_mod.wip_stages (
    id SERIAL PRIMARY KEY,
    prod_no VARCHAR(30) NOT NULL,
    stage_name VARCHAR(80) NOT NULL,
    input_sku VARCHAR(30) NOT NULL,
    input_qty NUMERIC(10,2) NOT NULL,
    output_sku VARCHAR(30) NOT NULL,
    output_qty NUMERIC(10,2) NOT NULL,
    yield_pct NUMERIC(5,2) NOT NULL,
    status VARCHAR(30) DEFAULT 'COMPLETED',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 6. OMS MODULE (Module 3)
-- ==========================================
CREATE TABLE oms_mod.bulk_orders (
    id SERIAL PRIMARY KEY,
    order_no VARCHAR(30) UNIQUE NOT NULL,
    order_type VARCHAR(30) NOT NULL CHECK (order_type IN ('Marriage', 'Corporate', 'Festival', 'Catering')),
    customer_name VARCHAR(120) NOT NULL,
    customer_mobile VARCHAR(20) NOT NULL,
    company_name VARCHAR(140),
    outlet_code VARCHAR(20) NOT NULL,
    delivery_date DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'ENQUIRY',
    assortment JSONB NOT NULL,
    branding_notes TEXT,
    bom_cost_total NUMERIC(12,2) NOT NULL,
    selling_total NUMERIC(12,2) NOT NULL,
    margin_pct NUMERIC(5,2) NOT NULL,
    advance_paid NUMERIC(12,2) DEFAULT 0,
    balance_due NUMERIC(12,2) NOT NULL,
    credit_limit NUMERIC(12,2) DEFAULT 0,
    production_req_no VARCHAR(30),
    dispatch_drops JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE oms_mod.oms_payments (
    id SERIAL PRIMARY KEY,
    order_no VARCHAR(30) NOT NULL,
    receipt_no VARCHAR(30) UNIQUE NOT NULL,
    stage VARCHAR(30) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    mode VARCHAR(30) NOT NULL,
    reference VARCHAR(80),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 7. RETAIL POS & SHOP MANAGER MODULE (Modules 1 & 2)
-- ==========================================
CREATE TABLE pos_mod.pos_orders (
    id SERIAL PRIMARY KEY,
    estimate_no VARCHAR(40) UNIQUE NOT NULL,
    invoice_no VARCHAR(40) UNIQUE,
    outlet_code VARCHAR(20) NOT NULL,
    mode VARCHAR(20) DEFAULT '3_COUNTER',
    status VARCHAR(30) DEFAULT 'ESTIMATE_GENERATED',
    items JSONB NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL,
    discount_type VARCHAR(30),
    discount_category VARCHAR(30),
    discount_amount NUMERIC(10,2) DEFAULT 0,
    discount_otp_id INT,
    cart_hash VARCHAR(32) NOT NULL,
    cgst NUMERIC(10,2) NOT NULL DEFAULT 0,
    sgst NUMERIC(10,2) NOT NULL DEFAULT 0,
    grand_total NUMERIC(12,2) NOT NULL,
    payment_splits JSONB DEFAULT '[]'::jsonb,
    estimate_staff VARCHAR(80) DEFAULT 'Counter Staff 1',
    cashier_id VARCHAR(80),
    delivery_staff VARCHAR(80),
    paid_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pos_mod.promos (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    rule_type VARCHAR(20) NOT NULL,
    value NUMERIC(10,2) NOT NULL,
    min_bill NUMERIC(10,2) DEFAULT 0,
    max_cap NUMERIC(10,2) DEFAULT 1000,
    stackable BOOLEAN DEFAULT FALSE,
    outlet_scope VARCHAR(40) DEFAULT 'ALL',
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE pos_mod.approvers (
    id SERIAL PRIMARY KEY,
    category VARCHAR(20) NOT NULL CHECK (category IN ('VIP', 'Owner', 'Employee', 'Vendor')),
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    max_pct NUMERIC(5,2) NOT NULL,
    monthly_quota NUMERIC(12,2) DEFAULT 50000,
    used_quota NUMERIC(12,2) DEFAULT 0
);

CREATE TABLE pos_mod.otp_requests (
    id SERIAL PRIMARY KEY,
    otp_code VARCHAR(6) NOT NULL,
    estimate_no VARCHAR(40) NOT NULL,
    outlet_code VARCHAR(20) NOT NULL,
    category VARCHAR(20) NOT NULL,
    beneficiary VARCHAR(100) NOT NULL,
    discount_pct NUMERIC(5,2) NOT NULL,
    discount_amount NUMERIC(10,2) NOT NULL,
    cart_hash VARCHAR(32) NOT NULL,
    approver_name VARCHAR(100) NOT NULL,
    approver_mobile VARCHAR(20) NOT NULL,
    sms_message TEXT NOT NULL,
    reason TEXT,
    attempts INT DEFAULT 0,
    status VARCHAR(30) DEFAULT 'PENDING',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pos_mod.shifts (
    id SERIAL PRIMARY KEY,
    shift_no VARCHAR(30) UNIQUE NOT NULL,
    outlet_code VARCHAR(20) NOT NULL,
    cashier_name VARCHAR(80) NOT NULL,
    opening_cash NUMERIC(10,2) DEFAULT 5000,
    system_cash_sales NUMERIC(10,2) DEFAULT 0,
    declared_cash NUMERIC(10,2),
    variance NUMERIC(10,2),
    status VARCHAR(20) DEFAULT 'OPEN',
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

CREATE TABLE pos_mod.outlet_indents (
    id SERIAL PRIMARY KEY,
    indent_no VARCHAR(30) UNIQUE NOT NULL,
    outlet_code VARCHAR(20) NOT NULL,
    sku VARCHAR(30) NOT NULL,
    item_name VARCHAR(140) NOT NULL,
    qty NUMERIC(10,2) NOT NULL,
    uom VARCHAR(20) NOT NULL,
    priority VARCHAR(20) DEFAULT 'NORMAL',
    status VARCHAR(20) DEFAULT 'REQUESTED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 8. KOT MODULE (Module 6)
-- ==========================================
CREATE TABLE kot_mod.dining_tables (
    id SERIAL PRIMARY KEY,
    outlet_code VARCHAR(20) NOT NULL,
    table_code VARCHAR(20) NOT NULL,
    section VARCHAR(40) NOT NULL,
    capacity INT NOT NULL DEFAULT 4,
    status VARCHAR(30) DEFAULT 'Available',
    current_pax INT DEFAULT 0,
    merged_with VARCHAR(20),
    UNIQUE(outlet_code, table_code)
);

CREATE TABLE kot_mod.kots (
    id SERIAL PRIMARY KEY,
    kot_no VARCHAR(30) UNIQUE NOT NULL,
    outlet_code VARCHAR(20) NOT NULL,
    table_code VARCHAR(20) NOT NULL,
    order_source VARCHAR(20) DEFAULT 'DINE_IN',
    captain_name VARCHAR(80) NOT NULL,
    items JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    void_reason TEXT,
    pos_invoice_no VARCHAR(40),
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 9. REALISTIC SEED DATA
-- ==========================================

-- Outlets (CO, Franchised, DO, Manufacturing)
INSERT INTO admin_mod.outlets (code, name, legal_name, trade_name, ownership_type, outlet_type, gstin, gstn_verified, gstn_reg_type, gstn_verified_at, fssai_no, fssai_expiry, address, city, state, state_code, pincode, property_type, royalty_pct) VALUES
('DEL01', 'Annavya Connaught Place Flagship', 'Annavya Foods Retail Pvt Ltd', 'Annavya Heritage Sweets', 'CO', 'Sweet Shop', '07AAACA5678A1ZY', TRUE, 'Regular', NOW(), '13324001000451', CURRENT_DATE + INTERVAL '240 days', 'Block B-14, Inner Circle, Connaught Place', 'New Delhi', 'Delhi', '07', '110001', 'Leased', 0),
('GUR02', 'Annavya CyberHub Grand', 'Annavya Foods Retail Pvt Ltd', 'Annavya Sweets & Kitchen', 'CO', 'Restaurant + Sweet Shop', '06AAACA5678A1Z0', TRUE, 'Regular', NOW(), '10824002000812', CURRENT_DATE + INTERVAL '310 days', 'Ground Floor, DLF CyberHub, Phase 2', 'Gurugram', 'Haryana', '06', '122002', 'Leased', 0),
('JAI03', 'Annavya MI Road Jaipur', 'Rajputana Hospitality Ventures LLP', 'Annavya Jaipur', 'Franchised', 'Restaurant + Sweet Shop', '08AABCF9012B1Z4', TRUE, 'Regular', NOW(), '12224003000199', CURRENT_DATE + INTERVAL '45 days', '42, Mirza Ismail Road, Panch Batti', 'Jaipur', 'Rajasthan', '08', '302001', 'Owned', 6.50),
('NOI04', 'Annavya Sector 18 Dine-In', 'Annavya Directors Hospitality Pvt Ltd', 'Annavya Bistro', 'DO', 'Restaurant', '09AAACD3456C1ZZ', TRUE, 'Regular', NOW(), '12724004000511', CURRENT_DATE + INTERVAL '190 days', 'Plot G-12, Sector 18 Market', 'Noida', 'Uttar Pradesh', '09', '201301', 'Owned', 0),
('MFG01', 'Annavya Central Sweet Factory', 'Annavya Foods Retail Pvt Ltd', 'Annavya Central Kitchen & Mithai Plant', 'CO', 'Manufacturing', '06AAACA5678A1Z0', TRUE, 'Regular', NOW(), '10824002000101', CURRENT_DATE + INTERVAL '420 days', 'Plot 88, IMT Manesar Sector 7', 'Gurugram', 'Haryana', '06', '122050', 'Owned', 0);

-- Roles with RBAC Permissions
INSERT INTO admin_mod.roles (name, description, permissions) VALUES
('Super Admin', 'Full enterprise access across all CO, Franchised, DO & Factory modules', '{"modules":["executive","pos","rest_pos","shop","oms","stores","factory","kot","vendor","admin","reports"],"pos":{"view":true,"create":true,"void":true,"reprint":true,"max_discount_pct":100},"rest_pos":{"view":true,"create":true,"void":true,"reprint":true,"max_discount_pct":100},"shop":{"view":true,"approve":true},"stores":{"view":true,"create":true},"factory":{"view":true,"create":true,"approve":true},"oms":{"view":true,"create":true,"approve":true},"kot":{"view":true,"create":true,"void":true},"vendor":{"view":true,"create":true,"approve":true},"admin":{"view":true,"create":true,"edit":true},"executive":{"view":true},"reports":{"view":true},"cost_visibility":true}'::jsonb),
('Director / Owner', 'CXO / Owner executive insights, OTP approvals and multi-entity financials', '{"modules":["executive","pos","rest_pos","shop","oms","stores","factory","kot","vendor","reports"],"pos":{"view":true,"create":true,"void":true,"reprint":true,"max_discount_pct":100},"rest_pos":{"view":true,"create":true,"void":true,"reprint":true,"max_discount_pct":100},"shop":{"view":true,"approve":true},"stores":{"view":true},"factory":{"view":true,"approve":true},"oms":{"view":true,"approve":true},"kot":{"view":true},"vendor":{"view":true,"approve":true},"admin":{"view":false},"executive":{"view":true},"reports":{"view":true},"cost_visibility":true}'::jsonb),
('Shop Manager', 'Outlet inventory, POS oversight, promo creation & SMS OTP approvals', '{"modules":["pos","rest_pos","shop","oms","stores","kot","reports"],"pos":{"view":true,"create":true,"void":true,"reprint":true,"max_discount_pct":25},"rest_pos":{"view":true,"create":true,"void":true,"reprint":true,"max_discount_pct":25},"shop":{"view":true,"approve":true},"stores":{"view":true,"create":true},"factory":{"view":false},"oms":{"view":true,"create":true},"kot":{"view":true,"void":true},"vendor":{"view":false},"admin":{"view":false},"executive":{"view":false},"reports":{"view":true},"cost_visibility":false}'::jsonb),
('Cashier', 'Sweet Retail POS billing, hotkeys, touch screen, cash drawer & shop stock alerts', '{"modules":["pos"],"pos":{"view":true,"create":true,"void":false,"reprint":true,"max_discount_pct":5},"shop":{"view":false},"stores":{"view":false},"factory":{"view":false},"oms":{"view":false},"kot":{"view":false},"vendor":{"view":false},"admin":{"view":false},"executive":{"view":false},"reports":{"view":false},"cost_visibility":false}'::jsonb),
('Production Manager', 'Central sweet factory batch scheduling, yield variance & QC', '{"modules":["factory","stores","oms","reports"],"pos":{"view":false},"shop":{"view":false},"stores":{"view":true},"factory":{"view":true,"create":true,"approve":true},"oms":{"view":true},"kot":{"view":false},"vendor":{"view":false},"admin":{"view":false},"executive":{"view":false},"reports":{"view":true},"cost_visibility":true}'::jsonb),
('Storekeeper', 'Multi-store GRN, FEFO batch control & BOM issue to factory', '{"modules":["stores","factory","vendor","reports"],"pos":{"view":false},"shop":{"view":false},"stores":{"view":true,"create":true},"factory":{"view":true},"oms":{"view":false},"kot":{"view":false},"vendor":{"view":true},"admin":{"view":false},"executive":{"view":false},"reports":{"view":true},"cost_visibility":false}'::jsonb),
('Kitchen Captain', 'Dine-in table map, KOT firing, Restaurant POS billing & kitchen station coordination', '{"modules":["kot","rest_pos"],"pos":{"view":false},"rest_pos":{"view":true,"create":true,"void":false},"shop":{"view":false},"stores":{"view":false},"factory":{"view":false},"oms":{"view":false},"kot":{"view":true,"create":true,"void":false},"vendor":{"view":false},"admin":{"view":false},"executive":{"view":false},"reports":{"view":false},"cost_visibility":false}'::jsonb),
('Procurement Officer', 'Vendor onboarding, Price Master, Tendering/RFQ & PO issuance', '{"modules":["vendor","stores","reports"],"pos":{"view":false},"shop":{"view":false},"stores":{"view":true},"factory":{"view":false},"oms":{"view":false},"kot":{"view":false},"vendor":{"view":true,"create":true,"approve":true},"admin":{"view":false},"executive":{"view":false},"reports":{"view":true},"cost_visibility":true}'::jsonb),
('Restaurant Cashier', 'Dedicated Restaurant POS billing, table settlement & restaurant kitchen stock/alerts', '{"modules":["rest_pos"],"rest_pos":{"view":true,"create":true,"void":false,"reprint":true,"max_discount_pct":5},"cost_visibility":false}'::jsonb);

-- Users
INSERT INTO admin_mod.users (emp_id, full_name, mobile, email, role_id, outlet_codes, pin) VALUES
('EMP-001', 'Rajeshwar Agarwal', '+91-9811000001', 'rajeshwar@annavya.in', 2, '["DEL01","GUR02","JAI03","NOI04","MFG01"]'::jsonb, '9001'),
('EMP-002', 'Meera Kapoor', '+91-9811000002', 'meera.admin@annavya.in', 1, '["DEL01","GUR02","JAI03","NOI04","MFG01"]'::jsonb, '1111'),
('EMP-003', 'Vikram Sethi', '+91-9811000003', 'vikram.del01@annavya.in', 3, '["DEL01"]'::jsonb, '2222'),
('EMP-004', 'Priya Sharma', '+91-9811000004', 'priya.pos@annavya.in', 4, '["DEL01","GUR02"]'::jsonb, '3333'),
('EMP-005', 'Suresh Halwai', '+91-9811000005', 'suresh.mfg@annavya.in', 5, '["MFG01"]'::jsonb, '4444'),
('EMP-006', 'Ramesh Yadav', '+91-9811000006', 'ramesh.stores@annavya.in', 6, '["MFG01","DEL01","GUR02"]'::jsonb, '5555'),
('EMP-007', 'Arjun Negi', '+91-9811000007', 'arjun.kot@annavya.in', 7, '["GUR02","NOI04"]'::jsonb, '6666'),
('EMP-008', 'Kavita Verma', '+91-9811000008', 'kavita.proc@annavya.in', 8, '["MFG01","DEL01","GUR02"]'::jsonb, '7777'),
('EMP-009', 'Neha Rawat', '+91-9811000009', 'neha.restpos@annavya.in', 9, '["GUR02","NOI04"]'::jsonb, '8888');

-- Items / SKU Catalog (RM, WIP, FG-Sweet, FG-Rest, Packaging)
INSERT INTO admin_mod.items (sku, name, category, sub_category, purchase_uom, inventory_uom, pos_uom, conversion_factor, hsn_code, gst_pct, selling_price, cost_price, shelf_life_days, min_par_level, is_loose_weighed, default_tare_grams, kitchen_station) VALUES
-- Raw Materials
('RM-MILK-01', 'Fresh Cow Milk (Full Cream)', 'RM', 'Dairy', 'Can 40L', 'L', 'ml', 1000, '0401', 0, 0, 56.00, 2, 300, FALSE, 0, NULL),
('RM-SUG-01', 'Refined Sulphur-Free Sugar', 'RM', 'Sweeteners', 'Bag 50kg', 'kg', 'g', 1000, '1701', 5, 0, 44.00, 365, 250, FALSE, 0, NULL),
('RM-GHEE-01', 'A2 Bilona Desi Ghee', 'RM', 'Dairy', 'Tin 15kg', 'kg', 'g', 1000, '0405', 12, 0, 620.00, 180, 120, FALSE, 0, NULL),
('RM-KAJU-01', 'Whole Cashew W240 Grade', 'RM', 'Dry Fruits', 'Tin 10kg', 'kg', 'g', 1000, '0801', 12, 0, 840.00, 180, 80, FALSE, 0, NULL),
('RM-PISTA-01', 'Iranian Roasted Pistachio', 'RM', 'Dry Fruits', 'Box 5kg', 'kg', 'g', 1000, '0802', 12, 0, 1280.00, 180, 30, FALSE, 0, NULL),
('RM-BESAN-01', 'Chana Dal Fine Besan', 'RM', 'Flours', 'Bag 25kg', 'kg', 'g', 1000, '1106', 5, 0, 92.00, 90, 150, FALSE, 0, NULL),
('RM-CITR-01', 'Food Grade Citric Acid', 'RM', 'Additives', 'Pack 1kg', 'kg', 'g', 1000, '2918', 18, 0, 180.00, 365, 10, FALSE, 0, NULL),
('RM-ROSE-01', 'Kannauj Rose Water & Cardamom Mix', 'RM', 'Flavoring', 'Bottle 1L', 'kg', 'g', 1000, '3302', 18, 0, 950.00, 365, 8, FALSE, 0, NULL),
('RM-PANEER-01', 'Fresh Malai Paneer', 'RM', 'Dairy', 'Crate 10kg', 'kg', 'g', 1000, '0406', 5, 0, 340.00, 4, 40, FALSE, 0, NULL),
('RM-TOM-01', 'Hybrid Tomato Puree Base', 'RM', 'Vegetables', 'Crate 20kg', 'kg', 'g', 1000, '0702', 0, 0, 48.00, 7, 60, FALSE, 0, NULL),
-- Packaging
('PKG-RAS-1K', '1kg Leak-Proof Rasgulla Container', 'Packaging', 'Boxes', 'Pack 50pcs', 'pcs', 'pcs', 1, '3923', 18, 0, 18.00, 730, 200, FALSE, 0, NULL),
('PKG-BOX-500', '500g Royal Gold Sweet Box', 'Packaging', 'Boxes', 'Pack 50pcs', 'pcs', 'pcs', 1, '4819', 12, 0, 24.00, 730, 300, FALSE, 0, NULL),
('PKG-BOX-1K', '1kg Heritage Gift Box', 'Packaging', 'Boxes', 'Pack 25pcs', 'pcs', 'pcs', 1, '4819', 12, 0, 42.00, 730, 150, FALSE, 0, NULL),
('PKG-BAG-01', 'Annavya Eco Carry Bag', 'Packaging', 'Bags', 'Pack 100pcs', 'pcs', 'pcs', 1, '4819', 12, 10.00, 6.00, 730, 500, FALSE, 0, NULL),
-- Semi-Finished / WIP
('WIP-CHHENA', 'Fresh Soft Chhena', 'WIP', 'Milk Sweets', 'kg', 'kg', 'kg', 1, '0406', 5, 0, 290.00, 2, 30, FALSE, 0, NULL),
('WIP-KHOYA', 'Slow-Simmered Danedar Khoya', 'WIP', 'Milk Sweets', 'kg', 'kg', 'kg', 1, '0402', 5, 0, 340.00, 4, 40, FALSE, 0, NULL),
-- Finished Goods — Sweets & Namkeen (FG-Sweet)
('FG-RAS-01', 'Spongy White Rasgulla', 'FG-Sweet', 'Milk Sweets', 'Tray 5kg', 'kg', 'kg', 1, '2106', 5, 480.00, 225.00, 3, 25, TRUE, 45, 'Sweet Counter'),
('FG-KAJU-01', 'Royal Silver-Leaf Kaju Katli', 'FG-Sweet', 'Dry Fruit Sweets', 'Tray 5kg', 'kg', 'kg', 1, '2106', 5, 1180.00, 610.00, 15, 20, TRUE, 55, 'Sweet Counter'),
('FG-BESAN-01', 'Desi Ghee Besan Laddu', 'FG-Sweet', 'Ghee Sweets', 'Tray 5kg', 'kg', 'kg', 1, '2106', 5, 680.00, 310.00, 21, 20, TRUE, 50, 'Sweet Counter'),
('FG-GULAB-01', 'Hot Kesar Gulab Jamun', 'FG-Sweet', 'Milk Sweets', 'Tray 5kg', 'kg', 'kg', 1, '2106', 5, 520.00, 240.00, 4, 20, TRUE, 45, 'Sweet Counter'),
('FG-MOTI-01', 'Shahi Motichoor Laddu', 'FG-Sweet', 'Ghee Sweets', 'Tray 5kg', 'kg', 'kg', 1, '2106', 5, 640.00, 295.00, 7, 18, TRUE, 50, 'Sweet Counter'),
('FG-BHJ-01', 'Bikaneri Masala Bhujia (400g Pack)', 'FG-Sweet', 'Namkeen', 'Box 20pcs', 'pcs', 'pcs', 1, '2106', 12, 160.00, 82.00, 60, 40, FALSE, 0, 'Sweet Counter'),
-- Menu Items — Restaurant (FG-Rest)
('RST-CHAAT-01', 'Annavya Special Raj Kachori', 'FG-Rest', 'Chaat', 'Plate', 'pcs', 'pcs', 1, '9963', 5, 185.00, 62.00, 1, 0, FALSE, 0, 'Chaat'),
('RST-CHAAT-02', 'Dilli Crispy Aloo Tikki Chaat', 'FG-Rest', 'Chaat', 'Plate', 'pcs', 'pcs', 1, '9963', 5, 145.00, 48.00, 1, 0, FALSE, 0, 'Chaat'),
('RST-TAND-01', 'Paneer Lababdar + 2 Butter Naan', 'FG-Rest', 'North Indian', 'Combo', 'pcs', 'pcs', 1, '9963', 5, 395.00, 138.00, 1, 0, FALSE, 0, 'Tandoor'),
('RST-TAND-02', 'Dal Makhani Bukhara Style', 'FG-Rest', 'North Indian', 'Bowl', 'pcs', 'pcs', 1, '9963', 5, 320.00, 96.00, 1, 0, FALSE, 0, 'Tandoor'),
('RST-SOUTH-01', 'Ghee Roast Masala Dosa', 'FG-Rest', 'South Indian', 'Plate', 'pcs', 'pcs', 1, '9963', 5, 225.00, 68.00, 1, 0, FALSE, 0, 'South Indian'),
('RST-BEV-01', 'Kesar Badam Thandai / Kulhad Lassi', 'FG-Rest', 'Beverages', 'Glass', 'pcs', 'pcs', 1, '9963', 5, 135.00, 42.00, 1, 0, FALSE, 0, 'Beverages');

-- BOM Definitions (including exact 1kg Rasgulla BOM from spec!)
INSERT INTO admin_mod.boms (fg_sku, fg_name, output_qty, output_uom, expected_loss_pct, version, ingredients) VALUES
('FG-RAS-01', 'Spongy White Rasgulla', 1.0, 'kg', 3.5, 'v2.1', '[
  {"rm_sku":"RM-MILK-01","rm_name":"Fresh Cow Milk (Full Cream)","qty":5.0,"uom":"L","is_packaging":false,"substitute_sku":null},
  {"rm_sku":"RM-SUG-01","rm_name":"Refined Sulphur-Free Sugar","qty":1.2,"uom":"kg","is_packaging":false,"substitute_sku":null},
  {"rm_sku":"RM-CITR-01","rm_name":"Food Grade Citric Acid","qty":0.015,"uom":"kg","is_packaging":false,"substitute_sku":null},
  {"rm_sku":"RM-ROSE-01","rm_name":"Kannauj Rose Water & Cardamom Mix","qty":0.005,"uom":"kg","is_packaging":false,"substitute_sku":null},
  {"rm_sku":"PKG-RAS-1K","rm_name":"1kg Leak-Proof Rasgulla Container","qty":1.0,"uom":"pcs","is_packaging":true,"substitute_sku":null}
]'::jsonb),
('FG-KAJU-01', 'Royal Silver-Leaf Kaju Katli', 1.0, 'kg', 1.5, 'v1.4', '[
  {"rm_sku":"RM-KAJU-01","rm_name":"Whole Cashew W240 Grade","qty":0.68,"uom":"kg","is_packaging":false,"substitute_sku":null},
  {"rm_sku":"RM-SUG-01","rm_name":"Refined Sulphur-Free Sugar","qty":0.42,"uom":"kg","is_packaging":false,"substitute_sku":null},
  {"rm_sku":"RM-GHEE-01","rm_name":"A2 Bilona Desi Ghee","qty":0.03,"uom":"kg","is_packaging":false,"substitute_sku":null},
  {"rm_sku":"RM-ROSE-01","rm_name":"Kannauj Rose Water & Cardamom Mix","qty":0.004,"uom":"kg","is_packaging":false,"substitute_sku":null},
  {"rm_sku":"PKG-BOX-1K","rm_name":"1kg Heritage Gift Box","qty":1.0,"uom":"pcs","is_packaging":true,"substitute_sku":"PKG-BOX-500"}
]'::jsonb),
('FG-BESAN-01', 'Desi Ghee Besan Laddu', 1.0, 'kg', 2.0, 'v1.2', '[
  {"rm_sku":"RM-BESAN-01","rm_name":"Chana Dal Fine Besan","qty":0.48,"uom":"kg","is_packaging":false,"substitute_sku":null},
  {"rm_sku":"RM-GHEE-01","rm_name":"A2 Bilona Desi Ghee","qty":0.32,"uom":"kg","is_packaging":false,"substitute_sku":null},
  {"rm_sku":"RM-SUG-01","rm_name":"Refined Sulphur-Free Sugar","qty":0.38,"uom":"kg","is_packaging":false,"substitute_sku":null},
  {"rm_sku":"RM-PISTA-01","rm_name":"Iranian Roasted Pistachio","qty":0.02,"uom":"kg","is_packaging":false,"substitute_sku":null},
  {"rm_sku":"PKG-BOX-1K","rm_name":"1kg Heritage Gift Box","qty":1.0,"uom":"pcs","is_packaging":true,"substitute_sku":null}
]'::jsonb),
('FG-GULAB-01', 'Hot Kesar Gulab Jamun', 1.0, 'kg', 2.5, 'v1.0', '[
  {"rm_sku":"RM-MILK-01","rm_name":"Fresh Cow Milk (Full Cream)","qty":2.8,"uom":"L","is_packaging":false,"substitute_sku":null},
  {"rm_sku":"RM-SUG-01","rm_name":"Refined Sulphur-Free Sugar","qty":0.9,"uom":"kg","is_packaging":false,"substitute_sku":null},
  {"rm_sku":"RM-GHEE-01","rm_name":"A2 Bilona Desi Ghee","qty":0.18,"uom":"kg","is_packaging":false,"substitute_sku":null},
  {"rm_sku":"PKG-RAS-1K","rm_name":"1kg Leak-Proof Rasgulla Container","qty":1.0,"uom":"pcs","is_packaging":true,"substitute_sku":null}
]'::jsonb),
('RST-TAND-01', 'Paneer Lababdar + 2 Butter Naan', 1.0, 'pcs', 1.0, 'v1.0', '[
  {"rm_sku":"RM-PANEER-01","rm_name":"Fresh Malai Paneer","qty":0.18,"uom":"kg","is_packaging":false,"substitute_sku":null},
  {"rm_sku":"RM-TOM-01","rm_name":"Hybrid Tomato Puree Base","qty":0.22,"uom":"kg","is_packaging":false,"substitute_sku":null},
  {"rm_sku":"RM-GHEE-01","rm_name":"A2 Bilona Desi Ghee","qty":0.03,"uom":"kg","is_packaging":false,"substitute_sku":null}
]'::jsonb);

-- System Config
INSERT INTO admin_mod.system_config (config_key, config_value) VALUES
('thermal_printers', '{"estimate_counter":{"model":"Epson TM-T82III 58mm","columns":40,"interface":"WebUSB / ESC-POS","auto_cut":true},"cash_counter":{"model":"Epson TM-T82III 58mm","columns":40,"interface":"Network 192.168.1.41:9100","cash_drawer_kick":true},"kot_stations":{"chaat":"192.168.1.51:9100","tandoor":"192.168.1.52:9100","south_indian":"KDS Tablet #2"}}'::jsonb),
('sms_gateway', '{"provider":"MSG91 Enterprise DLT","sender_id":"ANAVYA","dlt_entity_id":"1101589230000048210","otp_template":"OTP {#var#} for {#var#} Discount Rs.{#var#} on Est {#var#} at Outlet {#var#}. Valid 5 mins. - Annavya","otp_ttl_seconds":300,"max_retries":3}'::jsonb),
('doc_series', '{"fiscal_year":"2026-27","estimate_prefix":"EST","invoice_prefix":"INV","po_prefix":"PO","grn_prefix":"GRN","prod_prefix":"PRD","oms_prefix":"OMS","kot_prefix":"KOT"}'::jsonb),
('pos_hardware_drivers', '{"active_printer_driver":"Epson TM-T82III (ESC/POS 58mm)","connection_mode":"WebUSB / Local Spooler","network_ip":"192.168.1.41:9100","paper_width":"40-Column (58mm)","auto_cut":true,"touch_screen_mode":true,"enable_hotkeys":true,"cash_drawer":{"enabled":true,"kick_pin":"Pin 2 (RJ11 via Printer)","pulse_ms":120,"open_on_cash_sale":true,"open_on_shift_close":true,"require_pin_manual_open":false,"manual_open_pin":"2222"},"restaurant_printer":{"driver":"Star Micronics TSP143III (StarPRNT 80mm)","network_ip":"192.168.1.42:9100","auto_kot_split":true},"weighing_scale":{"driver":"Essae DS-852 (RS232 / WebSerial)","baud_rate":9600,"auto_tare":true},"barcode_scanner":{"driver":"Honeywell Voyager 1200g (USB-HID Wedge)","prefix_suffix_crlf":true}}'::jsonb);

-- Vendors
INSERT INTO vendor_mod.vendors (vendor_code, legal_name, trade_name, contact_person, mobile, email, pan, gstin, gstn_verified, fssai_no, fssai_expiry, bank_account, ifsc, msme, payment_terms, status, regions, quality_rating) VALUES
('VND-001', 'Kamadhenu Dairy Cooperatives Ltd', 'Kamadhenu Fresh Milk', 'Harish Choudhary', '+91-9810112233', 'supply@kamadhenudairy.in', 'AADCM1111D', '07AADCM1111D1Z9', TRUE, '10023011001234', CURRENT_DATE + INTERVAL '220 days', '409100028371', 'HDFC0001204', FALSE, 'Net 7 Days', 'ACTIVE', '["Delhi NCR","Haryana"]'::jsonb, 4.8),
('VND-002', 'Brijbhoomi Sugar & Agro Mills Pvt Ltd', 'Brijbhoomi Sugars', 'Alok Mittal', '+91-9810223344', 'orders@brijbhoomisugar.in', 'AABCS2222E', '06AABCS2222E1ZZ', TRUE, '10823022009811', CURRENT_DATE + INTERVAL '35 days', '502000182734', 'ICIC0000412', TRUE, 'Net 15 Days', 'ACTIVE', '["Delhi NCR","Haryana","UP"]'::jsonb, 4.6),
('VND-003', 'Vedic Bilona Ghee & Dairy Pvt Ltd', 'Vedic A2 Ghee', 'Sunita Rathore', '+91-9829334455', 'b2b@vedicghee.in', 'AAACG3333F', '07AAACG3333F1Z2', TRUE, '13323033004422', CURRENT_DATE + INTERVAL '180 days', '918020048123', 'UTIB0000811', TRUE, 'Net 15 Days', 'ACTIVE', '["Delhi NCR","Rajasthan"]'::jsonb, 4.9),
('VND-004', 'Kishangarh Dry Fruits & Spices LLP', 'Kishangarh Cashew Impex', 'Nitin Bhandari', '+91-9829445566', 'trade@kishangarhdryfruits.in', 'AAACD4444G', '08AAACD4444G1ZV', TRUE, '12223044007711', CURRENT_DATE + INTERVAL '140 days', '309182736451', 'SBIN0004412', FALSE, 'Net 30 Days', 'ACTIVE', '["Delhi NCR","Rajasthan","Haryana"]'::jsonb, 4.4),
('VND-005', 'PackCraft Heritage Cartons Pvt Ltd', 'PackCraft India', 'Deepak Jain', '+91-9818556677', 'sales@packcraft.in', 'AAACP5555H', '09AAACP5555H1Z9', TRUE, '12723055003388', CURRENT_DATE + INTERVAL '300 days', '110029384756', 'KKBK0000192', TRUE, 'Net 30 Days', 'ACTIVE', '["All India"]'::jsonb, 4.7);

INSERT INTO vendor_mod.vendor_rm_mapping (vendor_code, rm_sku, rm_name, priority_rank, vendor_sku_code, moq, uom, lead_time_days, quality_score) VALUES
('VND-001', 'RM-MILK-01', 'Fresh Cow Milk (Full Cream)', 1, 'KD-FCM-40', 200, 'L', 1, 4.8),
('VND-003', 'RM-GHEE-01', 'A2 Bilona Desi Ghee', 1, 'VG-A2-15', 30, 'kg', 2, 4.9),
('VND-002', 'RM-SUG-01', 'Refined Sulphur-Free Sugar', 1, 'BS-SF-50', 250, 'kg', 2, 4.6),
('VND-004', 'RM-KAJU-01', 'Whole Cashew W240 Grade', 1, 'KDF-W240', 50, 'kg', 3, 4.4),
('VND-004', 'RM-PISTA-01', 'Iranian Roasted Pistachio', 1, 'KDF-PST', 20, 'kg', 3, 4.5),
('VND-005', 'PKG-RAS-1K', '1kg Leak-Proof Rasgulla Container', 1, 'PC-RAS1K', 200, 'pcs', 4, 4.7),
('VND-005', 'PKG-BOX-1K', '1kg Heritage Gift Box', 1, 'PC-HGB1K', 100, 'pcs', 5, 4.8);

INSERT INTO vendor_mod.price_masters (vendor_code, rm_sku, outlet_scope, rate_per_uom, slab_min_qty, slab_rate, gst_pct, freight_included) VALUES
('VND-001', 'RM-MILK-01', 'ALL', 56.00, 500, 53.50, 0, TRUE),
('VND-002', 'RM-SUG-01', 'ALL', 44.00, 500, 42.00, 5, TRUE),
('VND-003', 'RM-GHEE-01', 'ALL', 620.00, 150, 595.00, 12, TRUE),
('VND-004', 'RM-KAJU-01', 'ALL', 840.00, 100, 810.00, 12, FALSE),
('VND-005', 'PKG-RAS-1K', 'ALL', 18.00, 1000, 16.50, 18, TRUE);

INSERT INTO vendor_mod.tenders (tender_no, title, rm_sku, rm_name, required_qty, uom, delivery_schedule, status) VALUES
('RFQ-2026-101', 'Festive Season W240 Cashew Annual Contract', 'RM-KAJU-01', 'Whole Cashew W240 Grade', 2500, 'kg', '500 kg weekly across IMT Manesar', 'EVALUATION');

INSERT INTO vendor_mod.tender_bids (tender_id, vendor_code, vendor_name, unit_rate, gst_pct, freight_cost, credit_days, quality_score, lead_time_days, sample_qc_passed, landed_cost, is_winner) VALUES
(1, 'VND-004', 'Kishangarh Cashew Impex', 825.00, 12, 12000, 30, 4.6, 3, TRUE, 2322000.00, FALSE),
(1, 'VND-002', 'Brijbhoomi Sugars (Dry Fruit Div)', 840.00, 12, 0, 15, 4.2, 4, TRUE, 2352000.00, FALSE),
(1, 'VND-003', 'Vedic A2 Ghee & Agro Traders', 810.00, 12, 8500, 21, 4.8, 2, TRUE, 2276500.00, FALSE);

INSERT INTO vendor_mod.purchase_orders (po_no, vendor_code, vendor_name, outlet_code, store_code, status, items, total_amount, three_way_match_status) VALUES
('PO-2026-0041', 'VND-001', 'Kamadhenu Fresh Milk', 'MFG01', 'STR-MFG-COLD', 'ISSUED', '[{"sku":"RM-MILK-01","name":"Fresh Cow Milk (Full Cream)","qty":600,"uom":"L","rate":53.50,"gst_pct":0}]'::jsonb, 32100.00, 'PENDING'),
('PO-2026-0042', 'VND-003', 'Vedic A2 Ghee', 'MFG01', 'STR-MFG-RM', 'GRN_COMPLETED', '[{"sku":"RM-GHEE-01","name":"A2 Bilona Desi Ghee","qty":150,"uom":"kg","rate":595.00,"gst_pct":12}]'::jsonb, 99960.00, 'MATCHED');

-- Stores
INSERT INTO stores_mod.stores (store_code, name, outlet_code, store_type, temp_zone, capacity_kg, storekeeper) VALUES
('STR-MFG-RM', 'Factory Dry Raw Material Store', 'MFG01', 'Factory RM', 'Ambient', 25000, 'Ramesh Yadav'),
('STR-MFG-COLD', 'Factory Chilled Dairy & Mithai Cold Room', 'MFG01', 'Cold Room', 'Chilled', 12000, 'Ramesh Yadav'),
('STR-DEL01-BACK', 'CP Flagship Sweet Back-Store & Counter', 'DEL01', 'Outlet Back-Store', 'Chilled', 2500, 'Vikram Sethi'),
('STR-GUR02-BACK', 'CyberHub Hybrid Back-Store', 'GUR02', 'Outlet Back-Store', 'Chilled', 3000, 'Arjun Negi'),
('STR-JAI03-BACK', 'Jaipur Franchise Store', 'JAI03', 'Outlet Back-Store', 'Chilled', 2200, 'Mahesh Sharma');

-- Stock Batches (Notice near-expiry 1-day & 2-day batches + low stock for intelligent alerts!)
INSERT INTO stores_mod.stock_batches (store_code, sku, item_name, category, batch_no, qty, uom, unit_cost, mfg_date, expiry_date, qc_status, source_ref) VALUES
('STR-MFG-COLD', 'RM-MILK-01', 'Fresh Cow Milk (Full Cream)', 'RM', 'B-MLK-1111', 420.0, 'L', 53.50, CURRENT_DATE - 1, CURRENT_DATE + 1, 'PASSED', 'GRN-0098'),
('STR-MFG-COLD', 'RM-MILK-01', 'Fresh Cow Milk (Full Cream)', 'RM', 'B-MLK-1112', 550.0, 'L', 53.50, CURRENT_DATE, CURRENT_DATE + 2, 'PASSED', 'GRN-0102'),
('STR-MFG-RM', 'RM-SUG-01', 'Refined Sulphur-Free Sugar', 'RM', 'B-SUG-101', 680.0, 'kg', 42.00, CURRENT_DATE - 15, CURRENT_DATE + 300, 'PASSED', 'GRN-0077'),
('STR-MFG-RM', 'RM-GHEE-01', 'A2 Bilona Desi Ghee', 'RM', 'B-GHE-204', 185.0, 'kg', 595.00, CURRENT_DATE - 10, CURRENT_DATE + 170, 'PASSED', 'GRN-0099'),
('STR-MFG-RM', 'RM-KAJU-01', 'Whole Cashew W240 Grade', 'RM', 'B-KJU-09', 48.0, 'kg', 840.00, CURRENT_DATE - 20, CURRENT_DATE + 150, 'PASSED', 'GRN-0065'),
('STR-MFG-RM', 'RM-PISTA-01', 'Iranian Roasted Pistachio', 'RM', 'B-PST-03', 14.0, 'kg', 1280.00, CURRENT_DATE - 25, CURRENT_DATE + 140, 'PASSED', 'GRN-0059'),
('STR-MFG-RM', 'RM-BESAN-01', 'Chana Dal Fine Besan', 'RM', 'B-BSN-18', 210.0, 'kg', 92.00, CURRENT_DATE - 8, CURRENT_DATE + 80, 'PASSED', 'GRN-0088'),
('STR-MFG-RM', 'RM-CITR-01', 'Food Grade Citric Acid', 'RM', 'B-CTR-02', 18.0, 'kg', 180.00, CURRENT_DATE - 30, CURRENT_DATE + 330, 'PASSED', 'GRN-0041'),
('STR-MFG-RM', 'RM-ROSE-01', 'Kannauj Rose Water & Cardamom Mix', 'RM', 'B-ROS-04', 12.0, 'kg', 950.00, CURRENT_DATE - 20, CURRENT_DATE + 340, 'PASSED', 'GRN-0050'),
('STR-MFG-RM', 'PKG-RAS-1K', '1kg Leak-Proof Rasgulla Container', 'Packaging', 'B-PKR-12', 640.0, 'pcs', 18.00, CURRENT_DATE - 40, CURRENT_DATE + 680, 'PASSED', 'GRN-0030'),
('STR-MFG-RM', 'PKG-BOX-1K', '1kg Heritage Gift Box', 'Packaging', 'B-PKB-08', 320.0, 'pcs', 42.00, CURRENT_DATE - 35, CURRENT_DATE + 690, 'PASSED', 'GRN-0035'),
('STR-MFG-COLD', 'RM-PANEER-01', 'Fresh Malai Paneer', 'RM', 'B-PAN-1111', 55.0, 'kg', 340.00, CURRENT_DATE - 1, CURRENT_DATE + 3, 'PASSED', 'GRN-0100'),
('STR-MFG-COLD', 'RM-TOM-01', 'Hybrid Tomato Puree Base', 'RM', 'B-TOM-1110', 85.0, 'kg', 48.00, CURRENT_DATE - 2, CURRENT_DATE + 5, 'PASSED', 'GRN-0095'),
-- Outlet DEL01 Shelf & Back-store stock (including near-expiry Rasgulla <= 24h!)
('STR-DEL01-BACK', 'FG-RAS-01', 'Spongy White Rasgulla', 'FG-Sweet', 'FG-RAS-261110', 12.5, 'kg', 225.00, CURRENT_DATE - 2, CURRENT_DATE + 1, 'PASSED', 'PRD-2026-088'),
('STR-DEL01-BACK', 'FG-RAS-01', 'Spongy White Rasgulla', 'FG-Sweet', 'FG-RAS-261112', 28.0, 'kg', 225.00, CURRENT_DATE, CURRENT_DATE + 3, 'PASSED', 'PRD-2026-091'),
('STR-DEL01-BACK', 'FG-KAJU-01', 'Royal Silver-Leaf Kaju Katli', 'FG-Sweet', 'FG-KJU-261108', 35.0, 'kg', 610.00, CURRENT_DATE - 4, CURRENT_DATE + 11, 'PASSED', 'PRD-2026-084'),
('STR-DEL01-BACK', 'FG-BESAN-01', 'Desi Ghee Besan Laddu', 'FG-Sweet', 'FG-BSN-261109', 26.0, 'kg', 310.00, CURRENT_DATE - 3, CURRENT_DATE + 18, 'PASSED', 'PRD-2026-086'),
('STR-DEL01-BACK', 'FG-GULAB-01', 'Hot Kesar Gulab Jamun', 'FG-Sweet', 'FG-GLB-261110', 9.0, 'kg', 240.00, CURRENT_DATE - 2, CURRENT_DATE + 2, 'PASSED', 'PRD-2026-089'),
('STR-DEL01-BACK', 'FG-MOTI-01', 'Shahi Motichoor Laddu', 'FG-Sweet', 'FG-MOT-261111', 11.0, 'kg', 295.00, CURRENT_DATE - 1, CURRENT_DATE + 6, 'PASSED', 'PRD-2026-090'),
('STR-DEL01-BACK', 'FG-BHJ-01', 'Bikaneri Masala Bhujia (400g Pack)', 'FG-Sweet', 'FG-BHJ-261025', 85.0, 'pcs', 82.00, CURRENT_DATE - 18, CURRENT_DATE + 42, 'PASSED', 'PRD-2026-071'),
('STR-DEL01-BACK', 'PKG-BAG-01', 'Annavya Eco Carry Bag', 'Packaging', 'B-BAG-09', 620.0, 'pcs', 6.00, CURRENT_DATE - 10, CURRENT_DATE + 700, 'PASSED', 'IST-0042'),
-- Outlet GUR02 stock
('STR-GUR02-BACK', 'FG-RAS-01', 'Spongy White Rasgulla', 'FG-Sweet', 'FG-RAS-261112', 22.0, 'kg', 225.00, CURRENT_DATE, CURRENT_DATE + 3, 'PASSED', 'PRD-2026-091'),
('STR-GUR02-BACK', 'FG-KAJU-01', 'Royal Silver-Leaf Kaju Katli', 'FG-Sweet', 'FG-KJU-261108', 24.0, 'kg', 610.00, CURRENT_DATE - 4, CURRENT_DATE + 11, 'PASSED', 'PRD-2026-084'),
('STR-GUR02-BACK', 'FG-BESAN-01', 'Desi Ghee Besan Laddu', 'FG-Sweet', 'FG-BSN-261109', 18.0, 'kg', 310.00, CURRENT_DATE - 3, CURRENT_DATE + 18, 'PASSED', 'PRD-2026-086'),
('STR-GUR02-BACK', 'RM-PANEER-01', 'Fresh Malai Paneer', 'RM', 'B-PAN-1111', 28.0, 'kg', 340.00, CURRENT_DATE - 1, CURRENT_DATE + 3, 'PASSED', 'IST-0045'),
('STR-GUR02-BACK', 'RM-TOM-01', 'Hybrid Tomato Puree Base', 'RM', 'B-TOM-1110', 40.0, 'kg', 48.00, CURRENT_DATE - 2, CURRENT_DATE + 5, 'PASSED', 'IST-0045'),
('STR-GUR02-BACK', 'RM-GHEE-01', 'A2 Bilona Desi Ghee', 'RM', 'B-GHE-204', 25.0, 'kg', 595.00, CURRENT_DATE - 10, CURRENT_DATE + 170, 'PASSED', 'IST-0045');

INSERT INTO stores_mod.stock_movements (movement_no, movement_type, store_code, target_store_code, sku, batch_no, qty, uom, reason_code, ref_no, actor) VALUES
('MOV-2026-001', 'GRN', 'STR-MFG-COLD', NULL, 'RM-MILK-01', 'B-MLK-1112', 550.0, 'L', 'Vendor Delivery Passed QC', 'PO-2026-0039', 'Ramesh Yadav'),
('MOV-2026-002', 'FG_INWARD', 'STR-DEL01-BACK', 'STR-MFG-COLD', 'FG-RAS-01', 'FG-RAS-261112', 28.0, 'kg', 'Daily Outlet Replenishment', 'PRD-2026-091', 'Suresh Halwai');

INSERT INTO stores_mod.purchase_requisitions (pr_no, store_code, sku, item_name, requested_qty, uom, reason, status) VALUES
('PR-2026-019', 'STR-MFG-RM', 'RM-KAJU-01', 'Whole Cashew W240 Grade', 120.0, 'kg', 'Below Dynamic ROP (48 kg vs 80 kg par)', 'OPEN'),
('PR-2026-020', 'STR-MFG-RM', 'RM-PISTA-01', 'Iranian Roasted Pistachio', 40.0, 'kg', 'Below Dynamic ROP (14 kg vs 30 kg par)', 'OPEN');

-- Factory Production Orders
INSERT INTO factory_mod.production_orders (prod_no, fg_sku, fg_name, sweet_line, planned_qty, actual_qty, uom, source_type, source_ref, kettle_line, shift, status, expected_rm_cost, actual_rm_cost, labor_overhead, yield_variance_pct, batch_no, mfg_date, expiry_date, qc_data) VALUES
('PRD-2026-091', 'FG-RAS-01', 'Spongy White Rasgulla', 'Milk Sweets', 100.0, 99.2, 'kg', 'Combined', 'IND-DEL01+GUR02', 'Steam Kettle #1', 'Morning Shift', 'DispatchedToStore', 33915.00, 34120.00, 2800.00, -0.80, 'FG-RAS-261112', CURRENT_DATE, CURRENT_DATE + 3, '{"brix_pct":52.4,"moisture_pct":41.0,"temp_c":6.2,"hygiene":"PASS","allergen":"Dairy"}'::jsonb),
('PRD-2026-092', 'FG-RAS-01', 'Spongy White Rasgulla', 'Milk Sweets', 100.0, NULL, 'kg', 'Outlet Indent', 'IND-2026-014', 'Steam Kettle #2', 'Morning Shift', 'Planned', 33915.00, 0, 2800.00, 0, NULL, NULL, NULL, '{}'::jsonb),
('PRD-2026-093', 'FG-KAJU-01', 'Royal Silver-Leaf Kaju Katli', 'Dry Fruit Sweets', 80.0, NULL, 'kg', 'OMS Bulk', 'OMS-2026-0011', 'Copper Karahi #3', 'Afternoon Shift', 'InProduction', 51360.00, 51360.00, 3600.00, 0, 'FG-KJU-261112', CURRENT_DATE, CURRENT_DATE + 15, '{}'::jsonb),
('PRD-2026-094', 'FG-BESAN-01', 'Desi Ghee Besan Laddu', 'Ghee Sweets', 60.0, 57.1, 'kg', 'Outlet Indent', 'IND-2026-015', 'Roti Karahi #1', 'Morning Shift', 'QualityCheck', 17304.00, 17450.00, 2100.00, -4.83, 'FG-BSN-261112', CURRENT_DATE, CURRENT_DATE + 21, '{"aroma":"Rich Ghee","moisture_pct":4.8}'::jsonb);

INSERT INTO factory_mod.wip_stages (prod_no, stage_name, input_sku, input_qty, output_sku, output_qty, yield_pct, status) VALUES
('PRD-2026-091', 'Stage 1: Milk -> Chhena Curdling', 'RM-MILK-01', 500.0, 'WIP-CHHENA', 96.0, 19.20, 'COMPLETED'),
('PRD-2026-091', 'Stage 2: Chhena -> Syrup Cooking', 'WIP-CHHENA', 96.0, 'FG-RAS-01', 99.2, 103.33, 'COMPLETED');

-- OMS Bulk Orders (Marriage, Corporate, Festival)
INSERT INTO oms_mod.bulk_orders (order_no, order_type, customer_name, customer_mobile, company_name, outlet_code, delivery_date, status, assortment, branding_notes, bom_cost_total, selling_total, margin_pct, advance_paid, balance_due, credit_limit, production_req_no, dispatch_drops) VALUES
('OMS-2026-0011', 'Marriage', 'Siddharth Malhotra Family', '+91-9811223344', NULL, 'DEL01', CURRENT_DATE + 2, 'PRODUCTION_LOCKED', '[{"sku":"FG-KAJU-01","name":"Royal Silver-Leaf Kaju Katli","qty_per_box":0.5,"uom":"kg","boxes":160,"total_qty":80,"unit_rate":1180},{"sku":"FG-BESAN-01","name":"Desi Ghee Besan Laddu","qty_per_box":0.5,"uom":"kg","boxes":160,"total_qty":80,"unit_rate":680}]'::jsonb, 'Gold foil monogram "S & A" + Velvet Ribbon', 73600.00, 148800.00, 50.54, 75000.00, 73800.00, 0, 'PRD-2026-093', '[{"venue":"Taj Palace Banquet, Chanakyapuri","boxes":100,"slot":"10:00 AM"},{"venue":"Chhatarpur Farmhouse Gate 2","boxes":60,"slot":"01:30 PM"}]'::jsonb),
('OMS-2026-0012', 'Corporate', 'Neha Gupta (HR Head)', '+91-9810998877', 'Infosys BPM Gurugram', 'GUR02', CURRENT_DATE + 5, 'CONFIRMED', '[{"sku":"FG-KAJU-01","name":"Royal Silver-Leaf Kaju Katli","qty_per_box":0.5,"uom":"kg","boxes":200,"total_qty":100,"unit_rate":1120},{"sku":"FG-BHJ-01","name":"Bikaneri Masala Bhujia (400g Pack)","qty_per_box":1,"uom":"pcs","boxes":200,"total_qty":200,"unit_rate":150}]'::jsonb, 'Corporate logo sleeve + Custom greetings card', 77400.00, 142000.00, 45.49, 50000.00, 92000.00, 300000.00, NULL, '[{"venue":"DLF CyberCity Bldg 8B","boxes":200,"slot":"11:00 AM"}]'::jsonb),
('OMS-2026-0013', 'Festival', 'Rohan Agarwal', '+91-9811776655', 'Agarwal Builders Pvt Ltd', 'DEL01', CURRENT_DATE + 4, 'QUOTATION', '[{"sku":"FG-MOTI-01","name":"Shahi Motichoor Laddu","qty_per_box":1.0,"uom":"kg","boxes":120,"total_qty":120,"unit_rate":620}]'::jsonb, 'Saffron festive sleeve', 35400.00, 74400.00, 52.42, 0, 74400.00, 0, NULL, '[]'::jsonb);

INSERT INTO oms_mod.oms_payments (order_no, receipt_no, stage, amount, mode, reference) VALUES
('OMS-2026-0011', 'RCPT-OMS-001', 'Booking Advance', 75000.00, 'UPI / RTGS', 'UTR9918273645'),
('OMS-2026-0012', 'RCPT-OMS-002', 'Booking Advance', 50000.00, 'NEFT Corporate', 'NEFT882716253');

-- Retail POS & Shop Manager
INSERT INTO pos_mod.promos (code, name, rule_type, value, min_bill, max_cap, stackable, outlet_scope, active) VALUES
('FESTIVE10', 'Festive Mithai 10% Off', 'PERCENT', 10.0, 1000.0, 500.0, FALSE, 'ALL', TRUE),
('HAPPY8PM', 'Evening Chaat & Snacks 20% Happy Hour', 'PERCENT', 20.0, 300.0, 300.0, FALSE, 'ALL', TRUE),
('SWEET100', 'Flat ₹100 Off Above ₹1500', 'FLAT', 100.0, 1500.0, 100.0, TRUE, 'ALL', TRUE);

INSERT INTO pos_mod.approvers (category, name, mobile, max_pct, monthly_quota, used_quota) VALUES
('VIP', 'Vikram Sethi (Shop Manager)', '+91-9811000003', 20.0, 50000.0, 4200.0),
('Owner', 'Rajeshwar Agarwal (Director)', '+91-9811000001', 100.0, 200000.0, 12500.0),
('Employee', 'Annavya HR Desk', '+91-9811000099', 25.0, 30000.0, 3800.0),
('Vendor', 'Accounts Settlement Head', '+91-9811000088', 30.0, 40000.0, 1500.0);

INSERT INTO pos_mod.shifts (shift_no, outlet_code, cashier_name, opening_cash, system_cash_sales, status) VALUES
('SHF-DEL01-01', 'DEL01', 'Priya Sharma', 5000.00, 6840.00, 'OPEN'),
('SHF-GUR02-01', 'GUR02', 'Priya Sharma', 5000.00, 4120.00, 'OPEN');

INSERT INTO pos_mod.pos_orders (estimate_no, invoice_no, outlet_code, mode, status, items, subtotal, discount_type, discount_category, discount_amount, cart_hash, cgst, sgst, grand_total, payment_splits, estimate_staff, cashier_id, delivery_staff, paid_at, delivered_at) VALUES
('EST-DEL01-0041', NULL, 'DEL01', '3_COUNTER', 'ESTIMATE_GENERATED', '[{"sku":"FG-KAJU-01","name":"Royal Silver-Leaf Kaju Katli","qty":1.0,"uom":"kg","unit_price":1180,"gst_pct":5,"gross_wt_g":1055,"tare_wt_g":55,"net_wt_g":1000,"line_total":1180},{"sku":"FG-RAS-01","name":"Spongy White Rasgulla","qty":0.5,"uom":"kg","unit_price":480,"gst_pct":5,"gross_wt_g":545,"tare_wt_g":45,"net_wt_g":500,"line_total":240}]'::jsonb, 1420.00, NULL, NULL, 0, 'a1b2c3d4e5f60041', 35.50, 35.50, 1491.00, '[]'::jsonb, 'Counter Staff 1', NULL, NULL, NULL, NULL),
('EST-DEL01-0040', 'INV-DEL01-0039', 'DEL01', '3_COUNTER', 'PAID_PENDING_DELIVERY', '[{"sku":"FG-BESAN-01","name":"Desi Ghee Besan Laddu","qty":1.0,"uom":"kg","unit_price":680,"gst_pct":5,"gross_wt_g":1050,"tare_wt_g":50,"net_wt_g":1000,"line_total":680},{"sku":"FG-BHJ-01","name":"Bikaneri Masala Bhujia (400g Pack)","qty":2,"uom":"pcs","unit_price":160,"gst_pct":12,"gross_wt_g":0,"tare_wt_g":0,"net_wt_g":0,"line_total":320}]'::jsonb, 1000.00, NULL, NULL, 0, 'a1b2c3d4e5f60040', 36.20, 36.20, 1072.40, '[{"mode":"UPI","amount":1072.40,"ref":"UPI-882716"}]'::jsonb, 'Counter Staff 1', 'Priya Sharma', NULL, NOW() - INTERVAL '4 minutes', NULL),
('EST-DEL01-0038', 'INV-DEL01-0038', 'DEL01', '3_COUNTER', 'DELIVERED_CLOSED', '[{"sku":"FG-KAJU-01","name":"Royal Silver-Leaf Kaju Katli","qty":2.0,"uom":"kg","unit_price":1180,"gst_pct":5,"line_total":2360}]'::jsonb, 2360.00, 'AD_HOC_OTP', 'VIP', 236.00, 'a1b2c3d4e5f60038', 53.10, 53.10, 2230.20, '[{"mode":"Card","amount":2230.20,"ref":"CARD-9912"}]'::jsonb, 'Counter Staff 2', 'Priya Sharma', 'Mohan Packing', NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '40 minutes'),
('EST-GUR02-0019', 'INV-GUR02-0019', 'GUR02', 'DIRECT', 'DELIVERED_CLOSED', '[{"sku":"FG-GULAB-01","name":"Hot Kesar Gulab Jamun","qty":1.5,"uom":"kg","unit_price":520,"gst_pct":5,"line_total":780}]'::jsonb, 780.00, 'PROMO', 'FESTIVE10', 78.00, 'b9c8d7e6f5a40019', 17.55, 17.55, 737.10, '[{"mode":"Cash","amount":737.10,"ref":"CASH"}]'::jsonb, 'Priya Sharma', 'Priya Sharma', 'Priya Sharma', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours');

INSERT INTO pos_mod.outlet_indents (indent_no, outlet_code, sku, item_name, qty, uom, priority, status) VALUES
('IND-2026-014', 'DEL01', 'FG-RAS-01', 'Spongy White Rasgulla', 50.0, 'kg', 'HIGH', 'PLANNED'),
('IND-2026-015', 'GUR02', 'FG-BESAN-01', 'Desi Ghee Besan Laddu', 40.0, 'kg', 'NORMAL', 'PLANNED');

-- KOT Tables & Active KOTs
INSERT INTO kot_mod.dining_tables (outlet_code, table_code, section, capacity, status, current_pax) VALUES
('GUR02', 'T-01', 'AC Hall', 4, 'KOT Running', 3),
('GUR02', 'T-02', 'AC Hall', 4, 'Available', 0),
('GUR02', 'T-03', 'AC Hall', 6, 'Bill Printed', 5),
('GUR02', 'T-04', 'Family Section', 8, 'Occupied', 6),
('GUR02', 'T-05', 'Garden', 4, 'Available', 0),
('GUR02', 'T-06', 'Garden', 2, 'Cleaning', 0),
('NOI04', 'T-01', 'AC Hall', 4, 'KOT Running', 2),
('NOI04', 'T-02', 'AC Hall', 4, 'Available', 0),
('JAI03', 'T-01', 'Heritage Courtyard', 6, 'Available', 0),
('JAI03', 'T-02', 'Heritage Courtyard', 4, 'KOT Running', 4);

INSERT INTO kot_mod.kots (kot_no, outlet_code, table_code, order_source, captain_name, items, status, total_amount) VALUES
('KOT-GUR02-105', 'GUR02', 'T-01', 'DINE_IN', 'Arjun Negi', '[
  {"sku":"RST-CHAAT-01","name":"Annavya Special Raj Kachori","qty":2,"unit_price":185,"station":"Chaat","modifiers":"Less Spicy, Extra Curd","course":"Starter","station_status":"Ready"},
  {"sku":"RST-TAND-01","name":"Paneer Lababdar + 2 Butter Naan","qty":2,"unit_price":395,"station":"Tandoor","modifiers":"No Onion/Garlic (Jain)","course":"Main","station_status":"Preparing"},
  {"sku":"FG-GULAB-01","name":"Hot Kesar Gulab Jamun","qty":1,"unit_price":260,"station":"Sweet Counter","modifiers":"Serve Hot (500g)","course":"Dessert","station_status":"Queued"}
]'::jsonb, 'ACTIVE', 1420.00),
('KOT-GUR02-104', 'GUR02', 'T-03', 'DINE_IN', 'Arjun Negi', '[
  {"sku":"RST-SOUTH-01","name":"Ghee Roast Masala Dosa","qty":3,"unit_price":225,"station":"South Indian","modifiers":"Extra Ghee","course":"Main","station_status":"Ready"},
  {"sku":"RST-BEV-01","name":"Kesar Badam Thandai / Kulhad Lassi","qty":3,"unit_price":135,"station":"Beverages","modifiers":"Less Sugar","course":"Beverage","station_status":"Ready"}
]'::jsonb, 'READY', 1080.00),
('KOT-GUR02-106', 'GUR02', 'ZOM-8841', 'ZOMATO', 'Aggregator Webhook', '[
  {"sku":"RST-CHAAT-02","name":"Dilli Crispy Aloo Tikki Chaat","qty":2,"unit_price":145,"station":"Chaat","modifiers":"Pack chutney separate","course":"Pack","station_status":"Preparing"},
  {"sku":"RST-TAND-02","name":"Dal Makhani Bukhara Style","qty":1,"unit_price":320,"station":"Tandoor","modifiers":"Extra Cream","course":"Pack","station_status":"Queued"}
]'::jsonb, 'ACTIVE', 610.00);

