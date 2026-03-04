from sqlalchemy import String, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class Municipio(Base):
    __tablename__ = "municipios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    codigo_ibge: Mapped[str] = mapped_column(String(7), unique=True, nullable=False, index=True)
    nome: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    uf: Mapped[str] = mapped_column(String(2), nullable=False, index=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
