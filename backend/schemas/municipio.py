from pydantic import BaseModel
from typing import Optional


class MunicipioCreate(BaseModel):
    codigo_ibge: str
    nome: str
    uf: str
    ativo: bool = True


class MunicipioUpdate(BaseModel):
    nome: Optional[str] = None
    uf: Optional[str] = None
    ativo: Optional[bool] = None


class MunicipioResponse(BaseModel):
    id: int
    codigo_ibge: str
    nome: str
    uf: str
    ativo: bool

    model_config = {"from_attributes": True}
