from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from typing import Optional
from schemas.nfpr import NotaFiscalSchema, NFeAutorizacaoResponse
from services.xml_service import gerar_xml_nfe
from services.sefaz_service import transmitir_nfe, _assinar_xml, cancelar_nfe
from services.certificado_service import carregar_de_produtor
from database import get_db
from models.nota_fiscal import NotaFiscal, ItemNF, RespostaSefaz
from models.produtor import Produtor
from models.usuario import Usuario
from dependencies.auth import get_current_user
from pydantic import BaseModel

router = APIRouter()

NOME_HOMOLOGACAO = "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL"


class EmitirNotaRequest(NotaFiscalSchema):
    produtor_id: Optional[int] = None
    editar_nota_id: Optional[int] = None
    numero_override: Optional[int] = None  # Permite alterar o número ao reenviar nota rejeitada (ex: erro 104)


def _preparar_dados(nota: NotaFiscalSchema) -> dict:
    dados = nota.model_dump()
    dados["data_emissao"] = str(dados["data_emissao"])
    dados["data_saida"] = str(dados["data_saida"])
    dados["natureza_operacao"] = (
        dados["natureza_operacao"].value
        if hasattr(dados["natureza_operacao"], "value")
        else dados["natureza_operacao"]
    )
    dados["transporte"]["modalidade_frete"] = dados["transporte"].get("modalidade_frete", 9)
    for item in dados["itens"]:
        if hasattr(item["unidade"], "value"):
            item["unidade"] = item["unidade"].value
    return dados


async def _proximo_numero(db: AsyncSession, produtor_id: Optional[int] = None) -> int:
    q = select(func.max(NotaFiscal.numero))
    if produtor_id:
        q = q.where(NotaFiscal.produtor_id == produtor_id)
    result = await db.execute(q)
    maximo = result.scalar_one_or_none()
    return (maximo or 0) + 1


