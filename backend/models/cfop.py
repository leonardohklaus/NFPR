from sqlalchemy import String, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class CFOP(Base):
    __tablename__ = "cfops"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    codigo: Mapped[str] = mapped_column(String(4), unique=True, nullable=False, index=True)
    descricao: Mapped[str] = mapped_column(String(255), nullable=False)
    tipo: Mapped[str] = mapped_column(String(50))  # Ex: "Saída Interna", "Saída Interestadual"
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
