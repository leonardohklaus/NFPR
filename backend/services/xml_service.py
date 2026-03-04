"""
Serviço de geração de XML NF-e para Produtor Rural - RS
Segue o layout técnico da SEFAZ-RS (NF-e 4.0)
"""
import uuid
from datetime import datetime
from lxml import etree
from typing import Dict, Any

NAMESPACE = "http://www.portalfiscal.inf.br/nfe"
XNOME_DEST_HOMOLOGACAO = "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL"

# Código do município de Porto Alegre como fallback
COD_MUN_RS = {
    "Porto Alegre": "4314902",
    "Caxias do Sul": "4305108",
    "Pelotas": "4314407",
    "Canoas": "4304606",
    "Santa Maria": "4316907",
    "Gravataí": "4309209",
    "Viamão": "4323002",
    "Novo Hamburgo": "4313409",
    "São Leopoldo": "4318705",
    "Rio Grande": "4315602",
}

# Mapeamento UF → código IBGE da UF (cUF) — dinâmico conforme endereço do emitente
UF_CODES: dict[str, str] = {
    "AC": "12", "AL": "27", "AP": "16", "AM": "13", "BA": "29",
    "CE": "23", "DF": "53", "ES": "32", "GO": "52", "MA": "21",
    "MT": "51", "MS": "50", "MG": "31", "PA": "15", "PB": "25",
    "PR": "41", "PE": "26", "PI": "22", "RJ": "33", "RN": "24",
    "RS": "43", "RO": "11", "RR": "14", "SC": "42", "SP": "35",
    "SE": "28", "TO": "17",
}


def gerar_chave_acesso(
    cuf: str,
    aamm: str,
    cnpj_cpf: str,
    mod: str,
    serie: str,
    nnf: str,
    tipo_emissao: str,
    codigo: str,
) -> str:
    """Gera chave de acesso de 44 dígitos da NF-e"""
    chave_sem_dv = f"{cuf}{aamm}{cnpj_cpf.zfill(14)}{mod}{serie.zfill(3)}{nnf.zfill(9)}{tipo_emissao}{codigo.zfill(8)}"
    dv = calcular_dv(chave_sem_dv)
    return chave_sem_dv + str(dv)


def calcular_dv(chave: str) -> int:
    pesos = [2, 3, 4, 5, 6, 7, 8, 9]
    soma = 0
    p = 0
    for c in reversed(chave):
        soma += int(c) * pesos[p % 8]
        p += 1
    resto = soma % 11
    return 0 if resto < 2 else 11 - resto


