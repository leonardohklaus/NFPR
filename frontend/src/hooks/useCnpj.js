import { useState, useCallback } from 'react'

/**
 * Hook para consulta de dados de pessoa jurídica via Brasil API.
 *
 * Retorna:
 *   buscandoCnpj – boolean enquanto a requisição está em andamento
 *   buscarCnpj   – async (cnpj: string) => CnpjData | null
 *
 * CnpjData: { nome, nome_fantasia, logradouro, numero, complemento,
 *              bairro, municipio, uf, cep, telefone }
 */
export function useCnpj() {
  const [buscandoCnpj, setBuscandoCnpj] = useState(false)

  const buscarCnpj = useCallback(async (cnpj) => {
    const nums = String(cnpj || '').replace(/\D/g, '')
    if (nums.length !== 14) return null

    setBuscandoCnpj(true)
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${nums}`)
      if (!res.ok) return null
      const j = await res.json()
      if (!j.razao_social) return null

      const telRaw = (j.ddd_telefone_1 || '').replace(/\D/g, '')
      const telefone = telRaw.length >= 10
        ? telRaw.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3')
        : j.ddd_telefone_1 || ''

      return {
        nome: j.razao_social || '',
        nome_fantasia: j.nome_fantasia || '',
        logradouro: j.logradouro || '',
        numero: j.numero || '',
        complemento: j.complemento || '',
        bairro: j.bairro || '',
        municipio: j.municipio || '',
        uf: j.uf || '',
        cep: (j.cep || '').replace(/\D/g, ''),
        telefone,
      }
    } catch {
      return null
    } finally {
      setBuscandoCnpj(false)
    }
  }, [])

  return { buscandoCnpj, buscarCnpj }
}
