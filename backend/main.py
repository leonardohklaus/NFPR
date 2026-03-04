import os

# Define OPENSSL_CONF antes de qualquer import de bibliotecas criptográficas.
# O pacote `cryptography` lê esta variável ao inicializar seu OpenSSL bundled,
# habilitando rh_allow_sha1_signatures para assinatura RSA-SHA1 (exigido pela SEFAZ-RS NF-e 4.0).
os.environ["OPENSSL_CONF"] = os.path.join(os.path.dirname(os.path.abspath(__file__)), "openssl-legacy.cnf")

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import notas, certificado, produtor, sefaz, cfop, ncm, produtores, municipios, auth, usuarios
from database import init_db
import models  # noqa: F401 - garante que os models sejam registrados


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="NFPR - Nota Fiscal do Produtor Rural RS",
    description="Sistema completo de emissão de Nota Fiscal do Produtor Rural para o Rio Grande do Sul",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Autenticação"])
app.include_router(usuarios.router, prefix="/api/usuarios", tags=["Usuários"])
app.include_router(notas.router, prefix="/api/notas", tags=["Notas Fiscais"])
app.include_router(certificado.router, prefix="/api/certificado", tags=["Certificado Digital"])
app.include_router(produtor.router, prefix="/api/produtor", tags=["Produtor Rural"])
app.include_router(sefaz.router, prefix="/api/sefaz", tags=["SEFAZ-RS"])
app.include_router(cfop.router, prefix="/api/cfop", tags=["CFOP"])
app.include_router(ncm.router, prefix="/api/ncm", tags=["NCM"])
app.include_router(produtores.router, prefix="/api/produtores", tags=["Produtores"])
app.include_router(municipios.router, prefix="/api/municipios", tags=["Municípios"])


@app.get("/")
def root():
    return {"status": "ok", "sistema": "NFPR - Rio Grande do Sul"}
