"""
Serviço de gerenciamento de Certificado Digital ICP-Brasil
Suporta certificados A1 (.pfx / .p12) e A3 (via token/smartcard)
"""
import os
import base64
from datetime import datetime
from typing import Optional, Tuple
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography import x509
import tempfile

# Armazenamento em memória para o certificado da sessão
_cert_store = {
    "cert_pem": None,
    "key_pem": None,
    "chain_pem": None,
    "pfx_data": None,
    "senha": None,
    "validade": None,
    "titular": None,
    "serial": None,
    "carregado": False,
}


def carregar_certificado(pfx_bytes: bytes, senha: str) -> dict:
    """
    Carrega um certificado .pfx/.p12 e extrai cert + chave privada
    """
    try:
        senha_bytes = senha.encode("utf-8") if senha else None
        privkey, cert, chain = pkcs12.load_key_and_certificates(
            pfx_bytes, senha_bytes
        )

        # Extrair PEM
        cert_pem = cert.public_bytes(serialization.Encoding.PEM)
        key_pem = privkey.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.TraditionalOpenSSL,
            serialization.NoEncryption(),
        )

        # Informações do certificado
        validade = cert.not_valid_after_utc.strftime("%d/%m/%Y %H:%M:%S")
        titular = cert.subject.get_attributes_for_oid(x509.NameOID.COMMON_NAME)[0].value

        # Serial number
        serial = format(cert.serial_number, "X")

        # Verificar se ainda é válido
        agora = datetime.now(tz=cert.not_valid_after_utc.tzinfo)
        if agora > cert.not_valid_after_utc:
            return {"sucesso": False, "mensagem": "Certificado expirado"}

        # Armazenar
        _cert_store.update({
            "cert_pem": cert_pem,
            "key_pem": key_pem,
            "pfx_data": pfx_bytes,
            "senha": senha,
            "validade": validade,
            "titular": titular,
            "serial": serial,
            "carregado": True,
        })

        return {
            "sucesso": True,
            "mensagem": "Certificado carregado com sucesso",
            "validade": validade,
            "titular": titular,
            "serial": serial,
        }

    except Exception as e:
        return {"sucesso": False, "mensagem": f"Erro ao carregar certificado: {str(e)}"}


def certificado_carregado() -> bool:
    return _cert_store["carregado"]


def obter_cert_pem() -> Optional[bytes]:
    return _cert_store["cert_pem"]


def obter_key_pem() -> Optional[bytes]:
    return _cert_store["key_pem"]


def obter_pfx() -> Tuple[Optional[bytes], Optional[str]]:
    return _cert_store["pfx_data"], _cert_store["senha"]


def info_certificado() -> dict:
    if not _cert_store["carregado"]:
        return {"carregado": False}
    return {
        "carregado": True,
        "titular": _cert_store["titular"],
        "validade": _cert_store["validade"],
        "serial": _cert_store["serial"],
    }


def limpar_certificado():
    _cert_store.update({
        "cert_pem": None,
        "key_pem": None,
        "chain_pem": None,
        "pfx_data": None,
        "senha": None,
        "validade": None,
        "titular": None,
        "serial": None,
        "carregado": False,
    })


def carregar_de_produtor(produtor) -> dict:
    """Carrega o certificado de um registro Produtor (do banco) no _cert_store global."""
    if not produtor.cert_pfx:
        return {"sucesso": False, "mensagem": "Produtor não possui certificado cadastrado"}
    return carregar_certificado(produtor.cert_pfx, produtor.cert_senha or "")
