from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from database import get_db
from models.ncm import NCM
from models.usuario import Usuario
from schemas.ncm import NcmCreate, NcmUpdate, NcmResponse
from dependencies.auth import get_current_user, require_admin
from typing import Optional

router = APIRouter()


@router.get("/", response_model=list[NcmResponse])
async def listar(
    busca: Optional[str] = Query(None, description="Filtrar por código ou descrição"),
    apenas_ativos: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    query = select(NCM)
    if apenas_ativos:
        query = query.where(NCM.ativo == True)  # noqa: E712
    if busca:
        query = query.where(
            or_(NCM.codigo.ilike(f"%{busca}%"), NCM.descricao.ilike(f"%{busca}%"))
        )
    result = await db.execute(query.order_by(NCM.codigo))
    return result.scalars().all()


@router.get("/{id}", response_model=NcmResponse)
async def buscar(
    id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    result = await db.execute(select(NCM).where(NCM.id == id))
    ncm = result.scalar_one_or_none()
    if not ncm:
        raise HTTPException(status_code=404, detail="NCM não encontrado")
    return ncm


@router.post("/", response_model=NcmResponse, status_code=201)
async def criar(
    data: NcmCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    existe = await db.execute(select(NCM).where(NCM.codigo == data.codigo))
    if existe.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"NCM {data.codigo} já cadastrado")
    ncm = NCM(**data.model_dump())
    db.add(ncm)
    await db.commit()
    await db.refresh(ncm)
    return ncm


@router.put("/{id}", response_model=NcmResponse)
async def atualizar(
    id: int,
    data: NcmUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    result = await db.execute(select(NCM).where(NCM.id == id))
    ncm = result.scalar_one_or_none()
    if not ncm:
        raise HTTPException(status_code=404, detail="NCM não encontrado")
    for campo, valor in data.model_dump(exclude_none=True).items():
        setattr(ncm, campo, valor)
    await db.commit()
    await db.refresh(ncm)
    return ncm


@router.delete("/{id}", status_code=204)
async def remover(
    id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    result = await db.execute(select(NCM).where(NCM.id == id))
    ncm = result.scalar_one_or_none()
    if not ncm:
        raise HTTPException(status_code=404, detail="NCM não encontrado")
    await db.delete(ncm)
    await db.commit()
