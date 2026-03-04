from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from database import get_db
from models.usuario import Usuario
from schemas.auth import LoginRequest, TokenResponse
from services.auth_service import verify_password, create_access_token
from dependencies.auth import get_current_user

router = APIRouter()

# Simple in-memory brute-force guard: username -> list[timestamp]
_login_attempts: dict[str, list] = {}
_MAX_ATTEMPTS = 5
_WINDOW_SECONDS = 60
_MAX_KEYS = 5000  # cap to prevent unbounded growth


def _evict_expired() -> None:
    """Remove entries whose entire window has passed; called when dict grows too large."""
    cutoff = datetime.now(timezone.utc).timestamp() - _WINDOW_SECONDS
    expired = [k for k, ts in _login_attempts.items() if not any(t > cutoff for t in ts)]
    for k in expired:
        del _login_attempts[k]


def _check_rate_limit(username: str) -> None:
    now = datetime.now(timezone.utc).timestamp()
    window_start = now - _WINDOW_SECONDS
    attempts = [t for t in _login_attempts.get(username, []) if t > window_start]
    if len(attempts) >= _MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas tentativas de login. Aguarde 1 minuto.",
        )
    attempts.append(now)
    if len(_login_attempts) >= _MAX_KEYS:
        _evict_expired()
    _login_attempts[username] = attempts


def _clear_attempts(username: str) -> None:
    _login_attempts.pop(username, None)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    identifier = body.identifier.strip().lower()
    _check_rate_limit(identifier)

    result = await db.execute(
        select(Usuario).where(
            or_(
                func.lower(Usuario.username) == identifier,
                func.lower(Usuario.email) == identifier,
            )
        )
    )
    user: Usuario | None = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário/e-mail ou senha incorretos",
        )
    if not user.ativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo. Entre em contato com o administrador.",
        )

    _clear_attempts(identifier)

    # Update last access
    user.ultimo_acesso = datetime.now(timezone.utc)
    await db.commit()

    token = create_access_token({
        "sub": user.username,
        "user_id": user.id,
        "role": user.role,
    })
    return TokenResponse(
        access_token=token,
        role=user.role,
        username=user.username,
        nome=user.nome,
        user_id=user.id,
        produtor_id=user.produtor_id,
    )


@router.get("/me")
async def me(current_user: Usuario = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "nome": current_user.nome,
        "role": current_user.role,
        "produtor_id": current_user.produtor_id,
        "ativo": current_user.ativo,
    }
