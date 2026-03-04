-- Migration: CPF → documento (suporte a CPF e CNPJ)
-- Executar contra o banco PostgreSQL antes de reiniciar a aplicação.
-- Para nova instalação sem dados: dropar tabelas e rodar init_db() normalmente.

-- 1. produtores: renomear + expandir + limpar formatação
ALTER TABLE produtores RENAME COLUMN cpf TO documento;
ALTER TABLE produtores ALTER COLUMN documento TYPE VARCHAR(20);
UPDATE produtores SET documento = REGEXP_REPLACE(documento, '[^A-Za-z0-9]', '', 'g');

-- 2. notas_fiscais: renomear produtor_cpf + limpar + expandir destinatario
ALTER TABLE notas_fiscais RENAME COLUMN produtor_cpf TO produtor_documento;
ALTER TABLE notas_fiscais ALTER COLUMN produtor_documento TYPE VARCHAR(20);
UPDATE notas_fiscais SET produtor_documento = REGEXP_REPLACE(produtor_documento, '[^A-Za-z0-9]', '', 'g');

ALTER TABLE notas_fiscais ALTER COLUMN destinatario_cpf_cnpj TYPE VARCHAR(20);
UPDATE notas_fiscais SET destinatario_cpf_cnpj = REGEXP_REPLACE(destinatario_cpf_cnpj, '[^A-Za-z0-9]', '', 'g');
