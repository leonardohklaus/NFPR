-- Migration: tabela de respostas SEFAZ por nota fiscal
-- Execute este script no banco de dados PostgreSQL

CREATE TABLE IF NOT EXISTS respostas_sefaz (
    id SERIAL PRIMARY KEY,
    nota_id INTEGER NOT NULL REFERENCES notas_fiscais(id) ON DELETE CASCADE,
    tipo VARCHAR(30) NOT NULL,
    codigo_status VARCHAR(10),
    mensagem VARCHAR(500),
    xml_enviado TEXT,
    xml_recebido TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_respostas_sefaz_nota_id ON respostas_sefaz(nota_id);
