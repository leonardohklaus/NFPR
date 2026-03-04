from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from schemas.nfpr import CertificadoUploadResponse
from services.certificado_service import (
    carregar_certificado,
    info_certificado,
    limpar_certificado,
)
from models.usuario import Usuario
from dependencies.auth import get_current_user

router = APIRouter()


@router.post("/upload", response_model=CertificadoUploadResponse)
async def upload_certificado(
    arquivo: UploadFile = File(..., description="Arquivo .pfx ou .p12 do certificado digital"),
    senha: str = Form(..., description="Senha do certificado"),
    _: Usuario = Depends(get_current_user),
):
    """
    Faz upload do certificado digital A1 (.pfx/.p12)
    O certificado é armazenado em memória para uso nas transmissões
    """
    if not arquivo.filename.endswith((".pfx", ".p12")):
        raise HTTPException(
            status_code=400,
            detail="Formato inválido. O certificado deve ser .pfx ou .p12",
        )

    conteudo = await arquivo.read()
    resultado = carregar_certificado(conteudo, senha)

    return CertificadoUploadResponse(**resultado)


@router.get("/info")
def info_cert(_: Usuario = Depends(get_current_user)):
    """Retorna informações do certificado carregado"""
    return info_certificado()


@router.delete("/remover")
def remover_certificado(_: Usuario = Depends(get_current_user)):
    """Remove o certificado da memória"""
    limpar_certificado()
    return {"mensagem": "Certificado removido com sucesso"}


@router.get("/autoridades-certificadoras")
def listar_acs(_: Usuario = Depends(get_current_user)):
    """Lista as Autoridades Certificadoras credenciadas para ICP-Brasil"""
    return {
        "informacao": "Para emissão de NF-e, você precisa de um certificado ICP-Brasil (e-CPF ou e-CNPJ tipo A1 ou A3)",
        "autoridades_certificadoras": [
            {
                "nome": "Serpro",
                "site": "https://serpro.gov.br/menu/nossas-solucoes/por-produto/certificado-digital",
                "telefone": "0800 978 2329",
            },
            {
                "nome": "Certisign",
                "site": "https://www.certisign.com.br",
                "telefone": "0800 722 7844",
            },
            {
                "nome": "Valid Certificadora",
                "site": "https://www.validcertificadora.com.br",
                "telefone": "0800 722 5645",
            },
            {
                "nome": "Soluti",
                "site": "https://soluti.com.br",
                "telefone": "(61) 3039-9000",
            },
            {
                "nome": "AC Fenacon Certisign",
                "site": "https://www.fenacon.org.br",
                "descricao": "Indicada para produtores rurais e pequenos empresários",
            },
        ],
        "passos_obtencao": [
            "1. Escolha uma Autoridade Certificadora (AC) credenciada ICP-Brasil",
            "2. Para Produtor Rural, adquira e-CPF tipo A1 (arquivo) ou A3 (token/smartcard)",
            "3. Agende a validação presencial ou por videoconferência",
            "4. Após validação, baixe o certificado .pfx e guarde a senha",
            "5. Faça o upload do arquivo .pfx neste sistema",
        ],
        "tipo_recomendado": "e-CPF A1 para produtor rural pessoa física",
    }
