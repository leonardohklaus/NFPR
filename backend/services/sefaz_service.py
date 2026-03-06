"""
Serviço de integração com a SEFAZ-RS
Webservices NF-e 4.0 - Rio Grande do Sul
"""
import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
import xml.etree.ElementTree as ET
import re
from datetime import datetime
from typing import Optional
from lxml import etree
from signxml import XMLSigner, methods
from services.certificado_service import obter_cert_pem, obter_key_pem, certificado_carregado
import tempfile
import os

# URLs dos webservices SEFAZ-RS
URLS_SEFAZ = {
    "homologacao": {
        "NfeAutorizacao": "https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
        "NfeRetAutorizacao": "https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
        "NfeConsultaProtocolo": "https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx",
        "NfeStatusServico": "https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
        "NFeInutilizacao": "https://nfe-homologacao.sefazrs.rs.gov.br/ws/NFeInutilizacao/NFeInutilizacao4.asmx",
        "NFeRecepcaoEvento": "https://nfe-homologacao.sefazrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
    },
    "producao": {
        "NfeAutorizacao": "https://nfe.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
        "NfeRetAutorizacao": "https://nfe.sefazrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
        "NfeConsultaProtocolo": "https://nfe.sefazrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx",
        "NfeStatusServico": "https://nfe.sefazrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
        "NFeInutilizacao": "https://nfe.sefazrs.rs.gov.br/ws/NFeInutilizacao/NFeInutilizacao4.asmx",
        "NFeRecepcaoEvento": "https://nfe.sefazrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
    }
}

NAMESPACE_NFE = "http://www.portalfiscal.inf.br/nfe"
SOAP_ACTIONS = {
    "NFeStatusServico4": "nfeStatusServicoNF",
    "NFeAutorizacao4": "nfeAutorizacaoLote",
    "NFeConsultaProtocolo4": "nfeConsultaNF",
}


def _get_ambiente_str(ambiente: int) -> str:
    return "producao" if ambiente == 1 else "homologacao"


_DSIG_NS = "http://www.w3.org/2000/09/xmldsig#"
_DSIG_ALG = _DSIG_NS
_C14N = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"


class _NFeXMLSigner(XMLSigner):
    """Permite SHA1 para compatibilidade com assinatura XML da NF-e."""
    def check_deprecated_methods(self):
        return


def _assinar_xml(xml_str: str) -> Optional[str]:
    """Assina o XML com RSA-SHA1 enveloped signature (XMLDSig / NF-e 4.0)."""
    if not certificado_carregado():
        raise ValueError("Certificado digital não carregado")

    cert_pem = obter_cert_pem()
    key_pem = obter_key_pem()

    # Remove nós de texto em branco para estabilizar a canonicalização.
    parser = etree.XMLParser(remove_blank_text=True)
    root = etree.fromstring(xml_str.strip().encode("utf-8"), parser=parser)

    # Elemento a assinar: infNFe (possui atributo Id)
    inf_nfe = root.find(f"{{{NAMESPACE_NFE}}}infNFe")
    if inf_nfe is None:
        raise ValueError("Elemento infNFe não encontrado no XML")

    ref_id = inf_nfe.get("Id", "")

    signer = _NFeXMLSigner(
        method=methods.enveloped,
        signature_algorithm="rsa-sha1",
        digest_algorithm="sha1",
        c14n_algorithm=_C14N,
    )
    signed_root = signer.sign(
        root,
        key=key_pem,
        cert=cert_pem,
        reference_uri=f"#{ref_id}",
        id_attribute="Id",
        always_add_key_value=False,
    )

    return etree.tostring(signed_root, encoding="unicode", pretty_print=False)


def _montar_envelope_soap(xml_nfe: str, servico: str) -> str:
    """Monta envelope SOAP para envio à SEFAZ"""
    payload = _compactar_xml(xml_nfe)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                 xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                 xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Header>
    <nfeCabecMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/{servico}">
      <cUF>43</cUF>
      <versaoDados>4.00</versaoDados>
    </nfeCabecMsg>
  </soap12:Header>
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/{servico}">{payload}</nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>"""


def _soap_headers(servico: str) -> dict:
    action = f"http://www.portalfiscal.inf.br/nfe/wsdl/{servico}/{SOAP_ACTIONS[servico]}"
    return {
        # SOAP 1.2: action no Content-Type é o formato esperado por muitos endpoints da SEFAZ
        "Content-Type": f'application/soap+xml; charset=utf-8; action="{action}"',
        # Mantido por compatibilidade com alguns proxies/gateways
        "SOAPAction": action,
    }