def gerar_xml_nfe(dados: Dict[str, Any], numero_nf: int = 1) -> str:
    """
    Gera XML completo da NF-e para Produtor Rural
    """
    agora = datetime.now()
    codigo_numerico = str(uuid.uuid4().int)[:8]

    # Valores dinâmicos derivados dos dados da nota
    uf_emit = dados["produtor"]["endereco"].get("uf", "RS").upper()
    uf_dest = dados["destinatario"]["endereco"].get("uf", "RS").upper()
    cuf   = UF_CODES.get(uf_emit, "43")           # cUF conforme UF do emitente
    serie = str(dados.get("serie", "1"))         # série vinda do cadastro do produtor
    nnf   = str(numero_nf)
    # 1 = operação interna (mesmo estado)  2 = interestadual
    id_dest = "1" if uf_emit == uf_dest else "2"

    aamm = agora.strftime("%y%m")
    doc_produtor = dados["produtor"]["documento"]  # já raw, sem formatação
    regime = dados["produtor"].get("regime_tributario", "simples")  # simples | presumido | real
    ambiente = dados.get("ambiente", 2)

    chave = gerar_chave_acesso(
        cuf, aamm, doc_produtor, "55", serie, nnf, "1", codigo_numerico
    )

    # Calcular totais
    itens = dados["itens"]
    vProd = sum(i["valor_total"] for i in itens)
    vFunrural = sum(i.get("valor_funrural", 0) for i in itens)
    vSenar = sum(i.get("valor_senar", 0) for i in itens)

    # PIS/COFINS rates por regime (apenas para Lucro Presumido/Real/Arbitrado - CRT 3)
    is_pj = len(doc_produtor) == 14
    # Lucro Arbitrado → mesmas alíquotas do Presumido (cumulativo)
    _PIS_RATES    = {"presumido": 0.65, "real": 1.65, "arbitrado": 0.65}
    _COFINS_RATES = {"presumido": 3.0,  "real": 7.6,  "arbitrado": 3.0}
    aliq_pis = _PIS_RATES.get(regime, 0.0) if is_pj else 0.0
    aliq_cofins = _COFINS_RATES.get(regime, 0.0) if is_pj else 0.0
    vPIS = round(vProd * aliq_pis / 100, 2)
    vCOFINS = round(vProd * aliq_cofins / 100, 2)

    # Pré-calcular vBC e vICMS totais para ICMSTot (validação SEFAZ 531/532)
    vBC_total = 0.0
    vICMS_total = 0.0
    for _item in itens:
        _cst = str(_item.get("cst_icms") or "41")
        _aliq = float(_item.get("aliq_icms") or 0)
        _vt = float(_item.get("valor_total") or 0)
        if is_pj and regime in ("simples", "simples_excesso"):
            # CSOSN 900 (diferido) tem vBC/vICMS; CSOSN 400 não tem
            if _cst == "51" and _aliq > 0:
                _vbc = _vt
                vBC_total += _vbc
                vICMS_total += round(_vbc * _aliq / 100, 2)
        else:
            # CST 51 (diferido 100%): vBC presente mas vICMS=0
            if _cst == "51" and _aliq > 0:
                vBC_total += _vt
            # CST 40/41: sem vBC nem vICMS

    # Root
    NFe = etree.Element("NFe", xmlns=NAMESPACE)
    #NFe = etree.SubElement(nfeProc, "NFe", xmlns=NAMESPACE)
    infNFe = etree.SubElement(NFe, "infNFe", Id=f"NFe{chave}", versao="4.00")

    # ====== IDE ======
    ide = etree.SubElement(infNFe, "ide")
    etree.SubElement(ide, "cUF").text = cuf
    etree.SubElement(ide, "cNF").text = codigo_numerico
    etree.SubElement(ide, "natOp").text = dados["natureza_operacao"]
    etree.SubElement(ide, "mod").text = "55"
    etree.SubElement(ide, "serie").text = serie
    etree.SubElement(ide, "nNF").text = nnf
    etree.SubElement(ide, "dhEmi").text = agora.strftime("%Y-%m-%dT%H:%M:%S-03:00")
    etree.SubElement(ide, "dhSaiEnt").text = f"{dados['data_saida']}T{dados.get('hora_saida', '00:00:00')}-03:00"
    etree.SubElement(ide, "tpNF").text = "1"  # Saída
    etree.SubElement(ide, "idDest").text = id_dest  # 1=interna, 2=interestadual
    etree.SubElement(ide, "cMunFG").text = dados["produtor"]["endereco"]["cod_municipio"]
    etree.SubElement(ide, "tpImp").text = "1"  # DANFE normal
    etree.SubElement(ide, "tpEmis").text = "1"  # Normal
    etree.SubElement(ide, "cDV").text = chave[-1]
    etree.SubElement(ide, "tpAmb").text = str(ambiente)
    etree.SubElement(ide, "finNFe").text = "1"  # Normal
    etree.SubElement(ide, "indFinal").text = "0"
    etree.SubElement(ide, "indPres").text = "0"
    etree.SubElement(ide, "procEmi").text = "0"
    etree.SubElement(ide, "verProc").text = "NFPR-RS-1.0"

    # ====== EMIT (Produtor Rural) ======
    emit = etree.SubElement(infNFe, "emit")
    if len(doc_produtor) == 11:
        etree.SubElement(emit, "CPF").text = doc_produtor
    else:
        etree.SubElement(emit, "CNPJ").text = doc_produtor
    etree.SubElement(emit, "xNome").text = dados["produtor"]["nome"]
    
    ender_emit = etree.SubElement(emit, "enderEmit")
    end = dados["produtor"]["endereco"]
    etree.SubElement(ender_emit, "xLgr").text = end["logradouro"]
    etree.SubElement(ender_emit, "nro").text = end["numero"]
    if end.get("complemento"):
        etree.SubElement(ender_emit, "xCpl").text = end["complemento"]
    etree.SubElement(ender_emit, "xBairro").text = end["bairro"]
    etree.SubElement(ender_emit, "cMun").text = end["cod_municipio"]
    etree.SubElement(ender_emit, "xMun").text = end["municipio"]
    etree.SubElement(ender_emit, "UF").text = uf_emit
    etree.SubElement(ender_emit, "CEP").text = end["cep"].replace("-", "")
    etree.SubElement(ender_emit, "cPais").text = "1058"
    etree.SubElement(ender_emit, "xPais").text = "Brasil"
    if end.get("telefone"):
        etree.SubElement(ender_emit, "fone").text = end["telefone"].replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    
    etree.SubElement(emit, "IE").text = dados["produtor"]["ie"]
    # CRT: 4=Produtor Rural (CPF ou CNPJ PJ Rural); 1=Simples; 2=Simples-excesso; 3=Regime Normal
    if not is_pj or regime == "produtor_rural":
        crt = "4"
    elif regime in ("presumido", "real", "arbitrado"):
        crt = "3"
    elif regime == "simples_excesso":
        crt = "2"
    else:  # simples
        crt = "1"
    etree.SubElement(emit, "CRT").text = crt

    # ====== DEST ======
    dest = etree.SubElement(infNFe, "dest")
    dest_dados = dados["destinatario"]
    cpf_cnpj_dest = dest_dados["cpf_cnpj"].replace(".", "").replace("-", "").replace("/", "")
    
    if len(cpf_cnpj_dest) == 14:
        etree.SubElement(dest, "CNPJ").text = cpf_cnpj_dest
    else:
        etree.SubElement(dest, "CPF").text = cpf_cnpj_dest
    
    nome_dest_xml = XNOME_DEST_HOMOLOGACAO if int(ambiente) == 2 else dest_dados["nome"]
    etree.SubElement(dest, "xNome").text = nome_dest_xml
    
    ender_dest = etree.SubElement(dest, "enderDest")
    end_d = dest_dados["endereco"]
    etree.SubElement(ender_dest, "xLgr").text = end_d["logradouro"]
    etree.SubElement(ender_dest, "nro").text = end_d["numero"]
    if end_d.get("complemento"):
        etree.SubElement(ender_dest, "xCpl").text = end_d["complemento"]
    etree.SubElement(ender_dest, "xBairro").text = end_d["bairro"]
    etree.SubElement(ender_dest, "cMun").text = end_d["cod_municipio"]
    etree.SubElement(ender_dest, "xMun").text = end_d["municipio"]
    etree.SubElement(ender_dest, "UF").text = end_d.get("uf", "RS")
    etree.SubElement(ender_dest, "CEP").text = end_d["cep"].replace("-", "")
    etree.SubElement(ender_dest, "cPais").text = "1058"
    etree.SubElement(ender_dest, "xPais").text = "Brasil"
    
    # indIEDest: 1=contribuinte ICMS, 2=isento, 9=não contribuinte
    ie_dest_raw = (dest_dados.get("ie") or "").strip().upper()
    if ie_dest_raw and ie_dest_raw not in ("ISENTO", "NAO CONTRIBUINTE", "NÃO CONTRIBUINTE"):
        ind_ie_dest = "1"
    elif ie_dest_raw == "ISENTO":
        ind_ie_dest = "2"
    else:
        ind_ie_dest = "9"
    etree.SubElement(dest, "indIEDest").text = ind_ie_dest
    if ind_ie_dest == "1":
        etree.SubElement(dest, "IE").text = ie_dest_raw
    elif ind_ie_dest == "2":
        etree.SubElement(dest, "IE").text = "ISENTO"
    # ind_ie_dest == "9": <IE> não deve estar presente

    # ====== ITENS ======
    for item in itens:
        det = etree.SubElement(infNFe, "det", nItem=str(item["numero_item"]))
        prod = etree.SubElement(det, "prod")
        etree.SubElement(prod, "cProd").text = item["codigo_produto"]
        etree.SubElement(prod, "cEAN").text = "SEM GTIN"
        etree.SubElement(prod, "xProd").text = item["descricao"]
        etree.SubElement(prod, "NCM").text = item["ncm"].replace(".", "")
        etree.SubElement(prod, "CFOP").text = item["cfop"]
        etree.SubElement(prod, "uCom").text = item["unidade"]
        etree.SubElement(prod, "qCom").text = f"{item['quantidade']:.4f}"
        etree.SubElement(prod, "vUnCom").text = f"{item['valor_unitario']:.10f}"
        etree.SubElement(prod, "vProd").text = f"{item['valor_total']:.2f}"
        etree.SubElement(prod, "cEANTrib").text = "SEM GTIN"
        etree.SubElement(prod, "uTrib").text = item["unidade"]
        etree.SubElement(prod, "qTrib").text = f"{item['quantidade']:.4f}"
        etree.SubElement(prod, "vUnTrib").text = f"{item['valor_unitario']:.10f}"
        etree.SubElement(prod, "indTot").text = "1"
        
        # Impostos
        imposto = etree.SubElement(det, "imposto")

        # ── ICMS ──────────────────────────────────────────────────────────────
        icms_el = etree.SubElement(imposto, "ICMS")
        cst_icms = str(item.get("cst_icms") or "41")

        if is_pj and regime in ("simples", "simples_excesso"):
            # CNPJ / Simples Nacional (CRT 1 e CRT 2)
            # CSOSN 400 = Não tributada; CSOSN 900 = Outros (diferimento)
            csosn = "900" if cst_icms == "51" else "400"
            icms_grp = etree.SubElement(icms_el, f"ICMSSN{csosn}")
            etree.SubElement(icms_grp, "orig").text = "0"
            etree.SubElement(icms_grp, "CSOSN").text = csosn
            if csosn == "900":
                aliq = float(item.get("aliq_icms") or 0)
                v_total = float(item.get("valor_total") or 0)
                v_bc = v_total if aliq > 0 else 0.0
                v_icms = round(v_bc * aliq / 100, 2)
                etree.SubElement(icms_grp, "modBC").text = "3"
                etree.SubElement(icms_grp, "vBC").text = f"{v_bc:.2f}"
                etree.SubElement(icms_grp, "pICMS").text = f"{aliq:.2f}"
                etree.SubElement(icms_grp, "vICMS").text = f"{v_icms:.2f}"
        else:
            # CPF (Produtor Rural) ou CNPJ Lucro Presumido/Real → CST regime normal
            if cst_icms == "51":
                # Diferido — 100% diferido ao adquirente
                icms_grp = etree.SubElement(icms_el, "ICMS51")
                etree.SubElement(icms_grp, "orig").text = "0"
                etree.SubElement(icms_grp, "CST").text = "51"
                aliq = float(item.get("aliq_icms") or 0)
                v_total = float(item.get("valor_total") or 0)
                v_bc = v_total if aliq > 0 else 0.0
                v_icms_op = round(v_bc * aliq / 100, 2)
                etree.SubElement(icms_grp, "modBC").text = "3"
                etree.SubElement(icms_grp, "vBC").text = f"{v_bc:.2f}"
                etree.SubElement(icms_grp, "pICMS").text = f"{aliq:.2f}"
                etree.SubElement(icms_grp, "vICMSOp").text = f"{v_icms_op:.2f}"
                etree.SubElement(icms_grp, "pDif").text = "100.00"
                etree.SubElement(icms_grp, "vICMSDif").text = f"{v_icms_op:.2f}"
                etree.SubElement(icms_grp, "vICMS").text = "0.00"
            elif cst_icms == "40":
                # Isento
                icms_grp = etree.SubElement(icms_el, "ICMS40")
                etree.SubElement(icms_grp, "orig").text = "0"
                etree.SubElement(icms_grp, "CST").text = "40"
            else:
                # 41 — Não tributado
                icms_grp = etree.SubElement(icms_el, "ICMS41")
                etree.SubElement(icms_grp, "orig").text = "0"
                etree.SubElement(icms_grp, "CST").text = "41"

        # ── PIS ───────────────────────────────────────────────────────────────
        pis_el = etree.SubElement(imposto, "PIS")
        if is_pj and regime in ("presumido", "real", "arbitrado"):
            # Lucro Presumido/Arbitrado: CST 01 (0,65%) | Lucro Real: CST 01 (1,65%)
            v_bc_pis = float(item.get("valor_total") or 0)
            v_pis_item = round(v_bc_pis * aliq_pis / 100, 2)
            pis_aliq = etree.SubElement(pis_el, "PISAliq")
            etree.SubElement(pis_aliq, "CST").text = "01"
            etree.SubElement(pis_aliq, "vBC").text = f"{v_bc_pis:.2f}"
            etree.SubElement(pis_aliq, "pPIS").text = f"{aliq_pis:.2f}"
            etree.SubElement(pis_aliq, "vPIS").text = f"{v_pis_item:.2f}"
        else:
            # CPF / Simples Nacional → CST 07 (Isenta)
            pis_nt = etree.SubElement(pis_el, "PISNT")
            etree.SubElement(pis_nt, "CST").text = "07"

        # ── COFINS ────────────────────────────────────────────────────────────
        cofins_el = etree.SubElement(imposto, "COFINS")
        if is_pj and regime in ("presumido", "real", "arbitrado"):
            # Lucro Presumido/Arbitrado: CST 01 (3%) | Lucro Real: CST 01 (7,6%)
            v_bc_cofins = float(item.get("valor_total") or 0)
            v_cofins_item = round(v_bc_cofins * aliq_cofins / 100, 2)
            cofins_aliq = etree.SubElement(cofins_el, "COFINSAliq")
            etree.SubElement(cofins_aliq, "CST").text = "01"
            etree.SubElement(cofins_aliq, "vBC").text = f"{v_bc_cofins:.2f}"
            etree.SubElement(cofins_aliq, "pCOFINS").text = f"{aliq_cofins:.2f}"
            etree.SubElement(cofins_aliq, "vCOFINS").text = f"{v_cofins_item:.2f}"
        else:
            # CPF / Simples Nacional → CST 07 (Isenta)
            cofins_nt = etree.SubElement(cofins_el, "COFINSNT")
            etree.SubElement(cofins_nt, "CST").text = "07"

        # FUNRURAL / SENAR são retidas pelo adquirente — declaradas em infAdic

    # ====== TOTAIS ======
    total = etree.SubElement(infNFe, "total")
    icmsTot = etree.SubElement(total, "ICMSTot")
    etree.SubElement(icmsTot, "vBC").text = f"{vBC_total:.2f}"
    etree.SubElement(icmsTot, "vICMS").text = f"{vICMS_total:.2f}"
    etree.SubElement(icmsTot, "vICMSDeson").text = "0.00"
    etree.SubElement(icmsTot, "vFCP").text = "0.00"
    etree.SubElement(icmsTot, "vBCST").text = "0.00"
    etree.SubElement(icmsTot, "vST").text = "0.00"
    etree.SubElement(icmsTot, "vFCPST").text = "0.00"
    etree.SubElement(icmsTot, "vFCPSTRet").text = "0.00"
    etree.SubElement(icmsTot, "vProd").text = f"{vProd:.2f}"
    etree.SubElement(icmsTot, "vFrete").text = "0.00"
    etree.SubElement(icmsTot, "vSeg").text = "0.00"
    etree.SubElement(icmsTot, "vDesc").text = "0.00"
    etree.SubElement(icmsTot, "vII").text = "0.00"
    etree.SubElement(icmsTot, "vIPI").text = "0.00"
    etree.SubElement(icmsTot, "vIPIDevol").text = "0.00"
    etree.SubElement(icmsTot, "vPIS").text = f"{vPIS:.2f}"
    etree.SubElement(icmsTot, "vCOFINS").text = f"{vCOFINS:.2f}"
    etree.SubElement(icmsTot, "vOutro").text = "0.00"
    etree.SubElement(icmsTot, "vNF").text = f"{vProd:.2f}"

    # ====== TRANSPORTE ======
    transp = etree.SubElement(infNFe, "transp")
    etree.SubElement(transp, "modFrete").text = str(dados.get("transporte", {}).get("modalidade_frete", 9))

    # ====== PAGAMENTO (obrigatório no NF-e 4.0) ======
    # tPag: 90=Sem Pagamento, 17=PIX, 18=Transferência Bancária, 15=Boleto,
    #       01=Dinheiro, 02=Cheque, 99=Outros
    forma_pag = str(dados.get("forma_pagamento", "90"))
    pag = etree.SubElement(infNFe, "pag")
    detPag = etree.SubElement(pag, "detPag")
    etree.SubElement(detPag, "tPag").text = forma_pag
    etree.SubElement(detPag, "vPag").text = "0.00" if forma_pag == "90" else f"{vProd:.2f}"

    # ====== INFORMAÇÕES ADICIONAIS ======
    infAdic = etree.SubElement(infNFe, "infAdic")
    # Alíquotas: PF 2,5% + 0,2% SENAR; PJ 2,5% + 0,25% SENAR (Lei 8.212/91)
    aliq_senar_str = "0,25%" if is_pj else "0,2%"
    tipo_emit_str = "PJ" if is_pj else "PF"
    partes = [
        f"FUNRURAL ({tipo_emit_str}) retido pelo adquirente: R$ {vFunrural:.2f} (2,5%)",
        f"SENAR ({tipo_emit_str}) retido pelo adquirente: R$ {vSenar:.2f} ({aliq_senar_str})",
    ]
    _REGIME_LABELS = {
        "presumido":     "Lucro Presumido",
        "real":          "Lucro Real",
        "arbitrado":     "Lucro Arbitrado",
        "simples_excesso": "Simples Nacional-Excesso",
    }
    if is_pj and regime in ("presumido", "arbitrado"):
        partes.append(f"PIS: CST 01 - 0,65% R$ {vPIS:.2f} | COFINS: CST 01 - 3% R$ {vCOFINS:.2f} ({_REGIME_LABELS[regime]})")
    elif is_pj and regime == "real":
        partes.append(f"PIS: CST 01 - 1,65% R$ {vPIS:.2f} | COFINS: CST 01 - 7,6% R$ {vCOFINS:.2f} (Lucro Real)")
    else:
        partes.append("PIS: CST 07 - Isento | COFINS: CST 07 - Isento")
    if dados.get("informacoes_adicionais"):
        partes.append(dados["informacoes_adicionais"])
    partes.append("Nota Fiscal de Produtor Rural emitida eletronicamente.")
    etree.SubElement(infAdic, "infCpl").text = " | ".join(partes)

    xml_str = etree.tostring(NFe, xml_declaration=True, encoding="UTF-8", pretty_print=False)
    
   # print(xml_str.decode("utf-8"))
    
    return xml_str.decode("utf-8"), chave
