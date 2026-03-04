from pydantic import BaseModel
from typing import Optional


class CfopCreate(BaseModel):
    codigo: str
    descricao: str
    tipo: str
    ativo: bool = True


class CfopUpdate(BaseModel):
    descricao: Optional[str] = None
    tipo: Optional[str] = None
    ativo: Optional[bool] = None


class CfopResponse(BaseModel):
    id: int
    codigo: str
    descricao: str
    tipo: str
    ativo: bool

    model_config = {"from_attributes": True}
