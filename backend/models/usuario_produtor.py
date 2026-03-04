from sqlalchemy import Table, Column, Integer, ForeignKey
from database import Base

usuario_produtor = Table(
    "usuario_produtores",
    Base.metadata,
    Column("usuario_id", Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True),
    Column("produtor_id", Integer, ForeignKey("produtores.id", ondelete="CASCADE"), primary_key=True),
)
