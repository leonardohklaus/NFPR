import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { buscarProdutor, ativarCertificadoProdutor } from '../services/api'
import { useAuth } from './AuthContext'

const ProdutorContext = createContext(null)

const _key = (userId) => `nfpr_produtor_id_${userId}`

export function ProdutorProvider({ children }) {
  const { auth } = useAuth()
  const userId = auth?.user_id ?? null

  const [produtorAtivo, setProdutorAtivoState] = useState(null)
  const [carregando, setCarregando] = useState(true)

  // Recarrega o último produtor salvo sempre que o usuário logado mudar
  useEffect(() => {
    setProdutorAtivoState(null)
    if (!userId) {
      setCarregando(false)
      return
    }
    const idSalvo = localStorage.getItem(_key(userId))
    if (idSalvo) {
      setCarregando(true)
      buscarProdutor(idSalvo)
        .then(p => setProdutorAtivoState(p))
        .catch(() => localStorage.removeItem(_key(userId)))
        .finally(() => setCarregando(false))
    } else {
      setCarregando(false)
    }
  }, [userId])

  const selecionarProdutor = useCallback(async (produtor) => {
    if (!userId) return
    if (!produtor) {
      localStorage.removeItem(_key(userId))
      setProdutorAtivoState(null)
      return
    }
    localStorage.setItem(_key(userId), String(produtor.id))
    setProdutorAtivoState(produtor)
    if (produtor.cert_carregado) {
      try { await ativarCertificadoProdutor(produtor.id) } catch {}
    }
  }, [userId])

  const limparProdutor = useCallback(() => {
    if (userId) localStorage.removeItem(_key(userId))
    setProdutorAtivoState(null)
  }, [userId])

  return (
    <ProdutorContext.Provider value={{ produtorAtivo, selecionarProdutor, limparProdutor, carregando }}>
      {children}
    </ProdutorContext.Provider>
  )
}

export function useProdutorAtivo() {
  return useContext(ProdutorContext)
}