def _compactar_xml(xml: str) -> str:
    """Remove espaços/quebras entre tags para evitar rejeição por caracteres de edição."""
    return re.sub(r">\s+<", "><", xml.strip())


def consultar_status_servico(ambiente: int = 2) -> dict:
    """Consulta o status do serviço SEFAZ-RS"""
    amb_str = _get_ambiente_str(ambiente)
    url = URLS_SEFAZ[amb_str]["NfeStatusServico"]
    amb_label = "Homologação" if ambiente == 2 else "Produção"

    if not certificado_carregado():
        return {
            "status": "erro",
            "mensagem": "Certificado digital não carregado. Faça o upload do certificado .pfx de um produtor para consultar o status.",
            "ambiente": amb_label,
            "data_consulta": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
        }

    xml_cons = (
        f'<consStatServ xmlns="{NAMESPACE_NFE}" versao="4.00">'
        f"<tpAmb>{ambiente}</tpAmb>"
        "<cUF>43</cUF>"
        "<xServ>STATUS</xServ>"
        "</consStatServ>"
    )

    envelope = _montar_envelope_soap(xml_cons, "NFeStatusServico4")

    cert_path = None
    key_path = None
    try:
        cert_pem = obter_cert_pem()
        key_pem = obter_key_pem()
        if not cert_pem or not key_pem:
            return {
                "status": "erro",
                "mensagem": "Certificado digital inválido na sessão. Recarregue o certificado do produtor e tente novamente.",
                "ambiente": amb_label,
                "data_consulta": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
            }

        with tempfile.NamedTemporaryFile(delete=False, suffix=".pem") as cf:
            cf.write(cert_pem)
            cert_path = cf.name
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pem") as kf:
            kf.write(key_pem)
            key_path = kf.name

        response = requests.post(
            url,
            data=envelope.encode("utf-8"),
            headers=_soap_headers("NFeStatusServico4"),
            cert=(cert_path, key_path),
            timeout=30,
            verify=False,
        )

        #print(response.text)

        if response.status_code == 200:
            root = ET.fromstring(response.text)
            ns = {"nfe": NAMESPACE_NFE}
            cstat = root.find(".//nfe:cStat", ns)
            xmotivo = root.find(".//nfe:xMotivo", ns)

            status_ok = cstat is not None and cstat.text == "107"
            return {
                "status": "operacional" if status_ok else "indisponível",
                "mensagem": xmotivo.text if xmotivo is not None else "Sem resposta",
                "codigo": cstat.text if cstat is not None else "N/A",
                "ambiente": amb_label,
                "data_consulta": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
            }
        else:
            return {
                "status": "erro",
                "mensagem": f"HTTP {response.status_code}",
                "ambiente": amb_label,
                "data_consulta": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
            }
    except requests.exceptions.SSLError as e:
        return {
            "status": "erro",
            "mensagem": f"Erro SSL: {str(e)[:120]}",
            "ambiente": amb_label,
            "data_consulta": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
        }
    except requests.exceptions.ConnectionError:
        return {
            "status": "erro",
            "mensagem": "Não foi possível conectar ao servidor da SEFAZ-RS. Verifique a conexão com a internet.",
            "ambiente": amb_label,
            "data_consulta": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
        }
    except Exception as e:
        return {
            "status": "erro",
            "mensagem": str(e),
            "ambiente": amb_label,
            "data_consulta": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
        }
    finally:
        for p in (cert_path, key_path):
            if p:
                try:
                    os.unlink(p)
                except OSError:
                    pass


