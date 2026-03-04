from pydantic import BaseModel, model_validator
from typing import Literal, Optional
from datetime import datetime

UserRole = Literal["admin", "produtor"]


class LoginRequest(BaseModel):
    identifier: str   # username or e-mail
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str
    nome: str
    user_id: int
    produtor_id: Optional[int] = None


class UsuarioCreate(BaseModel):
    username: str
    password: str
    nome: str
    email: Optional[str] = None
    role: UserRole = "produtor"
    produtor_id: Optional[int] = None
    produtor_ids: list[int] = []


class UsuarioUpdate(BaseModel):
    password: Optional[str] = None
    nome: Optional[str] = None
    email: Optional[str] = None
    role: Optional[UserRole] = None
    produtor_id: Optional[int] = None
    produtor_ids: Optional[list[int]] = None
    ativo: Optional[bool] = None


class UsuarioResponse(BaseModel):
    id: int
    username: str
    nome: str
    email: Optional[str] = None
    role: str
    produtor_id: Optional[int] = None
    produtor_ids: list[int] = []
    ativo: bool
    criado_em: datetime
    ultimo_acesso: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @model_validator(mode='before')
    @classmethod
    def _populate_produtor_ids(cls, data):
        if hasattr(data, '__mapper__'):
            try:
                ids = [p.id for p in data.produtores_vinculados]
            except Exception:
                ids = []
            return {
                'id': data.id,
                'username': data.username,
                'nome': data.nome,
                'email': data.email,
                'role': data.role,
                'produtor_id': data.produtor_id,
                'produtor_ids': ids,
                'ativo': data.ativo,
                'criado_em': data.criado_em,
                'ultimo_acesso': data.ultimo_acesso,
            }
        return data
