from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from database import get_db
from models.municipio import Municipio
from models.usuario import Usuario
from schemas.municipio import MunicipioCreate, MunicipioUpdate, MunicipioResponse
from dependencies.auth import get_current_user, require_admin
from typing import Optional

router = APIRouter()


@router.get("/", response_model=list[MunicipioResponse])
async def listar(
    busca: Optional[str] = Query(None, description="Filtrar por nome ou código IBGE"),
    uf: Optional[str] = Query(None, description="Filtrar por UF (ex: RS, SC, PR, MG)"),
    apenas_ativos: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    query = select(Municipio)
    if apenas_ativos:
        query = query.where(Municipio.ativo == True)  # noqa: E712
    if uf:
        query = query.where(Municipio.uf == uf.upper())
    if busca:
        query = query.where(
            or_(Municipio.nome.ilike(f"%{busca}%"), Municipio.codigo_ibge.ilike(f"%{busca}%"))
        )
    result = await db.execute(query.order_by(Municipio.uf, Municipio.nome))
    return result.scalars().all()


@router.get("/{id}", response_model=MunicipioResponse)
async def buscar(
    id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    result = await db.execute(select(Municipio).where(Municipio.id == id))
    municipio = result.scalar_one_or_none()
    if not municipio:
        raise HTTPException(status_code=404, detail="Município não encontrado")
    return municipio


@router.post("/", response_model=MunicipioResponse, status_code=201)
async def criar(
    data: MunicipioCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    existe = await db.execute(select(Municipio).where(Municipio.codigo_ibge == data.codigo_ibge))
    if existe.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Município com código IBGE {data.codigo_ibge} já cadastrado")
    municipio = Municipio(**data.model_dump())
    db.add(municipio)
    await db.commit()
    await db.refresh(municipio)
    return municipio


@router.put("/{id}", response_model=MunicipioResponse)
async def atualizar(
    id: int,
    data: MunicipioUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    result = await db.execute(select(Municipio).where(Municipio.id == id))
    municipio = result.scalar_one_or_none()
    if not municipio:
        raise HTTPException(status_code=404, detail="Município não encontrado")
    for campo, valor in data.model_dump(exclude_none=True).items():
        setattr(municipio, campo, valor)
    await db.commit()
    await db.refresh(municipio)
    return municipio


@router.delete("/{id}", status_code=204)
async def remover(
    id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    result = await db.execute(select(Municipio).where(Municipio.id == id))
    municipio = result.scalar_one_or_none()
    if not municipio:
        raise HTTPException(status_code=404, detail="Município não encontrado")
    await db.delete(municipio)
    await db.commit()
