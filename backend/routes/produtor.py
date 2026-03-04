from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models.ncm import NCM
from models.municipio import Municipio
from models.usuario import Usuario
from dependencies.auth import get_current_user
from typing import Optional

router = APIRouter()


@router.get("/municipios-rs")
async def municipios_rs(
    uf: Optional[str] = Query(None, description="Filtrar por UF (RS, SC, PR, MG)"),
    busca: Optional[str] = Query(None, description="Filtrar por nome"),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    """Retorna municípios cadastrados, por padrão do RS"""
    query = select(Municipio).where(Municipio.ativo == True)  # noqa: E712
    if uf:
        query = query.where(Municipio.uf == uf.upper())
    else:
        query = query.where(Municipio.uf == "RS")
    if busca:
        query = query.where(Municipio.nome.ilike(f"%{busca}%"))
    result = await db.execute(query.order_by(Municipio.nome))
    municipios = result.scalars().all()
    return {
        "municipios": [{"codigo": m.codigo_ibge, "nome": m.nome, "uf": m.uf} for m in municipios]
    }


@router.get("/ncm-produtos-rurais")
async def ncm_produtos_rurais(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    """NCMs cadastrados para produtos da agricultura gaúcha"""
    result = await db.execute(select(NCM).where(NCM.ativo == True).order_by(NCM.codigo))  # noqa: E712
    ncms = result.scalars().all()
    return {
        "produtos": [{"ncm": n.codigo, "descricao": n.descricao} for n in ncms]
    }
