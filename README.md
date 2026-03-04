# 🌿 NFPR — Nota Fiscal do Produtor Rural · Rio Grande do Sul

Sistema completo de emissão de NF-e para Produtor Rural no RS, com integração à SEFAZ-RS e suporte a certificado digital ICP-Brasil.

---

## 📋 Funcionalidades

- ✅ Emissão de NF-e 4.0 para Produtor Rural (CPF/IE)
- ✅ Geração e validação de XML conforme layout SEFAZ-RS
- ✅ Assinatura digital com certificado ICP-Brasil (A1 .pfx/.p12)
- ✅ Transmissão aos webservices da SEFAZ-RS (homologação e produção)
- ✅ Consulta de situação da NF-e
- ✅ Cálculo automático de FUNRURAL (2,5%) e SENAR (0,2%)
- ✅ Tabelas de NCM, CFOP e municípios do RS
- ✅ Dashboard com status em tempo real da SEFAZ-RS

---

## 🛠️ Stack Tecnológica

| Camada     | Tecnologia                          |
|------------|-------------------------------------|
| Frontend   | React 18 + Vite + Tailwind CSS      |
| Backend    | Python 3.11+ + FastAPI + Uvicorn    |
| XML NF-e   | lxml + signxml                      |
| Criptografia | cryptography + pyOpenSSL           |
| SOAP/WS    | requests + zeep                     |

---

## 🚀 Setup — Backend (Python)

### Pré-requisitos
- Python 3.11+
- pip

### Instalação

```bash
cd backend

# Criar ambiente virtual (recomendado)
python -m venv venv
source venv/bin/activate   # Linux/Mac
# ou
venv\Scripts\activate      # Windows

# Instalar dependências
pip install -r requirements.txt

# Iniciar servidor
uvicorn main:app --reload --port 8000
```

A API estará em: **http://localhost:8000**
Documentação Swagger: **http://localhost:8000/docs**

---

## 🚀 Setup — Frontend (React)

### Pré-requisitos
- Node.js 18+
- npm ou yarn

### Instalação

```bash
cd frontend

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

A aplicação estará em: **http://localhost:5173**

---

## 🔐 Certificado Digital

### Como obter
O Produtor Rural precisa de um **e-CPF tipo A1 (ICP-Brasil)**:

1. Acesse uma Autoridade Certificadora credenciada:
   - [Serpro](https://serpro.gov.br) — (0800 978 2329)
   - [Certisign](https://certisign.com.br) — (0800 722 7844)
   - [Valid Certificadora](https://validcertificadora.com.br)
   - [Soluti](https://soluti.com.br)

2. Adquira o **e-CPF A1** (arquivo .pfx, mais prático que token)
3. Faça a validação presencial ou por videoconferência
4. Receba o arquivo `.pfx` e guarde a senha

### Como usar no sistema
1. Acesse **Certificado Digital** no menu
2. Faça o upload do arquivo `.pfx`
3. Informe a senha do certificado
4. O sistema carrega o certificado em memória para assinar as notas

> ⚠️ O certificado é armazenado APENAS em memória RAM, nunca em disco.

---

## 🏭 Webservices SEFAZ-RS

| Serviço          | Homologação                                                    | Produção                                           |
|------------------|----------------------------------------------------------------|----------------------------------------------------|
| NfeAutorizacao   | nfe-homologacao.sefazrs.rs.gov.br/ws/NfeAutorizacao/...       | nfe.sefazrs.rs.gov.br/ws/NfeAutorizacao/...        |
| NfeStatusServico | nfe-homologacao.sefazrs.rs.gov.br/ws/NfeStatusServico2/...    | nfe.sefazrs.rs.gov.br/ws/NfeStatusServico2/...     |
| NfeConsulta      | nfe-homologacao.sefazrs.rs.gov.br/ws/NfeConsulta2/...         | nfe.sefazrs.rs.gov.br/ws/NfeConsulta2/...          |

---

## 📊 Regras Fiscais — Produtor Rural RS

### FUNRURAL
- **Alíquota**: 2,5% sobre a receita bruta
- **Responsável**: O adquirente retém e recolhe
- **Base legal**: Lei 8.212/1991

### SENAR
- **Alíquota**: 0,2% sobre a receita bruta
- **Responsável**: O adquirente retém e recolhe

### ICMS
- Operações com produtos agropecuários são geralmente **isentas ou diferidas** no RS
- Verificar Decreto 37.699/1997 (RICMS/RS) para cada operação

### CST ICMS recomendado
- **CST 41**: Não tributado (mais comum para Produtor Rural RS)

---

## 📁 Estrutura do Projeto

```
nfpr-system/
├── backend/
│   ├── main.py                          # FastAPI app
│   ├── requirements.txt
│   ├── routes/
│   │   ├── notas.py                     # Endpoints NF-e
│   │   ├── certificado.py               # Endpoints certificado
│   │   ├── produtor.py                  # Endpoints auxiliares
│   │   └── sefaz.py                     # Endpoints SEFAZ
│   ├── services/
│   │   ├── certificado_service.py       # Gerenciamento certificado
│   │   ├── xml_service.py               # Geração do XML NF-e
│   │   └── sefaz_service.py             # Integração SEFAZ-RS
│   └── schemas/
│       └── nfpr.py                      # Modelos Pydantic
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx
        ├── index.css
        ├── main.jsx
        ├── services/
        │   └── api.js                   # Camada de API
        ├── components/
        │   └── Layout.jsx               # Layout com sidebar
        └── pages/
            ├── Dashboard.jsx
            ├── EmitirNota.jsx
            ├── CertificadoDigital.jsx
            ├── ConsultarNota.jsx
            └── Configuracoes.jsx
```

---

## 🔄 Fluxo de Emissão

```
1. Produtor preenche o formulário de NF-e
2. Frontend envia dados ao backend (POST /api/notas/emitir)
3. Backend gera o XML NF-e 4.0 conforme layout SEFAZ
4. Backend assina o XML com o certificado digital carregado
5. Backend envia o XML assinado via SOAP ao webservice SEFAZ-RS
6. SEFAZ retorna protocolo de autorização (cStat=100)
7. Frontend exibe chave de acesso e protocolo
```

---

## 🔧 Para Produção

- Adicionar banco de dados (PostgreSQL) para persistir notas emitidas
- Implementar autenticação de usuários (JWT)
- Geração de DANFE (PDF) — usar a lib `danfe` ou `reportlab`
- Armazenar certificados em HSM ou Key Vault (AWS KMS, Azure, etc.)
- Configurar HTTPS com certificado SSL
- Implementar backup das NF-e autorizadas (obrigação de 5 anos)

---

## 📞 Suporte

- **SEFAZ-RS**: [https://www.sefaz.rs.gov.br](https://www.sefaz.rs.gov.br)
- **Portal NF-e**: [http://www.nfe.fazenda.gov.br](http://www.nfe.fazenda.gov.br)
- **Documentação NF-e 4.0**: [https://www.nfe.fazenda.gov.br/portal/documentos](https://www.nfe.fazenda.gov.br/portal/documentos)
