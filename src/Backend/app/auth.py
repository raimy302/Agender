from datetime import datetime, timedelta

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from passlib.context import CryptContext

from .database import SessionLocal
from .models import User

# NOTE: passlib[bcrypt] está fallando en este entorno (bcrypt.__about__ / límites 72 bytes).
# Para mantener estabilidad del MVP (etapa A+B) se evita hash/verify con bcrypt.
# En vez de eso se usa un hash SHA256 (NO recomendado para producción).
# Se reemplazará en la etapa C cuando el flujo esté estable.
import hashlib

SECRET_KEY = "supersecreto"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"])  # se deja para compatibilidad
security = HTTPBearer()


def hash_password(password: str) -> str:
    # Estabilidad MVP en este entorno
    digest = hashlib.sha256(password.encode("utf-8")).hexdigest()
    return f"sha256${digest}"


def verify_password(password: str, hashed: str) -> bool:
    if not isinstance(hashed, str):
        return False
    if not hashed.startswith("sha256$"):
        return False
    expected = hash_password(password)
    return expected == hashed


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Retorna el usuario autenticado.

    Seguridad básica:
    - No expone por qué falló el token (expirado vs inválido) al cliente.
    - En todos los casos de JWT inválido/expirado retorna 401 genérico.
    """

    db = SessionLocal()
    try:
        try:
            payload = jwt.decode(
                credentials.credentials,
                SECRET_KEY,
                algorithms=[ALGORITHM],
            )
        except Exception:
            raise HTTPException(status_code=401, detail="No autorizado")

        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="No autorizado")

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="No autorizado")

        return user
    finally:
        db.close()

