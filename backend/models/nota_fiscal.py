from datetime import date, datetime, timezone
from sqlalchemy import String, Float, Integer, Date, DateTime, ForeignKey, JSON, Enum as SAEnum, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
from schemas.nfpr import NaturezaOperacao, UnidadeMedida
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from models.produtor import Produtor


class NotaFiscal(Base):
    __tablename__ = "notas_fiscais"
    __table_args__ = (
        UniqueConstraint("produtor_id", "numero", name="uq_produtor_numero"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    numero: Mapped[int] = mapped_column(Integer, nullable=False)
    serie: Mapped[str] = mapped_column(String(3), default="001")
    chave_acesso: Mapped[str | None] = mapped_column(String(44), unique=True)
    numero_protocolo: Mapped[str | None] = mapped_column(String(20))
    ambiente: Mapped[int] = mapped_column(Integer, default=2)  # 1=Produção, 2=Homologação
    natureza_operacao: Mapped[str] = mapped_column(SAEnum(NaturezaOperacao))
    data_emissao: Mapped[date] = mapped_column(Date)
    data_saida: Mapped[date] = mapped_column(Date)
    hora_saida: Mapped[str] = mapped_column(String(8), default="00:00:00")
    status: Mapped[str] = mapped_column(String(20), default="pendente")  # pendente, autorizada, cancelada, rejeitada

    # Produtor (emitente)
    produtor_documento: Mapped[str] = mapped_column(String(20))  # CPF ou CNPJ raw
    produtor_ie: Mapped[str] = mapped_column(String(20))
    produtor_nome: Mapped[str] = mapped_column(String(100))
    produtor_endereco: Mapped[dict] = mapped_column(JSON)

    # Destinatário
    destinatario_cpf_cnpj: Mapped[str] = mapped_column(String(20))  # CPF ou CNPJ raw
    destinatario_ie: Mapped[str | None] = mapped_column(String(20))
    destinatario_nome: Mapped[str] = mapped_column(String(100))
    destinatario_endereco: Mapped[dict] = mapped_column(JSON)

    # Transporte
    transporte: Mapped[dict] = mapped_column(JSON)

    # Totais
    valor_total: Mapped[float] = mapped_column(Float, default=0.0)
    valor_icms: Mapped[float] = mapped_column(Float, default=0.0)
    valor_funrural: Mapped[float] = mapped_column(Float, default=0.0)

    forma_pagamento: Mapped[str] = mapped_column(String(2), default="90")
    mensagem_rejeicao: Mapped[str | None] = mapped_column(String(500))
    informacoes_adicionais: Mapped[str | None] = mapped_column(String(2000))
    xml_autorizado: Mapped[str | None] = mapped_column(String)
    data_autorizacao: Mapped[str | None] = mapped_column(String(25))
    xml_cancelamento: Mapped[str | None] = mapped_column(Text)
    protocolo_cancelamento: Mapped[str | None] = mapped_column(String(20))
    data_cancelamento: Mapped[str | None] = mapped_column(String(25))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # FK para produtor cadastrado (opcional — mantém compatibilidade com notas antigas)
    produtor_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("produtores.id"), nullable=True)
    produtor: Mapped["Produtor | None"] = relationship("Produtor", back_populates="notas")

    itens: Mapped[list["ItemNF"]] = relationship("ItemNF", back_populates="nota", cascade="all, delete-orphan")
    respostas_sefaz: Mapped[list["RespostaSefaz"]] = relationship("RespostaSefaz", back_populates="nota", cascade="all, delete-orphan", order_by="RespostaSefaz.criado_em")


class ItemNF(Base):
    __tablename__ = "itens_nota_fiscal"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nota_id: Mapped[int] = mapped_column(Integer, ForeignKey("notas_fiscais.id"), nullable=False)
    numero_item: Mapped[int] = mapped_column(Integer)
    codigo_produto: Mapped[str] = mapped_column(String(60))
    descricao: Mapped[str] = mapped_column(String(120))
    ncm: Mapped[str] = mapped_column(String(8))
    cfop: Mapped[str] = mapped_column(String(4))
    unidade: Mapped[str] = mapped_column(SAEnum(UnidadeMedida))
    quantidade: Mapped[float] = mapped_column(Float)
    valor_unitario: Mapped[float] = mapped_column(Float)
    valor_total: Mapped[float] = mapped_column(Float)
    aliq_icms: Mapped[float] = mapped_column(Float, default=0.0)
    valor_icms: Mapped[float] = mapped_column(Float, default=0.0)
    aliq_funrural: Mapped[float] = mapped_column(Float, default=0.0)
    valor_funrural: Mapped[float] = mapped_column(Float, default=0.0)
    aliq_senar: Mapped[float] = mapped_column(Float, default=0.0)
    valor_senar: Mapped[float] = mapped_column(Float, default=0.0)

    nota: Mapped["NotaFiscal"] = relationship("NotaFiscal", back_populates="itens")


class RespostaSefaz(Base):
    __tablename__ = "respostas_sefaz"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nota_id: Mapped[int] = mapped_column(Integer, ForeignKey("notas_fiscais.id"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(30))  # "autorizacao", "consulta", etc.
    codigo_status: Mapped[str | None] = mapped_column(String(10))
    mensagem: Mapped[str | None] = mapped_column(String(500))
    xml_enviado: Mapped[str | None] = mapped_column(Text)
    xml_recebido: Mapped[str | None] = mapped_column(Text)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    nota: Mapped["NotaFiscal"] = relationship("NotaFiscal", back_populates="respostas_sefaz")
