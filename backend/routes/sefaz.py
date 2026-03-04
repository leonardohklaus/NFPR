from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from services.sefaz_service import consultar_status_servico, consultar_nfe
from services.certificado_service import carregar_de_produtor
from database import get_db
from models.cfop import CFOP
from models.produtor import Produtor
from models.usuario import Usuario
from models.usuario_produtor import usuario_produtor
from dependencies.auth import get_current_user

router = APIRouter()


@router.get("/status")
async def status_sefaz(
    ambiente: int = 2,
    produtor_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Consulta o status do serviço SEFAZ-RS"""
    if produtor_id:
        result = await db.execute(select(Produtor).where(Produtor.id == produtor_id))
        produtor = result.scalar_one_or_none()
        if not produtor:
            return {"status": "erro", "mensagem": "Produtor não encontrado"}

        if current_user.role != "admin":
            vinculo = await db.execute(
                select(usuario_produtor).where(
                    usuario_produtor.c.usuario_id == current_user.id,
                    usuario_produtor.c.produtor_id == produtor_id,
                )
            )
            if not vinculo.first():
                return {"status": "erro", "mensagem": "Acesso negado ao produtor selecionado"}

        info = carregar_de_produtor(produtor)
        if not info["sucesso"]:
            return {"status": "erro", "mensagem": info["mensagem"]}

    return consultar_status_servico(ambiente)


@router.get("/consultar/{chave_acesso}")
def consultar(
    chave_acesso: str,
    ambiente: int = 2,
    _: Usuario = Depends(get_current_user),
):
    """Consulta situação de uma NF-e na SEFAZ-RS"""
    if len(chave_acesso) != 44:
        return {"sucesso": False, "mensagem": "Chave de acesso deve ter 44 dígitos"}
    return consultar_nfe(chave_acesso, ambiente)


@router.get("/cfop-produtor-rural")
async def listar_cfops(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    """Lista os CFOPs cadastrados para produtores rurais"""
    result = await db.execute(select(CFOP).where(CFOP.ativo == True).order_by(CFOP.codigo))  # noqa: E712
    cfops = result.scalars().all()
    return {
        "cfops": [
            {"codigo": c.codigo, "descricao": c.descricao, "tipo": c.tipo}
            for c in cfops
        ]
    }
