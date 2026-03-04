-- Migrações para notas_fiscais (executar em bancos existentes)
-- Novas instalações criam as colunas automaticamente via init_db().

ALTER TABLE notas_fiscais ADD COLUMN IF NOT EXISTS mensagem_rejeicao VARCHAR(500);
ALTER TABLE notas_fiscais ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(2) DEFAULT '90';
