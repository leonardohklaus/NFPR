from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from schemas.nfpr import EnderecoSchema


class UsuarioProdutorNovo(BaseModel):
    username: str
    nome: str
    password: str
    email: Optional[str] = None


class ProdutorCreate(BaseModel):
    documento: str  # CPF (11 chars raw) ou CNPJ (14 chars raw, sem formatação)
    ie: str
    nome: str
    serie: str = "001"
    regime_tributario: str = "simples"  # simples | presumido | real (apenas para CNPJ)
    endereco: EnderecoSchema


class ProdutorUpdate(BaseModel):
    ie: Optional[str] = None
    nome: Optional[str] = None
    serie: Optional[str] = None
    regime_tributario: Optional[str] = None
    endereco: Optional[EnderecoSchema] = None
    ativo: Optional[bool] = None


class ProdutorResponse(BaseModel):
    id: int
    documento: str  # CPF (11 chars) ou CNPJ (14 chars), raw sem formatação
    ie: str
    nome: str
    serie: str = "001"
    regime_tributario: str = "simples"
    endereco: dict
    ativo: bool
    criado_em: datetime
    cert_carregado: bool = False
    cert_titular: Optional[str] = None
    cert_validade: Optional[str] = None
    cert_serial: Optional[str] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_cert(cls, obj) -> "ProdutorResponse":
        return cls(
            id=obj.id,
            documento=obj.documento,
            ie=obj.ie,
            nome=obj.nome,
            serie=getattr(obj, "serie", "001"),
            regime_tributario=getattr(obj, "regime_tributario", "simples"),
            endereco=obj.endereco,
            ativo=obj.ativo,
            criado_em=obj.criado_em,
            cert_carregado=obj.cert_pfx is not None,
            cert_titular=obj.cert_titular,
            cert_validade=obj.cert_validade,
            cert_serial=obj.cert_serial,
        )
