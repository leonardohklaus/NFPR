import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Search, CheckCircle2, AlertCircle, Hash } from 'lucide-react'
import { consultarNFe } from '../services/api'

export default function ConsultarNota() {
  const [resultado, setResultado] = useState(null)
  const [buscando, setBuscando] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onBuscar = async (dados) => {
    setBuscando(true)
    setResultado(null)
    try {
      const res = await consultarNFe(dados.chave.replace(/\s/g, ''), parseInt(dados.ambiente))
      setResultado(res)
    } catch (e) {
      toast.error('Erro ao consultar')
    } finally {
      setBuscando(false)
    }
  }

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Search className="w-6 h-6 text-verde-600" />
          Consultar NF-e
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">Consulte a situação de uma nota fiscal na SEFAZ-RS</p>
      </div>

      <div className="card p-5">
        <form onSubmit={handleSubmit(onBuscar)} className="space-y-4">
          <div>
            <label className="label-field">Chave de Acesso (44 dígitos)</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register('chave', {
                    required: 'Informe a chave de acesso',
                    minLength: { value: 44, message: 'Chave deve ter 44 dígitos' },
                    maxLength: { value: 44, message: 'Chave deve ter 44 dígitos' },
                  })}
                  className="input-field pl-9 font-mono"
                  placeholder="43250100000000000000550010000000011000000017"
                  maxLength={44}
                />
              </div>
              <select {...register('ambiente')} className="input-field w-36 flex-shrink-0">
                <option value={2}>Homologação</option>
                <option value={1}>Produção</option>
              </select>
            </div>
            {errors.chave && <p className="text-red-500 text-xs mt-1">{errors.chave.message}</p>}
          </div>

          <button type="submit" disabled={buscando} className="btn-primary">
            <Search className="w-4 h-4" />
            {buscando ? 'Consultando...' : 'Consultar SEFAZ'}
          </button>
        </form>
      </div>

      {resultado && (
        <div className={`card p-5 fade-in border-l-4 ${resultado.sucesso ? 'border-l-verde-500' : 'border-l-red-400'}`}>
          <div className="flex items-center gap-2 mb-3">
            {resultado.sucesso
              ? <CheckCircle2 className="w-5 h-5 text-verde-600" />
              : <AlertCircle className="w-5 h-5 text-red-500" />
            }
            <h3 className="font-semibold">Resultado da Consulta</h3>
          </div>
          <div className="space-y-1">
            {resultado.codigo_status && (
              <p className="text-sm text-gray-700">Código: <span className="font-mono font-bold">{resultado.codigo_status}</span></p>
            )}
            <p className="text-sm text-gray-700">Status: {resultado.mensagem}</p>
          </div>
        </div>
      )}
    </div>
  )
}
