from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from typing import Optional
from database import get_db
from models.produtor import Produtor
from models.nota_fiscal import NotaFiscal
from models.usuario import Usuario
from models.usuario_produtor import usuario_produtor
from schemas.produtor import ProdutorCreate, ProdutorUpdate, ProdutorResponse, UsuarioProdutorNovo
from services.certificado_service import carregar_certificado, carregar_de_produtor
from services.auth_service import hash_password
from dependencies.auth import get_current_user, require_admin

router = APIRouter()


def _resp(p: Produtor) -> ProdutorResponse:
    return ProdutorResponse.from_orm_with_cert(p)


async def _check_acesso(user: Usuario, produtor_id: int, db: AsyncSession) -> None:
    """Lança 403 se um usuário do tipo 'produtor' não estiver vinculado ao produtor."""
    if user.role == "admin":
        return
    r = await db.execute(
        select(usuario_produtor).where(
            usuario_produtor.c.usuario_id == user.id,
            usuario_produtor.c.produtor_id == produtor_id,
        )
    )
    if not r.first():
        raise HTTPException(status_code=403, detail="Acesso negado a este produtor")


@router.get("/", response_model=list[ProdutorResponse])
async def listar(
    busca: Optional[str] = Query(None),
    apenas_ativos: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    q = select(Produtor)
    if apenas_ativos:
        q = q.where(Produtor.ativo == True)  # noqa: E712
    if busca:
        q = q.where(or_(Produtor.nome.ilike(f"%{busca}%"), Produtor.documento.ilike(f"%{busca}%")))
    if current_user.role != "admin":
        linked = select(usuario_produtor.c.produtor_id).where(
            usuario_produtor.c.usuario_id == current_user.id
        )
        q = q.where(Produtor.id.in_(linked))
    result = await db.execute(q.order_by(Produtor.nome))
    return [_resp(p) for p in result.scalars().all()]


@router.get("/{id}", response_model=ProdutorResponse)
async def detalhe(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    result = await db.execute(select(Produtor).where(Produtor.id == id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Produtor não encontrado")
    await _check_acesso(current_user, id, db)
    return _resp(p)


@router.post("/", response_model=ProdutorResponse, status_code=201)
async def criar(
    data: ProdutorCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    existe = await db.execute(select(Produtor).where(Produtor.documento == data.documento))
    if existe.scalar_one_or_none():
        tipo = "CNPJ" if len(data.documento) == 14 else "CPF"
        raise HTTPException(status_code=409, detail=f"{tipo} {data.documento} já cadastrado")
    p = Produtor(
        documento=data.documento,
        ie=data.ie,
        nome=data.nome,
        serie=data.serie,
        regime_tributario=data.regime_tributario,
        endereco=data.endereco.model_dump(),
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return _resp(p)


@router.put("/{id}", response_model=ProdutorResponse)
async def atualizar(
    id: int,
    data: ProdutorUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    result = await db.execute(select(Produtor).where(Produtor.id == id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Produtor não encontrado")
    await _check_acesso(current_user, id, db)
    updates = data.model_dump(exclude_none=True)
    if "endereco" in updates:
        updates["endereco"] = updates["endereco"].model_dump() if hasattr(updates["endereco"], "model_dump") else updates["endereco"]
    for campo, valor in updates.items():
        setattr(p, campo, valor)
    await db.commit()
    await db.refresh(p)
    return _resp(p)


@router.delete("/{id}", status_code=204)
async def remover(
    id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    result = await db.execute(select(Produtor).where(Produtor.id == id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Produtor não encontrado")
    notas = await db.execute(select(NotaFiscal).where(NotaFiscal.produtor_id == id).limit(1))
    if notas.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Produtor possui notas vinculadas. Inative-o em vez de remover.")
    await db.delete(p)
    await db.commit()


# ───────────────────────── CERTIFICADO ─────────────────────────

@router.post("/{id}/certificado")
async def upload_certificado(
    id: int,
    arquivo: UploadFile = File(...),
    senha: str = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    result = await db.execute(select(Produtor).where(Produtor.id == id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Produtor não encontrado")
    await _check_acesso(current_user, id, db)
    if not arquivo.filename.endswith((".pfx", ".p12")):
        raise HTTPException(status_code=400, detail="Formato inválido. Use .pfx ou .p12")

    pfx_bytes = await arquivo.read()
    info = carregar_certificado(pfx_bytes, senha)
    if not info["sucesso"]:
        raise HTTPException(status_code=422, detail=info["mensagem"])

    p.cert_pfx = pfx_bytes
    p.cert_senha = senha
    p.cert_validade = info["validade"]
    p.cert_titular = info["titular"]
    p.cert_serial = info["serial"]
    await db.commit()
    await db.refresh(p)
    return {
        "sucesso": True,
        "mensagem": "Certificado salvo com sucesso",
        "validade": p.cert_validade,
        "titular": p.cert_titular,
        "serial": p.cert_serial,
    }


@router.get("/{id}/certificado")
async def info_certificado(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    result = await db.execute(select(Produtor).where(Produtor.id == id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Produtor não encontrado")
    await _check_acesso(current_user, id, db)
    if not p.cert_pfx:
        return {"carregado": False}
    return {
        "carregado": True,
        "titular": p.cert_titular,
        "validade": p.cert_validade,
        "serial": p.cert_serial,
    }


@router.delete("/{id}/certificado", status_code=204)
async def remover_certificado(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    result = await db.execute(select(Produtor).where(Produtor.id == id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Produtor não encontrado")
    await _check_acesso(current_user, id, db)
    p.cert_pfx = None
    p.cert_senha = None
    p.cert_validade = None
    p.cert_titular = None
    p.cert_serial = None
    await db.commit()


@router.post("/{id}/certificado/ativar")
async def ativar_certificado(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Carrega o certificado do produtor no _cert_store global para uso imediato na emissão."""
    result = await db.execute(select(Produtor).where(Produtor.id == id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Produtor não encontrado")
    await _check_acesso(current_user, id, db)
    if not p.cert_pfx:
        raise HTTPException(status_code=422, detail="Produtor não possui certificado cadastrado")
    info = carregar_de_produtor(p)
    if not info["sucesso"]:
        raise HTTPException(status_code=422, detail=info["mensagem"])
    return {"sucesso": True, "mensagem": f"Certificado de {p.nome} ativado para emissão"}


# ───────────────────────── NOTAS ─────────────────────────

@router.get("/{id}/notas")
async def listar_notas(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    result = await db.execute(select(Produtor).where(Produtor.id == id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Produtor não encontrado")
    await _check_acesso(current_user, id, db)
    notas_result = await db.execute(
        select(NotaFiscal).where(NotaFiscal.produtor_id == id).order_by(NotaFiscal.criado_em.desc())
    )
    notas = notas_result.scalars().all()
    return {
        "total": len(notas),
        "notas": [
            {
                "id": n.id,
                "numero": n.numero,
                "serie": n.serie,
                "data_emissao": str(n.data_emissao),
                "destinatario_nome": n.destinatario_nome,
                "valor_total": n.valor_total,
                "status": n.status,
                "chave_acesso": n.chave_acesso,
            }
            for n in notas
        ],
    }


# ───────────────────────── USUÁRIOS VINCULADOS ─────────────────────────

@router.get("/{id}/usuarios")
async def listar_usuarios_produtor(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    result = await db.execute(
        select(Produtor).options(selectinload(Produtor.usuarios_vinculados)).where(Produtor.id == id)
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Produtor não encontrado")
    await _check_acesso(current_user, id, db)
    return [
        {"id": u.id, "username": u.username, "nome": u.nome, "role": u.role, "ativo": u.ativo}
        for u in p.usuarios_vinculados
    ]


@router.post("/{id}/usuarios", status_code=201)
async def criar_usuario_para_produtor(
    id: int,
    body: UsuarioProdutorNovo,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Cria um novo usuário produtor e vincula ao produtor.
    Se já existir um usuário com o mesmo username, vincula o existente."""
    p_result = await db.execute(
        select(Produtor).options(selectinload(Produtor.usuarios_vinculados)).where(Produtor.id == id)
    )
    p = p_result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Produtor não encontrado")
    await _check_acesso(current_user, id, db)

    u_result = await db.execute(select(Usuario).where(Usuario.username == body.username))
    existing = u_result.scalar_one_or_none()

    if existing:
        if existing not in p.usuarios_vinculados:
            p.usuarios_vinculados.append(existing)
            await db.commit()
        return {
            "id": existing.id, "username": existing.username, "nome": existing.nome,
            "role": existing.role, "ativo": existing.ativo, "criado": False,
            "mensagem": "Usuário existente vinculado ao produtor",
        }

    novo = Usuario(
        username=body.username,
        hashed_password=hash_password(body.password),
        nome=body.nome,
        email=body.email or None,
        role="produtor",
        produtores_vinculados=[p],
    )
    db.add(novo)
    await db.commit()
    return {
        "id": novo.id, "username": novo.username, "nome": novo.nome,
        "role": novo.role, "ativo": novo.ativo, "criado": True,
        "mensagem": "Usuário criado e vinculado ao produtor",
    }


@router.post("/{id}/usuarios/{user_id}", status_code=204)
async def vincular_usuario_produtor(
    id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    p_result = await db.execute(
        select(Produtor).options(selectinload(Produtor.usuarios_vinculados)).where(Produtor.id == id)
    )
    p = p_result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Produtor não encontrado")

    u_result = await db.execute(select(Usuario).where(Usuario.id == user_id))
    u = u_result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if u not in p.usuarios_vinculados:
        p.usuarios_vinculados.append(u)
        await db.commit()


@router.delete("/{id}/usuarios/{user_id}", status_code=204)
async def desvincular_usuario_produtor(
    id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    p_result = await db.execute(
        select(Produtor).options(selectinload(Produtor.usuarios_vinculados)).where(Produtor.id == id)
    )
    p = p_result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Produtor não encontrado")

    p.usuarios_vinculados = [u for u in p.usuarios_vinculados if u.id != user_id]
    await db.commit()
