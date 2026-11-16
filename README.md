# Annavya — Food Retail Chain ERP
**Fresh Thinking. Smarter Retail.**

A containerized, modular, full-stack Enterprise Resource Planning (ERP) platform built from `ERP_Functional_and_Modular_Workflow.md`, supporting **Sweet Shops**, **Restaurants**, **Hybrid Outlets (Restaurant + Sweet Shop)**, and **Central Sweet Production Factories** across **Company Owned (CO)**, **Franchised**, and **Director Owned (DO)** models.

---

## Access URLs & Ports
- **Web Application & API Gateway**: `http://localhost:8285`
- **PostgreSQL 16 Database**: `localhost:5460` (`annavya` / `annavya_erp`)

---

## Containerized Modular Architecture (`docker-compose.yml`)

| Container | Module(s) | Responsibility |
|---|---|---|
| `annavya-gateway` | Edge / Gateway | Nginx reverse proxy on port `8285` routing `/` and `/api/*` |
| `annavya-frontend` | UI Layer | React 18 + TypeScript + Vite + Tailwind CSS + Recharts + Code128 Thermal Barcodes |
| `annavya-db` | Data Layer | PostgreSQL 16 (`5460:5432`) with schema-per-domain isolation (`admin_mod`, `vendor_mod`, `stores_mod`, `factory_mod`, `oms_mod`, `pos_mod`, `kot_mod`) |
| `annavya-admin-service` | Modules 8 & 11 | Users, RBAC Permission Matrix, Outlets (`CO`/`Franchised`/`DO`), Live GSTN Checksum & GSP API Verification, Master SKUs, BOMs & Peripherals |
| `annavya-pos-service` | Modules 1 & 2 | 3-Counter POS (`Estimate → Cash → Delivery`), 40-Col Thermal Slip, Electronic Weighing Scale Tare Simulator, Promos, SMS OTP Ad-Hoc Discount Governance & Cart Tamper Protection, Shop Manager Oversight |
| `annavya-oms-service` | Module 3 | Bulk/Marriage/Corporate/Festival Orders, Custom Hamper Builder with BOM Margin Guardrail, Multi-Stage Advances, Production Lock & Multi-Drop Manifest |
| `annavya-stores-service` | Module 4 | Multi-Store Master, FEFO Batch Control, BOM Raw Material Issue to Factory, Shortage Auto-PR, Dynamic ROP with Festival Multiplier, IST + E-Way Bill |
| `annavya-factory-service` | Module 5 | Production Scheduling, 2-Stage WIP (Milk → Chhena/Khoya), Yield Variance (±2% Alert), QC Checklist, Batch/Expiry Labeling & Batch COGS |
| `annavya-kot-service` | Module 6 | Dine-In Visual Floor Map, Captain KOT Entry, Multi-Station KDS (`Chaat`, `Tandoor`, `South Indian`, `Sweet Counter`, `Beverages`), Zomato Webhook & Table Settlement |
| `annavya-vendor-service` | Module 7 | Vendor Onboarding & FSSAI Expiry, RM Priority Mapping, Price Masters, RFQ/Tender L1/L2 Comparative Award, PO & 3-Way Invoice Match |
| `annavya-analytics-service` | Modules 9 & 10 | Executive CXO Dashboard & All Reports Suite (9 Categories + FSSAI Batch Traceability + CSV Export) |

---

## Quick Start
```bash
docker compose up -d --build
```
Then open `http://localhost:8285` in your browser.

