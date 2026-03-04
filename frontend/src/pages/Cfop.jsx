import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, Search, Pencil, Trash2, X, Check, BookOpen } from 'lucide-react'
import { listarCFOPsDB, criarCFOP, atualizarCFOP, removerCFOP } from '../services/api'
import Modal from '../components/Modal'

const TIPOS = ['Saída Interna', 'Saída Interestadual', 'Entrada', 'Exportação']

export default function Cfop() {
  const [cfops, setCfops] = useState([])
  const [loading, setLoading] = useState(false)
  const [busca, setBusca] = useState('')
  const [apenasAtivos, setApenasAtivos] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [confirmarRemover, setConfirmarRemover] = useState(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const params = { apenas_ativos: apenasAtivos }
      if (busca) params.busca = busca
      const data = await listarCFOPsDB(params)
      setCfops(data)
    } catch {
      toast.error('Erro ao carregar CFOPs')
    } finally {
      setLoading(false)
    }
  }, [busca, apenasAtivos])

  useEffect(() => {
    const timeout = setTimeout(carregar, 300)
    return () => clearTimeout(timeout)
  }, [carregar])

  const abrirModal = (cfop = null) => {
    setEditando(cfop)
    reset(cfop ?? { codigo: '', descricao: '', tipo: 'Saída Interna', ativo: true })
    setModalAberto(true)
  }

  const fecharModal = () => {
    setModalAberto(false)
    setEditando(null)
    reset()
  }

  const onSubmit = async (dados) => {
    try {
      if (editando) {
        await atualizarCFOP(editando.id, dados)
        toast.success('CFOP atualizado com sucesso')
      } else {
        await criarCFOP(dados)
        toast.success('CFOP cadastrado com sucesso')
      }
      fecharModal()
      carregar()
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Erro ao salvar CFOP')
    }
  }

  const remover = async (id) => {
    try {
      await removerCFOP(id)
      toast.success('CFOP removido')
      setConfirmarRemover(null)
      carregar()
    } catch {
      toast.error('Erro ao remover CFOP')
    }
  }

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">
            <BookOpen className="w-7 h-7 text-verde-600" />
            Tabela de CFOP
          </h1>
          <p className="text-gray-500 text-sm mt-1">Códigos Fiscais de Operações e Prestações</p>
        </div>
        <button onClick={() => abrirModal()} className="btn-primary flex items-center gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          Novo CFOP
        </button>
      </div>

      {/* Filtros */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por código ou descrição..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none whitespace-nowrap">
          <input
            type="checkbox"
            checked={apenasAtivos}
            onChange={e => setApenasAtivos(e.target.checked)}
            className="w-4 h-4 rounded accent-verde-600"
          />
          Apenas ativos
        </label>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Carregando...</div>
        ) : cfops.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            Nenhum CFOP encontrado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs tracking-wide w-20">Código</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs tracking-wide">Descrição</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs tracking-wide hidden md:table-cell">Tipo</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase text-xs tracking-wide w-20">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase text-xs tracking-wide w-24">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cfops.map(cfop => (
                  <tr key={cfop.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-verde-700">{cfop.codigo}</td>
                    <td className="px-4 py-3 text-gray-700">{cfop.descricao}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-verde-50 text-verde-700">
                        {cfop.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                        ${cfop.ativo ? 'bg-verde-50 text-verde-700' : 'bg-gray-100 text-gray-400'}`}>
                        {cfop.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => abrirModal(cfop)}
                          className="p-1.5 rounded-lg hover:bg-verde-50 text-gray-400 hover:text-verde-600 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {confirmarRemover === cfop.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => remover(cfop.id)}
                              className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                              title="Confirmar remoção"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setConfirmarRemover(null)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                              title="Cancelar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmarRemover(cfop.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-2 border-t border-gray-50 text-xs text-gray-400">
          {cfops.length} registro{cfops.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Modal */}
      {modalAberto && (
        <Modal title={editando ? 'Editar CFOP' : 'Novo CFOP'} onClose={fecharModal} size="max-w-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label-field">Código *</label>
              <input
                {...register('codigo', {
                  required: 'Código obrigatório',
                  pattern: { value: /^\d{4}$/, message: 'Deve ter exatamente 4 dígitos' },
                })}
                className="input-field font-mono"
                placeholder="5101"
                maxLength={4}
                disabled={!!editando}
              />
              {errors.codigo && <p className="text-red-500 text-xs mt-1">{errors.codigo.message}</p>}
            </div>
            <div>
              <label className="label-field">Descrição *</label>
              <input
                {...register('descricao', { required: 'Descrição obrigatória' })}
                className="input-field"
                placeholder="Venda de produção do estabelecimento"
              />
              {errors.descricao && <p className="text-red-500 text-xs mt-1">{errors.descricao.message}</p>}
            </div>
            <div>
              <label className="label-field">Tipo *</label>
              <select {...register('tipo', { required: 'Tipo obrigatório' })} className="input-field">
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {editando && (
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('ativo')}
                  className="w-4 h-4 rounded accent-verde-600"
                />
                Ativo
              </label>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={fecharModal} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                {isSubmitting ? 'Salvando...' : editando ? 'Atualizar' : 'Cadastrar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
