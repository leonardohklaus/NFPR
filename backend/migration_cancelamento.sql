-- Migration: adiciona campos de cancelamento de NF-e
ALTER TABLE notas_fiscais
    ADD COLUMN IF NOT EXISTS xml_cancelamento TEXT,
    ADD COLUMN IF NOT EXISTS protocolo_cancelamento VARCHAR(20),
    ADD COLUMN IF NOT EXISTS data_cancelamento VARCHAR(25);
