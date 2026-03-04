from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from database import get_db
from models.cfop import CFOP
from models.usuario import Usuario
from schemas.cfop import CfopCreate, CfopUpdate, CfopResponse
from dependencies.auth import get_current_user, require_admin
from typing import Optional

router = APIRouter()


@router.get("/", response_model=list[CfopResponse])
async def listar(
    busca: Optional[str] = Query(None, description="Filtrar por código ou descrição"),
    apenas_ativos: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    query = select(CFOP)
    if apenas_ativos:
        query = query.where(CFOP.ativo == True)  # noqa: E712
    if busca:
        query = query.where(
            or_(CFOP.codigo.ilike(f"%{busca}%"), CFOP.descricao.ilike(f"%{busca}%"))
        )
    result = await db.execute(query.order_by(CFOP.codigo))
    return result.scalars().all()


@router.get("/{id}", response_model=CfopResponse)
async def buscar(
    id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    result = await db.execute(select(CFOP).where(CFOP.id == id))
    cfop = result.scalar_one_or_none()
    if not cfop:
        raise HTTPException(status_code=404, detail="CFOP não encontrado")
    return cfop


@router.post("/", response_model=CfopResponse, status_code=201)
async def criar(
    data: CfopCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    existe = await db.execute(select(CFOP).where(CFOP.codigo == data.codigo))
    if existe.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"CFOP {data.codigo} já cadastrado")
    cfop = CFOP(**data.model_dump())
    db.add(cfop)
    await db.commit()
    await db.refresh(cfop)
    return cfop


@router.put("/{id}", response_model=CfopResponse)
async def atualizar(
    id: int,
    data: CfopUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    result = await db.execute(select(CFOP).where(CFOP.id == id))
    cfop = result.scalar_one_or_none()
    if not cfop:
        raise HTTPException(status_code=404, detail="CFOP não encontrado")
    for campo, valor in data.model_dump(exclude_none=True).items():
        setattr(cfop, campo, valor)
    await db.commit()
    await db.refresh(cfop)
    return cfop


@router.delete("/{id}", status_code=204)
async def remover(
    id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    result = await db.execute(select(CFOP).where(CFOP.id == id))
    cfop = result.scalar_one_or_none()
    if not cfop:
        raise HTTPException(status_code=404, detail="CFOP não encontrado")
    await db.delete(cfop)
    await db.commit()
