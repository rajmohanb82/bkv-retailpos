import os
import sys
import importlib.util
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse

# Ensure services directory is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SERVICES_DIR = os.path.join(BASE_DIR, "services")
if SERVICES_DIR not in sys.path:
    sys.path.insert(0, SERVICES_DIR)

app = FastAPI(
    title="Annavya Food Retail Chain ERP — Render Unified SaaS Edition",
    description="Unified Enterprise Suite for Bikanervala Retail, Factory, OMS, POS & Touch Kiosk",
    version="2.0.0",
)

# Global CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SERVICES = [
    ("admin", "admin-service"),
    ("vendor", "vendor-service"),
    ("stores", "stores-service"),
    ("factory", "factory-service"),
    ("oms", "oms-service"),
    ("pos", "pos-service"),
    ("kot", "kot-service"),
    ("analytics", "analytics-service"),
]

mounted_services = []
loaded_modules = []

for api_prefix, svc_folder in SERVICES:
    main_py = os.path.join(SERVICES_DIR, svc_folder, "app", "main.py")
    if not os.path.isfile(main_py):
        print(f"[Render Unified Server] WARNING: {main_py} not found. Skipping mount.")
        continue

    try:
        module_name = f"render_svc_{api_prefix}"
        spec = importlib.util.spec_from_file_location(module_name, main_py)
        if spec and spec.loader:
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            if hasattr(mod, "app"):
                app.mount(f"/api/{api_prefix}", mod.app)
                mounted_services.append(api_prefix)
                loaded_modules.append((api_prefix, mod))
                print(f"[Render Unified Server] Mounted /api/{api_prefix} -> {svc_folder} ({len(mod.app.routes)} routes)")
            else:
                print(f"[Render Unified Server] ERROR: No 'app' found in {main_py}")
    except Exception as e:
        print(f"[Render Unified Server] Failed to load {svc_folder}: {e}")

@app.on_event("startup")
def run_service_startups():
    for api_prefix, mod in loaded_modules:
        for attr in dir(mod):
            if attr.startswith("ensure_") and callable(getattr(mod, attr)):
                try:
                    getattr(mod, attr)()
                    print(f"[Render Unified Server] Executed {api_prefix}.{attr}() successfully.")
                except Exception as e:
                    print(f"[Render Unified Server] Startup check warning on {api_prefix}.{attr}: {e}")


# Health Check Endpoints
@app.get("/health")
def root_health():
    return {
        "status": "healthy",
        "platform": "Render SaaS",
        "services_mounted": mounted_services,
        "kiosk_ready": True,
    }

@app.get("/api/health")
def api_health():
    return {
        "status": "healthy",
        "services": mounted_services,
    }

# Frontend Static Assets & SPA Routing
FRONTEND_DIST_CANDIDATES = [
    "/app/frontend_dist",
    os.path.join(BASE_DIR, "frontend_dist"),
    os.path.join(BASE_DIR, "frontend", "dist"),
]

FRONTEND_DIST = None
for c in FRONTEND_DIST_CANDIDATES:
    if os.path.isdir(c):
        FRONTEND_DIST = os.path.abspath(c)
        break

if FRONTEND_DIST:
    print(f"[Render Unified Server] Serving frontend SPA from {FRONTEND_DIST}")
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    def get_patched_index_html() -> str:
        index_path = os.path.join(FRONTEND_DIST, "index.html")
        if not os.path.isfile(index_path):
            return "<html><body><h1>Annavya ERP</h1><p>Frontend index.html not found.</p></body></html>"
        with open(index_path, "r", encoding="utf-8") as f:
            content = f.read()

        # In Render, there is only one HTTPS port. Intercept any click pointing to 8288/8289 and redirect to /kiosk or /retail-pos
        kiosk_shim = """
        <script>
        (function() {
          document.addEventListener('click', function(e) {
            var el = e.target.closest('a');
            if (el && el.href) {
              if (el.href.indexOf(':8288') !== -1) {
                e.preventDefault();
                window.open(window.location.origin + '/kiosk', '_blank');
              } else if (el.href.indexOf(':8289') !== -1) {
                e.preventDefault();
                window.open(window.location.origin + '/retail-pos', '_blank');
              }
            }
          }, true);
        })();
        </script>
        """
        if "</head>" in content:
            content = content.replace("</head>", f"{kiosk_shim}\n</head>", 1)
        else:
            content += kiosk_shim
        return content

    cached_index_html = get_patched_index_html()

    @app.get("/kiosk")
    def serve_kiosk():
        return HTMLResponse(content=cached_index_html, status_code=200)

    @app.get("/retail-pos")
    @app.get("/pos/retail")
    @app.get("/pos/standalone")
    @app.get("/pos/customer-display")
    @app.get("/cfd")
    def serve_pos_routes():
        return HTMLResponse(content=cached_index_html, status_code=200)

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        # If static file exists directly (e.g. bikanervala-customer-logo.png, favicon.svg)
        target_file = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(target_file):
            return FileResponse(target_file)
        # Otherwise serve SPA index.html for client-side routing
        return HTMLResponse(content=cached_index_html, status_code=200)
else:
    print("[Render Unified Server] WARNING: frontend_dist not found. Only API routes active.")
