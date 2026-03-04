/**
 * Valida CPF usando o algoritmo de dígitos verificadores (módulo 11).
 * Aceita string com ou sem pontuação.
 */
export function validarCpf(cpf) {
  const n = String(cpf).replace(/\D/g, '')
  if (n.length !== 11 || /^(\d)\1{10}$/.test(n)) return false

  let s = 0
  for (let i = 0; i < 9; i++) s += +n[i] * (10 - i)
  let r = (s * 10) % 11
  if (r >= 10) r = 0
  if (r !== +n[9]) return false

  s = 0
  for (let i = 0; i < 10; i++) s += +n[i] * (11 - i)
  r = (s * 10) % 11
  if (r >= 10) r = 0
  return r === +n[10]
}

/**
 * Valida CNPJ usando o algoritmo de dígitos verificadores (módulo 11).
 * Aceita string com ou sem pontuação.
 */
export function validarCnpj(cnpj) {
  const n = String(cnpj).replace(/\D/g, '')
  if (n.length !== 14 || /^(\d)\1{13}$/.test(n)) return false

  const dig = (base) => {
    let s = 0
    let p = base.length - 7
    for (let i = base.length; i >= 1; i--) {
      s += +base[base.length - i] * p--
      if (p < 2) p = 9
    }
    const r = s % 11
    return r < 2 ? 0 : 11 - r
  }

  return dig(n.slice(0, 12)) === +n[12] && dig(n.slice(0, 13)) === +n[13]
}

/**
 * Retorna 'cpf', 'cnpj' ou null com base no número de caracteres alfanuméricos da string.
 * Suporta CNPJ alfanumérico futuro (14 chars com letras).
 */
export function tipoCpfCnpj(valor) {
  const n = String(valor || '').replace(/[^A-Za-z0-9]/g, '')
  if (n.length === 11) return 'cpf'
  if (n.length === 14) return 'cnpj'
  return null
}

/**
 * Aplica máscara visual de CPF ou CNPJ conforme a quantidade de caracteres digitados.
 * CPF (≤11 chars): 000.000.000-00
 * CNPJ (>11 chars): 00.000.000/0000-00 (aceita letras para CNPJ alfanumérico futuro)
 * Retorna string formatada para exibição — nunca armazenar no banco.
 */
export function mascararDocumento(raw) {
  const v = String(raw || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 14)
  if (v.length <= 11) {
    // CPF: 000.000.000-00
    return v
      .replace(/^(\w{3})(\w)/, '$1.$2')
      .replace(/^(\w{3})\.(\w{3})(\w)/, '$1.$2.$3')
      .replace(/^(\w{3})\.(\w{3})\.(\w{3})(\w)/, '$1.$2.$3-$4')
  }
  // CNPJ: 00.000.000/0000-00
  return v
    .replace(/^(\w{2})(\w)/, '$1.$2')
    .replace(/^(\w{2})\.(\w{3})(\w)/, '$1.$2.$3')
    .replace(/^(\w{2})\.(\w{3})\.(\w{3})(\w)/, '$1.$2.$3/$4')
    .replace(/^(\w{2})\.(\w{3})\.(\w{3})\/(\w{4})(\w)/, '$1.$2.$3/$4-$5')
}

/**
 * Valida CPF ou CNPJ conforme o comprimento.
 * Para CNPJ alfanumérico (14 chars com letras): retorna true com TODO — algoritmo RF não publicado.
 */
export function validarDocumento(raw) {
  const n = String(raw || '').replace(/[^A-Za-z0-9]/g, '')
  if (n.length === 11) return validarCpf(n)
  if (n.length === 14) {
    if (/^\d+$/.test(n)) return validarCnpj(n)
    // TODO: validação de CNPJ alfanumérico (algoritmo Receita Federal não publicado ainda)
    return true
  }
  return false
}