@router.post("/gerar-xml", response_class=Response)
async def gerar_xml(
    nota: NotaFiscalSchema,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    """Gera o XML da NF-e sem transmitir"""
    dados = _preparar_dados(nota)
    try:
        numero = await _proximo_numero(db)  # /gerar-xml sem produtor_id — sequência global
        xml_str, chave = gerar_xml_nfe(dados, numero)
        return Response(
            content=xml_str,
            media_type="application/xml",
            headers={"X-Chave-Acesso": chave},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/assinar-xml", response_class=Response)
async def assinar_xml(
    nota: EmitirNotaRequest,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    """Gera e assina o XML da NF-e sem transmitir"""
    produtor_id = nota.produtor_id
    if produtor_id:
        prod_result = await db.execute(select(Produtor).where(Produtor.id == produtor_id))
        produtor = prod_result.scalar_one_or_none()
        if not produtor:
            raise HTTPException(status_code=404, detail="Produtor não encontrado")
        info_cert = carregar_de_produtor(produtor)
        if not info_cert["sucesso"]:
            raise HTTPException(status_code=422, detail=f"Certificado inválido: {info_cert['mensagem']}")

    dados = _preparar_dados(nota)
    try:
        numero = await _proximo_numero(db, produtor_id)
        xml_str, chave = gerar_xml_nfe(dados, numero)
        xml_assinado = _assinar_xml(xml_str)
        return Response(
            content=xml_assinado,
            media_type="application/xml",
            headers={"X-Chave-Acesso": chave},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/emitir", response_model=NFeAutorizacaoResponse)
async def emitir_nota(
    nota: EmitirNotaRequest,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    """Gera, assina e transmite a NF-e para a SEFAZ-RS"""
    produtor_id = nota.produtor_id
    editar_nota_id = nota.editar_nota_id
    nota_rejeitada = None

    # Se vier produtor_id, ativa o certificado desse produtor
    if produtor_id:
        prod_result = await db.execute(select(Produtor).where(Produtor.id == produtor_id))
        produtor = prod_result.scalar_one_or_none()
        if not produtor:
            raise HTTPException(status_code=404, detail="Produtor não encontrado")
        info_cert = carregar_de_produtor(produtor)
        if not info_cert["sucesso"]:
            raise HTTPException(status_code=422, detail=f"Certificado inválido: {info_cert['mensagem']}")

    if editar_nota_id:
        nota_result = await db.execute(select(NotaFiscal).where(NotaFiscal.id == editar_nota_id))
        nota_rejeitada = nota_result.scalar_one_or_none()
        if not nota_rejeitada:
            raise HTTPException(status_code=404, detail="Nota rejeitada não encontrada")
        if nota_rejeitada.status != "rejeitada":
            raise HTTPException(status_code=422, detail="Apenas notas rejeitadas podem ser editadas e retransmitidas")

    dados = _preparar_dados(nota)
    if dados.get("ambiente", 2) == 2:
        dados["destinatario"]["nome"] = NOME_HOMOLOGACAO

    if nota_rejeitada:
        numero = nota.numero_override if nota.numero_override is not None else nota_rejeitada.numero
    else:
        numero = await _proximo_numero(db, produtor_id)

    try:
        xml_str, chave = gerar_xml_nfe(dados, numero)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar XML: {str(e)}")

    resultado = transmitir_nfe(xml_str, dados.get("ambiente", 2))

    # Persistir a nota no banco — tanto para autorizadas quanto para rejeitadas pela SEFAZ.
    # Notas com erro de comunicação (codigo_status=None e sucesso=False) não são salvas.
    sucesso = resultado.get("sucesso")
    codigo_status = resultado.get("codigo_status")
    nota_id = None

    if sucesso or codigo_status:
        status = "autorizada" if sucesso else "rejeitada"
        if nota_rejeitada:
            nota_db = nota_rejeitada
            nota_db.numero = numero  # sincroniza se houve numero_override
            nota_db.serie = str(dados.get("serie", nota_db.serie))
            nota_db.chave_acesso = resultado.get("chave_acesso") or chave
            nota_db.numero_protocolo = resultado.get("numero_protocolo")
            nota_db.ambiente = dados.get("ambiente", 2)
            nota_db.natureza_operacao = dados["natureza_operacao"]
            nota_db.data_emissao = nota.data_emissao
            nota_db.data_saida = nota.data_saida
            nota_db.hora_saida = nota.hora_saida
            nota_db.status = status
            nota_db.forma_pagamento = dados.get("forma_pagamento", "90")
            nota_db.mensagem_rejeicao = None if sucesso else resultado.get("mensagem")
            nota_db.produtor_id = produtor_id
            nota_db.produtor_documento = dados["produtor"]["documento"]
            nota_db.produtor_ie = dados["produtor"]["ie"]
            nota_db.produtor_nome = dados["produtor"]["nome"]
            nota_db.produtor_endereco = dados["produtor"]["endereco"]
            nota_db.destinatario_cpf_cnpj = dados["destinatario"]["cpf_cnpj"]
            nota_db.destinatario_ie = dados["destinatario"].get("ie")
            nota_db.destinatario_nome = dados["destinatario"]["nome"]
            nota_db.destinatario_endereco = dados["destinatario"]["endereco"]
            nota_db.transporte = dados["transporte"]
            nota_db.valor_total = sum(i["valor_total"] for i in dados["itens"])
            nota_db.valor_icms = sum(i.get("valor_icms", 0) for i in dados["itens"])
            nota_db.valor_funrural = sum(i.get("valor_funrural", 0) for i in dados["itens"])
            nota_db.informacoes_adicionais = dados.get("informacoes_adicionais")
            nota_db.xml_autorizado = resultado.get("xml_autorizado")
            nota_db.data_autorizacao = resultado.get("data_autorizacao")
            await db.execute(delete(ItemNF).where(ItemNF.nota_id == nota_db.id))
        else:
            nota_db = NotaFiscal(
                numero=numero,
                chave_acesso=resultado.get("chave_acesso") or chave,
                numero_protocolo=resultado.get("numero_protocolo"),
                ambiente=dados.get("ambiente", 2),
                natureza_operacao=dados["natureza_operacao"],
                data_emissao=nota.data_emissao,
                data_saida=nota.data_saida,
                hora_saida=nota.hora_saida,
                status=status,
                forma_pagamento=dados.get("forma_pagamento", "90"),
                mensagem_rejeicao=None if sucesso else resultado.get("mensagem"),
                produtor_id=produtor_id,
                produtor_documento=dados["produtor"]["documento"],
                produtor_ie=dados["produtor"]["ie"],
                produtor_nome=dados["produtor"]["nome"],
                produtor_endereco=dados["produtor"]["endereco"],
                destinatario_cpf_cnpj=dados["destinatario"]["cpf_cnpj"],
                destinatario_ie=dados["destinatario"].get("ie"),
                destinatario_nome=dados["destinatario"]["nome"],
                destinatario_endereco=dados["destinatario"]["endereco"],
                transporte=dados["transporte"],
                valor_total=sum(i["valor_total"] for i in dados["itens"]),
                valor_icms=sum(i.get("valor_icms", 0) for i in dados["itens"]),
                valor_funrural=sum(i.get("valor_funrural", 0) for i in dados["itens"]),
                informacoes_adicionais=dados.get("informacoes_adicionais"),
                xml_autorizado=resultado.get("xml_autorizado"),
                data_autorizacao=resultado.get("data_autorizacao"),
            )
            db.add(nota_db)
            await db.flush()

        for item in dados["itens"]:
            db.add(ItemNF(
                nota_id=nota_db.id,
                numero_item=item["numero_item"],
                codigo_produto=item["codigo_produto"],
                descricao=item["descricao"],
                ncm=item["ncm"].replace(".", ""),
                cfop=item["cfop"],
                unidade=item["unidade"],
                quantidade=item["quantidade"],
                valor_unitario=item["valor_unitario"],
                valor_total=item["valor_total"],
                aliq_icms=item.get("aliq_icms", 0),
                valor_icms=item.get("valor_icms", 0),
                aliq_funrural=item.get("aliq_funrural", 0),
                valor_funrural=item.get("valor_funrural", 0),
                aliq_senar=item.get("aliq_senar", 0),
                valor_senar=item.get("valor_senar", 0),
            ))

        await db.commit()
        nota_id = nota_db.id

        # Salvar retorno SEFAZ
        db.add(RespostaSefaz(
            nota_id=nota_id,
            tipo="autorizacao",
            codigo_status=resultado.get("codigo_status"),
            mensagem=resultado.get("mensagem"),
            xml_enviado=resultado.get("xml_enviado"),
            xml_recebido=resultado.get("xml_recebido"),
        ))
        await db.commit()

    return NFeAutorizacaoResponse(**resultado, nota_id=nota_id)


@router.get("/listar")
async def listar_notas(
    produtor_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    """Lista as notas emitidas, opcionalmente filtradas por produtor"""
    q = select(NotaFiscal).order_by(NotaFiscal.criado_em.desc()).limit(200)
    if produtor_id:
        q = q.where(NotaFiscal.produtor_id == produtor_id)
    result = await db.execute(q)
    notas = result.scalars().all()
    return {
        "total": len(notas),
        "notas": [
            {
                "id": n.id,
                "numero": n.numero,
                "serie": n.serie,
                "data_emissao": str(n.data_emissao),
                "produtor_nome": n.produtor_nome,
                "destinatario_nome": n.destinatario_nome,
                "valor_total": n.valor_total,
                "status": n.status,
                "chave_acesso": n.chave_acesso,
            }
            for n in notas
        ],
    }


@router.get("/proxima-numeracao")
async def proxima_numeracao(
    produtor_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    numero = await _proximo_numero(db, produtor_id)
    serie = "001"
    if produtor_id:
        prod_result = await db.execute(select(Produtor).where(Produtor.id == produtor_id))
        produtor = prod_result.scalar_one_or_none()
        if produtor:
            serie = produtor.serie or "001"
    return {"numero": numero, "serie": serie}


@router.get("/{nota_id}/respostas")
async def listar_respostas_sefaz(
    nota_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    """Lista os retornos SEFAZ registrados para uma nota"""
    result = await db.execute(
        select(RespostaSefaz)
        .where(RespostaSefaz.nota_id == nota_id)
        .order_by(RespostaSefaz.criado_em)
    )
    respostas = result.scalars().all()
    return [
        {
            "id": r.id,
            "tipo": r.tipo,
            "codigo_status": r.codigo_status,
            "mensagem": r.mensagem,
            "xml_enviado": r.xml_enviado,
            "xml_recebido": r.xml_recebido,
            "criado_em": r.criado_em.isoformat() if r.criado_em else None,
        }
        for r in respostas
    ]


class CancelarNotaRequest(BaseModel):
    justificativa: str


@router.post("/{nota_id}/cancelar")
async def cancelar_nota(
    nota_id: int,
    body: CancelarNotaRequest,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    """Cancela uma NF-e autorizada junto à SEFAZ-RS"""
    result = await db.execute(select(NotaFiscal).where(NotaFiscal.id == nota_id))
    nota = result.scalar_one_or_none()
    if not nota:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    if nota.status != "autorizada":
        raise HTTPException(status_code=422, detail="Apenas notas autorizadas podem ser canceladas")
    if not nota.chave_acesso or not nota.numero_protocolo:
        raise HTTPException(status_code=422, detail="Nota sem chave de acesso ou protocolo de autorização")

    # Carregar certificado do produtor vinculado
    if nota.produtor_id:
        prod_result = await db.execute(select(Produtor).where(Produtor.id == nota.produtor_id))
        produtor = prod_result.scalar_one_or_none()
        if produtor:
            info_cert = carregar_de_produtor(produtor)
            if not info_cert["sucesso"]:
                raise HTTPException(status_code=422, detail=f"Certificado inválido: {info_cert['mensagem']}")

    resultado = cancelar_nfe(
        chave_acesso=nota.chave_acesso,
        numero_protocolo=nota.numero_protocolo,
        cnpj_cpf=nota.produtor_documento,
        justificativa=body.justificativa,
        ambiente=nota.ambiente,
    )

    # Registrar retorno SEFAZ independentemente do resultado
    db.add(RespostaSefaz(
        nota_id=nota_id,
        tipo="cancelamento",
        codigo_status=resultado.get("codigo_status"),
        mensagem=resultado.get("mensagem"),
        xml_enviado=resultado.get("xml_enviado"),
        xml_recebido=resultado.get("xml_recebido"),
    ))

    if resultado.get("sucesso"):
        nota.status = "cancelada"
        nota.xml_cancelamento = resultado.get("xml_cancelamento")
        nota.protocolo_cancelamento = resultado.get("protocolo_cancelamento")
        nota.data_cancelamento = resultado.get("data_cancelamento")

    await db.commit()

    if not resultado.get("sucesso"):
        raise HTTPException(
            status_code=422,
            detail=resultado.get("mensagem", "Cancelamento rejeitado pela SEFAZ"),
        )

    return {
        "sucesso": True,
        "mensagem": resultado.get("mensagem"),
        "protocolo_cancelamento": resultado.get("protocolo_cancelamento"),
        "data_cancelamento": resultado.get("data_cancelamento"),
    }


@router.get("/{nota_id}/xml", response_class=Response)
async def baixar_xml(
    nota_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    """Baixa o XML da nota — cancelamento (se cancelada) ou autorização"""
    result = await db.execute(select(NotaFiscal).where(NotaFiscal.id == nota_id))
    nota = result.scalar_one_or_none()
    if not nota:
        raise HTTPException(status_code=404, detail="Nota não encontrada")

    if nota.status == "cancelada" and nota.xml_cancelamento:
        xml_content = nota.xml_cancelamento
        filename = f"canc_{nota.numero:06d}_{nota.chave_acesso or 'sem-chave'}.xml"
    elif nota.xml_autorizado:
        xml_content = nota.xml_autorizado
        filename = f"nfe_{nota.numero:06d}_{nota.chave_acesso or 'sem-chave'}.xml"
    else:
        raise HTTPException(status_code=404, detail="XML não disponível para esta nota")

    return Response(
        content=xml_content,
        media_type="application/xml",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Chave-Acesso": nota.chave_acesso or "",
        },
    )


@router.get("/{nota_id}")
async def detalhe_nota(
    nota_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    """Retorna detalhes completos de uma nota para reimpressão do DANFE"""
    result = await db.execute(select(NotaFiscal).where(NotaFiscal.id == nota_id))
    nota = result.scalar_one_or_none()
    if not nota:
        raise HTTPException(status_code=404, detail="Nota não encontrada")

    itens_result = await db.execute(
        select(ItemNF).where(ItemNF.nota_id == nota_id).order_by(ItemNF.numero_item)
    )
    itens = itens_result.scalars().all()

    def inferir_cst(item: ItemNF) -> str:
        if item.valor_icms > 0:
            return "51"
        return "41"

    nat_op = (
        nota.natureza_operacao.value
        if hasattr(nota.natureza_operacao, "value")
        else nota.natureza_operacao
    )

    return {
        "id": nota.id,
        "produtor_id": nota.produtor_id,
        "numero": nota.numero,
        "serie": nota.serie,
        "ambiente": nota.ambiente,
        "natureza_operacao": nat_op,
        "data_emissao": str(nota.data_emissao),
        "data_saida": str(nota.data_saida),
        "hora_saida": nota.hora_saida,
        "status": nota.status,
        "chave_acesso": nota.chave_acesso,
        "numero_protocolo": nota.numero_protocolo,
        "data_autorizacao": nota.data_autorizacao,
        "produtor": {
            "documento": nota.produtor_documento,
            "ie": nota.produtor_ie,
            "nome": nota.produtor_nome,
            "serie": nota.serie,
            "endereco": nota.produtor_endereco,
        },
        "destinatario": {
            "cpf_cnpj": nota.destinatario_cpf_cnpj,
            "ie": nota.destinatario_ie,
            "nome": nota.destinatario_nome,
            "endereco": nota.destinatario_endereco,
        },
        "transporte": nota.transporte,
        "itens": [
            {
                "numero_item": i.numero_item,
                "codigo_produto": i.codigo_produto,
                "descricao": i.descricao,
                "ncm": i.ncm,
                "cfop": i.cfop,
                "unidade": i.unidade.value if hasattr(i.unidade, "value") else i.unidade,
                "quantidade": i.quantidade,
                "valor_unitario": i.valor_unitario,
                "valor_total": i.valor_total,
                "cst_icms": inferir_cst(i),
                "aliq_icms": i.aliq_icms,
                "valor_icms": i.valor_icms,
                "aliq_funrural": i.aliq_funrural,
                "valor_funrural": i.valor_funrural,
                "aliq_senar": i.aliq_senar,
                "valor_senar": i.valor_senar,
            }
            for i in itens
        ],
        "informacoes_adicionais": nota.informacoes_adicionais,
        "forma_pagamento": nota.forma_pagamento or "90",
        "mensagem_rejeicao": nota.mensagem_rejeicao,
        "valor_total": nota.valor_total,
        "valor_icms": nota.valor_icms,
        "valor_funrural": nota.valor_funrural,
        "protocolo_cancelamento": nota.protocolo_cancelamento,
        "data_cancelamento": nota.data_cancelamento,
    }
