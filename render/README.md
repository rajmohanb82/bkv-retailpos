# 🚀 Deploying Annavya Retail ERP (Bikanervala Edition) on Render (Free Tier)

This guide walks you through deploying the complete **Annavya Food Retail Chain ERP & Express Touch Kiosk** on **Render's Free Tier** smoothly with zero code changes to any existing application module.

---

## 🏛️ Architecture Overview for Render Free Tier

| Component | Local Docker Compose | Render Free Tier SaaS Container |
| :--- | :--- | :--- |
| **Containers** | 10 separate containers (DB + 8 Microservices + Frontend + Gateway) | **1 Single Unified Container** (`render/Dockerfile`) |
| **RAM Footprint** | ~1.8 GB across all services | **~60–80 MB** (Well within Render's 512 MB free tier ceiling) |
| **Network Ports** | Port 80 (ERP) & Port 88 (KIOSK) | **Single Render Port (`$PORT` / 10000)** with dynamic SPA routing |
| **Database** | Standalone `postgres:16-alpine` container | **Dual Mode**: Embedded PostgreSQL (zero-config) OR Remote `DATABASE_URL` |
| **Cold Starts** | Multiple containers waking independently | **Instant Single Process Wakeup** (< 2 seconds) |

---

## ⚡ Deployment Methods (Choose Any One)

### Method 1: Web Service via Render Console (Recommended & Fastest)

1. Push your repository to **GitHub** or **GitLab**.
2. Log into [Render.com](https://dashboard.render.com).
3. Click **"New +"** in the top right $\rightarrow$ select **"Web Service"**.
4. Choose **"Build and deploy from a Git repository"** and select your repository.
5. In the configuration settings, fill in:
   * **Name**: `bikanervala-retail-erp` (or your preferred name)
   * **Region**: Oregon (or closest to you)
   * **Branch**: `main` (or your working branch e.g. `dev`)
   * **Language / Runtime**: **Docker**
   * **Dockerfile Path**: `render/Dockerfile` *(Important!)*
   * **Docker Build Context Directory**: `.` *(Root directory)*
   * **Instance Type**: **Free** ($0/month)
6. **Environment Variables** (Optional):
   * `PORT`: `10000` (Render sets this automatically)
   * *(Optional)* `DATABASE_URL`: Only if you wish to connect to an external PostgreSQL database (see Database section below). If left blank, embedded PostgreSQL will run automatically.
7. Click **"Deploy Web Service"**!

Render will build the container, bundle the frontend, start the unified FastAPI server, and provide your live HTTPS URL (e.g., `https://bikanervala-retail-erp.onrender.com`).

---

### Method 2: Render Blueprint (`render/render.yaml`)

1. In the Render Dashboard, click **"New +"** $\rightarrow$ select **"Blueprint"**.
2. Connect your Git repository.
3. In **Blueprint Service Path**, point to `render/render.yaml`.
4. Click **"Apply"**. Render will automatically provision the service using the declarative specification.

---

## 🗄️ Database Management & Bootstrapping

The Render edition includes an intelligent database bootstrapper ([render/db_bootstrap.py](file:///home/rajmohanb/Documents/GitHub-Apps/Bikanervala%20-%20Retail/render/db_bootstrap.py)) that handles both zero-config testing and production database setups:

### Mode A: Zero-Config Embedded Database (Default)
* If **`DATABASE_URL` is omitted**, [render/entrypoint.sh](file:///home/rajmohanb/Documents/GitHub-Apps/Bikanervala%20-%20Retail/render/entrypoint.sh) automatically initializes a local PostgreSQL 16 cluster, creates the `annavya_erp` database with user `annavya`, and seeds all initial data from `db/init.sql`.
* **Zero external dependencies**: Perfect for quick live demonstrations and client walkthroughs.

### Mode B: External / Render Managed PostgreSQL (Persistent)
* If you create a free PostgreSQL database on Render (or use Supabase/Neon), simply copy the connection string and add it to your Web Service environment variables:
  * **Key**: `DATABASE_URL`
  * **Value**: `postgresql://annavya:annavya_secret@your-db-hostname:5432/annavya_erp`
* When `DATABASE_URL` is detected, the container skips local postgres, connects to the remote host, checks if `admin_mod.outlets` exists, and automatically executes `db/init.sql` if the tables are fresh.

---

## 📱 Accessing the Application Endpoints

Once deployed, your single Render URL provides access to all modules:

### 1. Enterprise ERP Dashboard
* **URL**: `https://<your-render-app>.onrender.com/`
* **Features**: Full access to:
  * 📊 **Executive Dashboard**: CXO Real-time KPIs & COGS metrics.
  * 🍬 **Retail POS**: Sweet Counter weigh scale, hotkeys, and cashier handover.
  * 🍽️ **Restaurant POS**: Table billing, takeaway ordering, and dynamic UPI QR.
  * 📱 **Order Taking**: Captain mobile table order alignment & KOT dispatch.
  * 🚚 **OMS & Online**: Zomato/Swiggy order live inbox & Bulk Corporate/Wedding Hampers (with multiple line items, margin guardrail, advance/balance payments, and scheduled delivery calendar).
  * 📦 **Stores & BOM**: Auto-PO check-in, order BOM check-out, FIFO batches, and dynamic RSP alerts.
  * 🏭 **Sweet Factory**: WIP batch recipes, packaging sequence, and QC dispatch.
  * 👨‍🍳 **KOT & Kitchen**: Multi-Station KDS with real-time cooking progress.
  * 🤝 **Vendor & RFQ**: Tenders, price contracts, and line-wise PO approvals.
  * ⚙️ **Admin & GSTN**: Multi-outlet configuration, RBAC, hardware settings, and backup vault.

### 2. Express Touch KIOSK (Portrait Mode)
* **Direct Standalone Kiosk URL**: `https://<your-render-app>.onrender.com/kiosk`
* **Alternative URL**: `https://<your-render-app>.onrender.com/?kiosk=standalone`
* **Features**:
  * Clean, responsive vertical portrait interface tailored for touch devices and customer self-service.
  * Pure-vegetarian menu items with authentic imagery and Bikanervala logos.
  * Self-service ordering (Dine-In or Takeaway), cart management, and instant counter/online payment tokens.
  * In-app links to "Open Dedicated Kiosk" are automatically routed to `/kiosk` without requiring multiple ports.

### 3. Health & Monitoring Endpoints
* **Root Health**: `https://<your-render-app>.onrender.com/health`
* **API Microservices Health**: `https://<your-render-app>.onrender.com/api/health`

---

## 🔑 Default Demo Login Credentials

| Role | Username / Mobile | Password | POS PIN | MFA Status |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin` / `9811445566` | `admin123` | `1234` | Enrolled |
| **Director / Corporate** | `director` / `9810011223` | `director123` | `9999` | Enrolled |
| **CP Shop Manager** | `manager` / `9811776655` | `mgr123` | `5555` | Enrolled |
| **Cashier Terminal 1** | `cashier` / `9810998877` | `cash123` | `1111` | Exempted (Rapid Login) |

---

## 📁 Files Created Inside `render/`

All deployment assets are strictly contained within the `render/` folder:

* [render/Dockerfile](file:///home/rajmohanb/Documents/GitHub-Apps/Bikanervala%20-%20Retail/render/Dockerfile): Multi-stage container builder and runtime.
* [render/requirements.txt](file:///home/rajmohanb/Documents/GitHub-Apps/Bikanervala%20-%20Retail/render/requirements.txt): Pinned backend dependencies.
* [render/unified_server.py](file:///home/rajmohanb/Documents/GitHub-Apps/Bikanervala%20-%20Retail/render/unified_server.py): High-efficiency unified FastAPI gateway mounting all 8 services and SPA fallback.
* [render/db_bootstrap.py](file:///home/rajmohanb/Documents/GitHub-Apps/Bikanervala%20-%20Retail/render/db_bootstrap.py): Automatic database readiness probe and schema/seed data initialization.
* [render/entrypoint.sh](file:///home/rajmohanb/Documents/GitHub-Apps/Bikanervala%20-%20Retail/render/entrypoint.sh): Container bootstrapper managing embedded postgres fallback and uvicorn.
* [render/render.yaml](file:///home/rajmohanb/Documents/GitHub-Apps/Bikanervala%20-%20Retail/render/render.yaml): Render Blueprint definition.
* [render/README.md](file:///home/rajmohanb/Documents/GitHub-Apps/Bikanervala%20-%20Retail/render/README.md): Step-by-step deployment and operational documentation.