def transmitir_nfe(xml_str: str, ambiente: int = 2) -> dict:
    """
    Assina e transmite a NF-e para a SEFAZ-RS
    """
    if not certificado_carregado():
        return {
            "sucesso": False,
            "mensagem": "Certificado digital não carregado. Faça o upload do certificado .pfx primeiro.",
        }

    try:
        # 1. Assinar XML
        xml_assinado = _assinar_xml(xml_str)

        # 2. Montar lote de envio
        amb_str = _get_ambiente_str(ambiente)
        url = URLS_SEFAZ[amb_str]["NfeAutorizacao"]

        xml_lote = (
            f'<enviNFe xmlns="{NAMESPACE_NFE}" versao="4.00">'
            "<idLote>1</idLote>"
            "<indSinc>1</indSinc>"
            # Nao alterar o XML apos assinar: qualquer mudanca quebra o digest da assinatura
            f"{xml_assinado}"
            "</enviNFe>"
        )

        envelope = _montar_envelope_soap(xml_lote, "NFeAutorizacao4")

        cert_pem = obter_cert_pem()
        key_pem = obter_key_pem()

        with tempfile.NamedTemporaryFile(delete=False, suffix=".pem") as cf:
            cf.write(cert_pem)
            cert_path = cf.name
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pem") as kf:
            kf.write(key_pem)
            key_path = kf.name

        try:
            response = requests.post(
                url,
                data=envelope.encode("utf-8"),
                headers=_soap_headers("NFeAutorizacao4"),
                cert=(cert_path, key_path),
                timeout=60,
                verify=False,
            )
        finally:
            os.unlink(cert_path)
            os.unlink(key_path)

        if response.status_code == 200:
            root = ET.fromstring(response.text)
            ns = {"nfe": NAMESPACE_NFE}
            # cStat do lote (retEnviNFe): ex. 103/104
            cstat_lote = root.find(".//nfe:retEnviNFe/nfe:cStat", ns)
            xmotivo_lote = root.find(".//nfe:retEnviNFe/nfe:xMotivo", ns)
            # cStat final da NF-e (protNFe/infProt): ex. 100/204/539
            cstat_nf = root.find(".//nfe:protNFe/nfe:infProt/nfe:cStat", ns)
            xmotivo_nf = root.find(".//nfe:protNFe/nfe:infProt/nfe:xMotivo", ns)
            nProt = root.find(".//nfe:protNFe/nfe:infProt/nfe:nProt", ns)
            chNFe = root.find(".//nfe:protNFe/nfe:infProt/nfe:chNFe", ns)
            dhRecbto = root.find(".//nfe:protNFe/nfe:infProt/nfe:dhRecbto", ns)

            cstat_final = cstat_nf if cstat_nf is not None else cstat_lote
            xmotivo_final = xmotivo_nf if xmotivo_nf is not None else xmotivo_lote
            autorizado = cstat_final is not None and cstat_final.text == "100"

            return {
                "sucesso": autorizado,
                "chave_acesso": chNFe.text if chNFe is not None else None,
                "numero_protocolo": nProt.text if nProt is not None else None,
                "data_autorizacao": dhRecbto.text if dhRecbto is not None else None,
                "xml_autorizado": xml_assinado,
                "mensagem": xmotivo_final.text if xmotivo_final is not None else "Sem resposta",
                "codigo_status": cstat_final.text if cstat_final is not None else None,
                "xml_enviado": envelope,
                "xml_recebido": response.text,
            }
        else:
            return {
                "sucesso": False,
                "mensagem": f"Erro HTTP {response.status_code}: {response.text[:200]}",
                "xml_enviado": envelope,
                "xml_recebido": response.text,
            }

    except Exception as e:
        return {"sucesso": False, "mensagem": f"Erro ao transmitir: {str(e)}"}


def _assinar_evento(xml_evento: str) -> str:
    """Assina o XML do evento NF-e com RSA-SHA1 (referência no elemento infEvento).

    A assinatura deve estar dentro do elemento <evento>, não em <envEvento>.
    Para isso, extraímos <evento> como documento independente, assinamos e
    reinserimos dentro de <envEvento>.
    """
    if not certificado_carregado():
        raise ValueError("Certificado digital não carregado")

    cert_pem = obter_cert_pem()
    key_pem = obter_key_pem()

    clean_parser = etree.XMLParser(remove_blank_text=True)
    env_root = etree.fromstring(xml_evento.strip().encode("utf-8"), clean_parser)

    ns = {"nfe": NAMESPACE_NFE}
    inf_evento = env_root.find(".//nfe:infEvento", ns)
    if inf_evento is None:
        raise ValueError("Elemento infEvento não encontrado no XML do evento")

    ref_id = inf_evento.get("Id", "")

    # Extrair <evento> como documento independente para que signxml o trate como raiz
    evento_el = env_root.find(f"{{{NAMESPACE_NFE}}}evento")
    evento_bytes = etree.tostring(evento_el, encoding="unicode").encode("utf-8")
    evento_standalone = etree.fromstring(evento_bytes, etree.XMLParser(remove_blank_text=True))

    signer = _NFeXMLSigner(
        method=methods.enveloped,
        signature_algorithm="rsa-sha1",
        digest_algorithm="sha1",
        c14n_algorithm=_C14N,
    )
    signed_evento = signer.sign(
        evento_standalone,          # <evento> como raiz do documento de assinatura
        key=key_pem,
        cert=cert_pem,
        reference_uri=f"#{ref_id}",
        id_attribute="Id",
        always_add_key_value=False,
    )

    # Reinserir o <evento> assinado dentro de <envEvento>
    env_root.remove(env_root.find(f"{{{NAMESPACE_NFE}}}evento"))
    env_root.append(signed_evento)

    return etree.tostring(env_root, encoding="unicode", pretty_print=False)


