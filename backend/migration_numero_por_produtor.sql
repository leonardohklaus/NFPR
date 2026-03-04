-- Ajusta numeração de NF-e para ser por produtor (em vez de global)
--
-- ATENÇÃO: executar em manutenção — remove o unique global e adiciona o composto.
-- Notas sem produtor_id (legadas) não são afetadas pelo novo unique constraint
-- pois NULL != NULL no PostgreSQL (cada NULL é único por si só).

-- 1. Remove a constraint de unique global no campo numero
ALTER TABLE notas_fiscais DROP CONSTRAINT IF EXISTS notas_fiscais_numero_key;

-- 2. Adiciona unique composto (produtor_id, numero)
--    Garante unicidade do número dentro de cada produtor.
ALTER TABLE notas_fiscais
    ADD CONSTRAINT uq_produtor_numero UNIQUE (produtor_id, numero);
