from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


def create_service_app(title: str, version: str = "1.0.0") -> FastAPI:
    app = FastAPI(title=f"Annavya ERP — {title}", version=version)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health():
        return {"status": "healthy", "service": title}

    return app

