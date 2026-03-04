from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Integer, DateTime, LargeBinary, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
from .usuario_produtor import usuario_produtor


class Produtor(Base):
    __tablename__ = "produtores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    documento: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)  # CPF (11 chars) ou CNPJ (14 chars), raw sem formatação
    ie: Mapped[str] = mapped_column(String(20), nullable=False)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    serie: Mapped[str] = mapped_column(String(10), nullable=False, server_default="001")
    endereco: Mapped[dict] = mapped_column(JSON, nullable=False)
    regime_tributario: Mapped[str] = mapped_column(String(20), nullable=False, server_default="simples")  # simples | presumido | real
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Certificado digital armazenado no banco
    cert_pfx: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    cert_senha: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cert_validade: Mapped[str | None] = mapped_column(String(25), nullable=True)
    cert_titular: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cert_serial: Mapped[str | None] = mapped_column(String(100), nullable=True)

    notas: Mapped[list["NotaFiscal"]] = relationship(  # type: ignore[name-defined]
        "NotaFiscal", back_populates="produtor", lazy="select"
    )
    usuarios_vinculados: Mapped[list["Usuario"]] = relationship(  # type: ignore[name-defined]
        "Usuario",
        secondary=usuario_produtor,
        lazy="selectin",
        back_populates="produtores_vinculados",
    )
