import { useState, useCallback } from 'react'
import { listarMunicipiosDB } from '../services/api'

const VIACEP_URL = 'https://viacep.com.br/ws/{cep}/json/'

/**
 * Hook para busca de CEP via ViaCEP com fallback para base local de municípios.
 *
 * Retorna:
 *   buscandoCep  – boolean enquanto a requisição está em andamento
 *   buscarCep    – async (cep: string) => CepData | null
 *
 * CepData: { logradouro, bairro, municipio, uf, cod_municipio }
 */
export function useCep() {
  const [buscandoCep, setBuscandoCep] = useState(false)

  const buscarCep = useCallback(async (cep) => {
    const cepLimpo = String(cep || '').replace(/\D/g, '')
    if (cepLimpo.length !== 8) return null

    setBuscandoCep(true)
    try {
      const res = await fetch(VIACEP_URL.replace('{cep}', cepLimpo))
      if (!res.ok) return null
      const json = await res.json()
      if (json.erro) return null

      const { logradouro = '', bairro = '', localidade = '', uf = '', ibge = '' } = json

      let cod_municipio = ibge || ''

      // Fallback: busca código IBGE na nossa base local se ViaCEP não retornou
      if (!cod_municipio && localidade && uf) {
        try {
          const muns = await listarMunicipiosDB({ busca: localidade, uf, apenas_ativos: true })
          const lista = Array.isArray(muns) ? muns : (muns?.items ?? [])
          if (lista.length > 0) {
            cod_municipio = lista[0].codigo_ibge ?? ''
          }
        } catch {
          // ignora erro no fallback
        }
      }

      return { logradouro, bairro, municipio: localidade, uf, cod_municipio }
    } catch {
      return null
    } finally {
      setBuscandoCep(false)
    }
  }, [])

  return { buscandoCep, buscarCep }
}
