-- Adiciona coluna regime_tributario à tabela produtores
-- Valores: 'simples' (Simples Nacional), 'presumido' (Lucro Presumido), 'real' (Lucro Real)
-- Produtores CPF/PF sempre usarão 'simples' (ignorado no XML — CRT 4)

ALTER TABLE produtores
    ADD COLUMN IF NOT EXISTS regime_tributario VARCHAR(20) NOT NULL DEFAULT 'simples';
