export const NATUREZAS = [
  "Venda de produção do estabelecimento",
  "Remessa para industrialização",
  "Transferência de produção do estabelecimento",
  "Devolução de compra para industrialização",
  "Outros",
]

export const UNIDADES = ["KG", "TON", "SC", "L", "DZ", "UN", "CX"]

export const UFS = [
  "RS", "SC", "PR", "SP", "MG", "RJ", "ES", "BA", "GO", "MT", "MS",
  "PA", "AM", "CE", "PE", "RN", "PB", "AL", "SE", "MA", "PI", "TO",
  "AC", "RO", "RR", "AP", "DF",
]

export const FRETES = [
  { value: "0", label: "0 — Por conta do Emitente" },
  { value: "1", label: "1 — Por conta do Destinatário" },
  { value: "2", label: "2 — Por conta de Terceiros" },
  { value: "9", label: "9 — Sem Frete" },
]

export const FORMAS_PAGAMENTO = [
  { value: "90", label: "90 — Sem Pagamento" },
  { value: "17", label: "17 — PIX" },
  { value: "18", label: "18 — Transferência Bancária / TED / DOC" },
  { value: "15", label: "15 — Boleto Bancário" },
  { value: "01", label: "01 — Dinheiro" },
  { value: "02", label: "02 — Cheque" },
  { value: "16", label: "16 — Depósito Bancário" },
  { value: "99", label: "99 — Outros" },
]

export const CST_ICMS = [
  { value: "41", label: "41 — Não Tributado" },
  { value: "40", label: "40 — Isento" },
  { value: "51", label: "51 — Diferido (100%)" },
]

export const fmt = (v) =>
  (parseFloat(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })

export const formatBRL = (value) => {
  if (value === null || value === undefined || value === "") return ""
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

// Norte + Nordeste states receive 7% ICMS from RS; all others receive 12%
const _ESTADOS_7PCT = new Set([
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'MA', 'PA', 'PB', 'PE', 'PI', 'RN', 'RO', 'RR', 'SE', 'TO',
])

/**
 * Returns the suggested ICMS alíquota (%) based on emitter/recipient UFs.
 * Returns null if either UF is missing.
 */
export function getAliqSugerida(ufEmit, ufDest) {
  if (!ufEmit || !ufDest) return null
  if (ufEmit === ufDest) return 17          // operação interna RS: 17%
  return _ESTADOS_7PCT.has(ufDest) ? 7 : 12 // interestadual
}

export const DEFAULT_ITEM = {
  numero_item: 1,
  codigo_produto: "PROD001",
  descricao: "",
  ncm: "",
  cfop: "5101",
  unidade: "KG",
  quantidade: 0,
  valor_unitario: 0,
  valor_total: 0,
  valor_funrural: 0,
  valor_senar: 0,
  cst_icms: "51",
  aliq_icms: 0,
  valor_icms: 0,
}