def cancelar_nfe(
    chave_acesso: str,
    numero_protocolo: str,
    cnpj_cpf: str,
    justificativa: str,
    ambiente: int = 2,
) -> dict:
    """
    Envia o evento de Cancelamento (tpEvento=110111) à SEFAZ-RS.
    Retorna dict com sucesso, protocolo_cancelamento, xml_cancelamento, xml_enviado, xml_recebido.
    """
    if not certificado_carregado():
        return {"sucesso": False, "mensagem": "Certificado digital não carregado."}

    if len(justificativa) < 15:
        return {"sucesso": False, "mensagem": "Justificativa deve ter ao menos 15 caracteres."}

    now = datetime.now()
    # Brazil UTC-3
    dh_evento = now.strftime("%Y-%m-%dT%H:%M:%S") + "-03:00"
    seq_ts = now.strftime("%Y%m%d%H%M%S") + "001"  # timestamp + sequência 001

    doc_raw = re.sub(r"\D", "", cnpj_cpf)
    if len(doc_raw) == 11:
        tag_doc = f"<CPF>{doc_raw}</CPF>"
    else:
        tag_doc = f"<CNPJ>{doc_raw}</CNPJ>"

    id_evento = f"ID110111{chave_acesso}01"

    xml_inf_evento = (
        f'<infEvento Id="{id_evento}">'
        f"<cOrgao>43</cOrgao>"
        f"<tpAmb>{ambiente}</tpAmb>"
        f"{tag_doc}"
        f"<chNFe>{chave_acesso}</chNFe>"
        f"<dhEvento>{dh_evento}</dhEvento>"
        f"<tpEvento>110111</tpEvento>"
        f"<nSeqEvento>1</nSeqEvento>"
        f"<verEvento>1.00</verEvento>"
        f'<detEvento versao="1.00">'
        f"<descEvento>Cancelamento</descEvento>"
        f"<nProt>{numero_protocolo}</nProt>"
        f"<xJust>{justificativa}</xJust>"
        f"</detEvento>"
        f"</infEvento>"
    )

    xml_evento = (
        f'<envEvento versao="1.00" xmlns="{NAMESPACE_NFE}">'
        f"<idLote>1</idLote>"
        f'<evento versao="1.00">'
        f"{xml_inf_evento}"
        f"</evento>"
        f"</envEvento>"
    )

    try:
        xml_assinado = _assinar_evento(xml_evento)
    except Exception as e:
        import traceback; traceback.print_exc()
        return {"sucesso": False, "mensagem": f"Erro ao assinar evento: {str(e)}"}

    amb_str = _get_ambiente_str(ambiente)
    url = URLS_SEFAZ[amb_str]["NFeRecepcaoEvento"]

    servico = "NFeRecepcaoEvento4"
    envelope = f"""<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                 xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                 xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Header>
    <nfeCabecMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/{servico}">
      <cUF>43</cUF>
      <versaoDados>1.00</versaoDados>
    </nfeCabecMsg>
  </soap12:Header>
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/{servico}">{_compactar_xml(xml_assinado)}</nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>"""

    headers = {
        "Content-Type": f'application/soap+xml; charset=utf-8; action="http://www.portalfiscal.inf.br/nfe/wsdl/{servico}/nfeRecepcaoEvento"',
        "SOAPAction": f'"http://www.portalfiscal.inf.br/nfe/wsdl/{servico}/nfeRecepcaoEvento"',
    }

    cert_pem = obter_cert_pem()
    key_pem = obter_key_pem()

    cert_path = None
    key_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pem") as cf:
            cf.write(cert_pem)
            cert_path = cf.name
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pem") as kf:
            kf.write(key_pem)
            key_path = kf.name

        response = requests.post(
            url,
            data=envelope.encode("utf-8"),
            headers=headers,
            cert=(cert_path, key_path),
            timeout=60,
            verify=False,
        )
    finally:
        for p in (cert_path, key_path):
            if p:
                try:
                    os.unlink(p)
                except OSError:
                    pass

    if response.status_code != 200:
        #print(response.text)
        return {
            "sucesso": False,
            "mensagem": f"Erro HTTP {response.status_code}",
            "xml_enviado": envelope,
            "xml_recebido": response.text,
        }

    root = ET.fromstring(response.text)
    ns = {"nfe": NAMESPACE_NFE}

    # cStat do lote (128 = "Lote de Evento Processado") — apenas para diagnóstico
    cstat_lote = root.find(".//nfe:retEnvEvento/nfe:cStat", ns)

    # Resultado do evento individual: retEvento > infEvento
    inf_evento_ret = root.find(".//nfe:retEvento/nfe:infEvento", ns)
    cstat = inf_evento_ret.find("nfe:cStat", ns) if inf_evento_ret is not None else None
    xmotivo = inf_evento_ret.find("nfe:xMotivo", ns) if inf_evento_ret is not None else None
    n_prot = inf_evento_ret.find("nfe:nProt", ns) if inf_evento_ret is not None else None
    dh_reg = inf_evento_ret.find("nfe:dhRegEvento", ns) if inf_evento_ret is not None else None

    # cStat 135 = Evento registrado e vinculado a NF-e
    # cStat 136 = Evento registrado, mas NF-e não encontrada na base
    cancelado = cstat is not None and cstat.text in ("135", "136")
    #print(f"[cancelar_nfe] cStat lote={cstat_lote.text if cstat_lote is not None else 'None'} | cStat evento={cstat.text if cstat is not None else 'None'} | {xmotivo.text if xmotivo is not None else 'sem motivo'}")

    return {
        "sucesso": cancelado,
        "codigo_status": cstat.text if cstat is not None else None,
        "mensagem": xmotivo.text if xmotivo is not None else "Sem resposta",
        "protocolo_cancelamento": n_prot.text if n_prot is not None else None,
        "data_cancelamento": dh_reg.text if dh_reg is not None else None,
        "xml_cancelamento": xml_assinado,
        "xml_enviado": envelope,
        "xml_recebido": response.text,
    }


