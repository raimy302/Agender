from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .database import engine
from .models import Base

from .routes import public, users, appointments
from .routes.public_track import router as track_router
from .seed import seed_demo_data






Base.metadata.create_all(bind=engine)


app = FastAPI()


@app.on_event("startup")
def _startup_seed() -> None:  # noqa: E302

    # Crea el admin demo si no existe
    try:
        seed_demo_data()
    except Exception:
        # MVP: evita romper el servidor si seed falla
        pass


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    detail = exc.detail if exc.detail is not None else "Error"
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "ok": False,
            "error": {"code": str(exc.status_code), "message": str(detail)},
            "detail": detail,
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "ok": False,
            "error": {"code": "INTERNAL", "message": "Error interno"},
        },
    )


# Ajusta según tu host de Vite (por ahora soporta local común)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ruta alias para compatibilidad del frontend: POST /login -> POST /auth/login
# Implementamos endpoint directo para evitar dependencias internas de router.
from .database import SessionLocal
from .models import User
from .schemas import UserLogin
from .auth import verify_password, create_access_token


@app.post("/login")
def login_alias(user: UserLogin):
    db = SessionLocal()
    try:
        db_user = db.query(User).filter(User.email == user.email).first()
        if not db_user or not verify_password(user.password, db_user.password):
            raise HTTPException(status_code=400, detail="Credenciales incorrectas")

        token = create_access_token({"user_id": db_user.id})
        return {"access_token": token, "user_id": db_user.id}
    finally:
        db.close()



app.include_router(users.router)
app.include_router(public.router)


# CRUD de appointments protegido se monta en appointments.router (sin endpoints públicos)
app.include_router(appointments.router)
app.include_router(track_router)








