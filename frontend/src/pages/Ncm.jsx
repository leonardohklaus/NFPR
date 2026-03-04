import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, Search, Pencil, Trash2, X, Check, Tag } from 'lucide-react'
import { listarNCMsDB, criarNCM, atualizarNCM, removerNCM } from '../services/api'
import Modal from '../components/Modal'

export default function Ncm() {
  const [ncms, setNcms] = useState([])
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
      const data = await listarNCMsDB(params)
      setNcms(data)
    } catch {
      toast.error('Erro ao carregar NCMs')
    } finally {
      setLoading(false)
    }
  }, [busca, apenasAtivos])

  useEffect(() => {
    const timeout = setTimeout(carregar, 300)
    return () => clearTimeout(timeout)
  }, [carregar])

  const abrirModal = (ncm = null) => {
    setEditando(ncm)
    reset(ncm ?? { codigo: '', descricao: '', ativo: true })
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
        await atualizarNCM(editando.id, dados)
        toast.success('NCM atualizado com sucesso')
      } else {
        await criarNCM(dados)
        toast.success('NCM cadastrado com sucesso')
      }
      fecharModal()
      carregar()
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Erro ao salvar NCM')
    }
  }

  const remover = async (id) => {
    try {
      await removerNCM(id)
      toast.success('NCM removido')
      setConfirmarRemover(null)
      carregar()
    } catch {
      toast.error('Erro ao remover NCM')
    }
  }

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">
            <Tag className="w-7 h-7 text-verde-600" />
            Tabela de NCM
          </h1>
          <p className="text-gray-500 text-sm mt-1">Nomenclatura Comum do Mercosul — produtos rurais</p>
        </div>
        <button onClick={() => abrirModal()} className="btn-primary flex items-center gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          Novo NCM
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
        ) : ncms.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            Nenhum NCM encontrado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs tracking-wide w-28">Código</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs tracking-wide">Descrição</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase text-xs tracking-wide w-20">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase text-xs tracking-wide w-24">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ncms.map(ncm => (
                  <tr key={ncm.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-verde-700">{ncm.codigo}</td>
                    <td className="px-4 py-3 text-gray-700">{ncm.descricao}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                        ${ncm.ativo ? 'bg-verde-50 text-verde-700' : 'bg-gray-100 text-gray-400'}`}>
                        {ncm.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => abrirModal(ncm)}
                          className="p-1.5 rounded-lg hover:bg-verde-50 text-gray-400 hover:text-verde-600 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {confirmarRemover === ncm.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => remover(ncm.id)}
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
                            onClick={() => setConfirmarRemover(ncm.id)}
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
          {ncms.length} registro{ncms.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Modal */}
      {modalAberto && (
        <Modal title={editando ? 'Editar NCM' : 'Novo NCM'} onClose={fecharModal} size="max-w-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label-field">Código NCM *</label>
              <input
                {...register('codigo', {
                  required: 'Código obrigatório',
                  pattern: {
                    value: /^\d{4}\.\d{2}\.\d{2}$/,
                    message: 'Formato esperado: 0000.00.00',
                  },
                })}
                className="input-field font-mono"
                placeholder="1001.19.00"
                maxLength={10}
                disabled={!!editando}
              />
              {errors.codigo && <p className="text-red-500 text-xs mt-1">{errors.codigo.message}</p>}
              <p className="text-gray-400 text-xs mt-1">Formato: 0000.00.00</p>
            </div>
            <div>
              <label className="label-field">Descrição *</label>
              <input
                {...register('descricao', { required: 'Descrição obrigatória' })}
                className="input-field"
                placeholder="Trigo (outros)"
              />
              {errors.descricao && <p className="text-red-500 text-xs mt-1">{errors.descricao.message}</p>}
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