def consultar_nfe(chave_acesso: str, ambiente: int = 2) -> dict:
    """Consulta uma NF-e pelo número da chave de acesso"""
    amb_str = _get_ambiente_str(ambiente)
    url = URLS_SEFAZ[amb_str]["NfeConsultaProtocolo"]

    xml_cons = (
        f'<consSitNFe xmlns="{NAMESPACE_NFE}" versao="4.00">'
        f"<tpAmb>{ambiente}</tpAmb>"
        "<xServ>CONSULTAR</xServ>"
        f"<chNFe>{chave_acesso}</chNFe>"
        "</consSitNFe>"
    )

    envelope = _montar_envelope_soap(xml_cons, "NFeConsultaProtocolo4")

    try:
        cert_pem = obter_cert_pem()
        key_pem = obter_key_pem()

        with tempfile.NamedTemporaryFile(delete=False, suffix=".pem") as cf:
            cf.write(cert_pem)
            cert_path = cf.name
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pem") as kf:
            kf.write(key_pem)
            key_path = kf.name

        try:
            response = requests.post(
                url,
                data=envelope.encode("utf-8"),
                headers=_soap_headers("NFeConsultaProtocolo4"),
                cert=(cert_path, key_path),
                timeout=30,
                verify=False,
            )
        finally:
            os.unlink(cert_path)
            os.unlink(key_path)

        root = ET.fromstring(response.text)
        ns = {"nfe": NAMESPACE_NFE}
        cstat = root.find(".//nfe:cStat", ns)
        xmotivo = root.find(".//nfe:xMotivo", ns)

        return {
            "sucesso": True,
            "codigo_status": cstat.text if cstat is not None else "N/A",
            "mensagem": xmotivo.text if xmotivo is not None else "N/A",
        }
    except Exception as e:
        return {"sucesso": False, "mensagem": str(e)}
