from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from database import get_db
from models.usuario import Usuario
from models.produtor import Produtor
from schemas.auth import UsuarioCreate, UsuarioUpdate, UsuarioResponse
from services.auth_service import hash_password
from dependencies.auth import require_admin

router = APIRouter()

_opts = selectinload(Usuario.produtores_vinculados)


async def _get_user_or_404(user_id: int, db: AsyncSession) -> Usuario:
    result = await db.execute(select(Usuario).options(_opts).where(Usuario.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return user


async def _sync_produtor_ids(user: Usuario, ids: list[int], db: AsyncSession) -> None:
    if not ids:
        user.produtores_vinculados = []
        return
    result = await db.execute(select(Produtor).where(Produtor.id.in_(ids)))
    user.produtores_vinculados = list(result.scalars().all())


@router.get("/", response_model=list[UsuarioResponse])
async def listar_usuarios(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    result = await db.execute(select(Usuario).options(_opts).order_by(Usuario.nome))
    return result.scalars().all()


@router.post("/", response_model=UsuarioResponse, status_code=201)
async def criar_usuario(
    body: UsuarioCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    existing = await db.execute(select(Usuario).where(Usuario.username == body.username))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Nome de usuário já existe")

    producers = []
    if body.produtor_ids:
        r = await db.execute(select(Produtor).where(Produtor.id.in_(body.produtor_ids)))
        producers = list(r.scalars().all())

    user = Usuario(
        username=body.username,
        hashed_password=hash_password(body.password),
        nome=body.nome,
        email=body.email,
        role=body.role,
        produtor_id=body.produtor_id,
        produtores_vinculados=producers,
    )
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="E-mail já cadastrado em outro usuário")

    result = await db.execute(select(Usuario).options(_opts).where(Usuario.id == user.id))
    return result.scalar_one()


@router.get("/{user_id}", response_model=UsuarioResponse)
async def detalhe_usuario(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    return await _get_user_or_404(user_id, db)


@router.put("/{user_id}", response_model=UsuarioResponse)
async def atualizar_usuario(
    user_id: int,
    body: UsuarioUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    user = await _get_user_or_404(user_id, db)

    if body.password is not None:
        user.hashed_password = hash_password(body.password)
    if body.nome is not None:
        user.nome = body.nome
    if body.email is not None:
        user.email = body.email
    if body.role is not None:
        user.role = body.role
    if body.produtor_id is not None:
        user.produtor_id = body.produtor_id
    if body.ativo is not None:
        user.ativo = body.ativo
    if body.produtor_ids is not None:
        await _sync_produtor_ids(user, body.produtor_ids, db)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="E-mail já cadastrado em outro usuário")

    result = await db.execute(select(Usuario).options(_opts).where(Usuario.id == user.id))
    return result.scalar_one()


@router.delete("/{user_id}", status_code=204)
async def remover_usuario(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Não é possível remover o próprio usuário")

    result = await db.execute(select(Usuario).where(Usuario.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    await db.delete(user)
    await db.commit()
