from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
from .usuario_produtor import usuario_produtor


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="produtor")  # admin | produtor
    produtor_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("produtores.id"), nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    ultimo_acesso: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    produtor: Mapped["Produtor | None"] = relationship(  # type: ignore[name-defined]
        "Produtor", foreign_keys=[produtor_id], lazy="select"
    )
    produtores_vinculados: Mapped[list["Produtor"]] = relationship(  # type: ignore[name-defined]
        "Produtor",
        secondary=usuario_produtor,
        lazy="selectin",
        back_populates="usuarios_vinculados",
    )
