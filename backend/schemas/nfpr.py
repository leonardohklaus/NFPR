from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date
from enum import Enum


class NaturezaOperacao(str, Enum):
    VENDA = "Venda de produção do estabelecimento"
    REMESSA = "Remessa para industrialização"
    TRANSFERENCIA = "Transferência de produção do estabelecimento"
    DEVOLUCAO = "Devolução de compra para industrialização"
    OUTROS = "Outros"


class UnidadeMedida(str, Enum):
    KG = "KG"
    TON = "TON"
    SC = "SC"
    L = "L"
    DZ = "DZ"
    UN = "UN"
    CX = "CX"


class EnderecoSchema(BaseModel):
    logradouro: str
    numero: str
    complemento: Optional[str] = None
    bairro: str
    municipio: str
    cod_municipio: str
    uf: str = "RS"
    cep: str
    telefone: Optional[str] = None


class ProdutorSchema(BaseModel):
    documento: str  # CPF (11 chars raw) ou CNPJ (14 chars raw), sem formatação
    ie: str  # Inscrição Estadual do Produtor Rural
    nome: str
    endereco: EnderecoSchema


class DestinatarioSchema(BaseModel):
    cpf_cnpj: str
    ie: Optional[str] = None
    nome: str
    endereco: EnderecoSchema


class ItemNFSchema(BaseModel):
    numero_item: int
    codigo_produto: str
    descricao: str
    ncm: str
    cfop: str
    unidade: UnidadeMedida
    quantidade: float
    valor_unitario: float
    valor_total: float
    # Impostos
    cst_icms: Optional[str] = "41"       # 40=isento, 41=não tributado, 51=diferido
    aliq_icms: Optional[float] = 0.0
    valor_icms: Optional[float] = 0.0    # valor ICMS da operação (antes do diferimento)
    aliq_funrural: Optional[float] = 2.5
    valor_funrural: Optional[float] = 0.0
    aliq_senar: Optional[float] = 0.2
    valor_senar: Optional[float] = 0.0


class TransporteSchema(BaseModel):
    modalidade_frete: int = 9  # 9 = Sem frete
    transportador_nome: Optional[str] = None
    transportador_cnpj: Optional[str] = None
    placa_veiculo: Optional[str] = None
    uf_veiculo: Optional[str] = None
    quantidade_volumes: Optional[int] = None
    especie_volumes: Optional[str] = None
    peso_bruto: Optional[float] = None
    peso_liquido: Optional[float] = None


class NotaFiscalSchema(BaseModel):
    # Identificação
    ambiente: int = 2  # 1=Produção, 2=Homologação
    serie: Optional[str] = "001"  # Série da NF-e — vem do cadastro do produtor
    natureza_operacao: NaturezaOperacao
    data_emissao: date
    data_saida: date
    hora_saida: str = "00:00:00"
    # Partes
    produtor: ProdutorSchema
    destinatario: DestinatarioSchema
    # Produtos
    itens: List[ItemNFSchema]
    # Transporte
    transporte: TransporteSchema
    # Forma de pagamento (tPag NF-e 4.0): 90=Sem Pagamento, 17=PIX, 18=Transferência,
    # 15=Boleto, 01=Dinheiro, 02=Cheque, 99=Outros
    forma_pagamento: str = "90"
    informacoes_adicionais: Optional[str] = None


class CertificadoUploadResponse(BaseModel):
    sucesso: bool
    mensagem: str
    validade: Optional[str] = None
    titular: Optional[str] = None
    serial: Optional[str] = None


class NFeAutorizacaoResponse(BaseModel):
    sucesso: bool
    chave_acesso: Optional[str] = None
    numero_protocolo: Optional[str] = None
    data_autorizacao: Optional[str] = None
    xml_autorizado: Optional[str] = None
    mensagem: str
    codigo_status: Optional[str] = None
    nota_id: Optional[int] = None


class ConsultaStatusSefaz(BaseModel):
    status: str
    mensagem: str
    ambiente: str
    data_consulta: str
