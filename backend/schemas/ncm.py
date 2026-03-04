from pydantic import BaseModel
from typing import Optional


class NcmCreate(BaseModel):
    codigo: str
    descricao: str
    ativo: bool = True


class NcmUpdate(BaseModel):
    descricao: Optional[str] = None
    ativo: Optional[bool] = None


class NcmResponse(BaseModel):
    id: int
    codigo: str
    descricao: str
    ativo: bool

    model_config = {"from_attributes": True}
