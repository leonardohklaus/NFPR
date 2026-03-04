import { useState, useEffect, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import toast from 'react-hot-toast'
import { MapPin, Plus, Search, Edit2, Trash2, X, Check } from 'lucide-react'
import { listarMunicipiosDB, criarMunicipio, atualizarMunicipio, removerMunicipio } from '../services/api'
import Combobox from '../components/Combobox'
import Modal from '../components/Modal'

const UFS = ['RS', 'SC', 'PR', 'MG']

export default function Municipios() {
  const [municipios, setMunicipios] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [ufFiltro, setUfFiltro] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const debounceRef = useRef(null)

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm()

  const carregar = async (params = {}) => {
    setLoading(true)
    try {
      const dados = await listarMunicipiosDB({ apenas_ativos: false, ...params })
      setMunicipios(dados)
    } catch {
      toast.error('Erro ao carregar municípios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const filtrar = (novaBusca, novaUf) => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = { apenas_ativos: false }
      if (novaBusca) params.busca = novaBusca
      if (novaUf) params.uf = novaUf
      carregar(params)
    }, 300)
  }

  const onBuscaChange = (v) => {
    setBusca(v)
    filtrar(v, ufFiltro)
  }

  const onUfChange = (v) => {
    setUfFiltro(v)
    filtrar(busca, v)
  }

  const abrirModal = (item = null) => {
    setEditando(item)
    reset(item ? { codigo_ibge: item.codigo_ibge, nome: item.nome, uf: item.uf, ativo: item.ativo } : { ativo: true })
    setModalAberto(true)
  }

  const fecharModal = () => {
    setModalAberto(false)
    setEditando(null)
    reset()
  }

  const onSalvar = async (dados) => {
    try {
      if (editando) {
        await atualizarMunicipio(editando.id, dados)
        toast.success('Município atualizado')
      } else {
        await criarMunicipio(dados)
        toast.success('Município cadastrado')
      }
      fecharModal()
      filtrar(busca, ufFiltro)
    } catch (e) {
      const msg = e.response?.data?.detail
      toast.error(msg || 'Erro ao salvar')
    }
  }

  const onRemover = async (id) => {
    try {
      await removerMunicipio(id)
      toast.success('Município removido')
      setConfirmDelete(null)
      filtrar(busca, ufFiltro)
    } catch {
      toast.error('Erro ao remover município')
    }
  }

  const badgeUf = (uf) => {
    const cores = {
      RS: 'bg-blue-100 text-blue-700',
      SC: 'bg-green-100 text-green-700',
      PR: 'bg-purple-100 text-purple-700',
      MG: 'bg-amber-100 text-amber-700',
    }
    return cores[uf] || 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-verde-600" />
            Municípios
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Cadastro de municípios para RS, SC, PR e MG</p>
        </div>
        <button onClick={() => abrirModal()} className="btn-primary">
          <Plus className="w-4 h-4" />
          Novo Município
        </button>
      </div>

      {/* Filtros */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={busca}
            onChange={e => onBuscaChange(e.target.value)}
            placeholder="Buscar por nome ou código IBGE..."
            className="input-field pl-9"
          />
        </div>
        <div className="sm:w-40">
          <Combobox
            value={ufFiltro}
            onChange={onUfChange}
            options={[
              { value: '', label: 'Todas as UFs' },
              ...UFS.map(uf => ({ value: uf, label: uf })),
            ]}
            placeholder="Todas as UFs"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 uppercase tracking-wide">Código IBGE</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 uppercase tracking-wide">Nome</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 uppercase tracking-wide">UF</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">Carregando...</td></tr>
            ) : municipios.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">Nenhum município encontrado</td></tr>
            ) : municipios.map(m => (
              <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-mono text-gray-600">{m.codigo_ibge}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{m.nome}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${badgeUf(m.uf)}`}>
                    {m.uf}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${m.ativo ? 'text-verde-600' : 'text-gray-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${m.ativo ? 'bg-verde-500' : 'bg-gray-300'}`} />
                    {m.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    {confirmDelete === m.id ? (
                      <>
                        <span className="text-xs text-gray-500 mr-1">Confirmar?</span>
                        <button onClick={() => onRemover(m.id)} className="p-1.5 rounded text-red-600 hover:bg-red-50">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setConfirmDelete(null)} className="p-1.5 rounded text-gray-400 hover:bg-gray-100">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => abrirModal(m)} className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setConfirmDelete(m.id)} className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && municipios.length > 0 && (
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400">{municipios.length} município(s) encontrado(s)</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalAberto && (
        <Modal title={editando ? 'Editar Município' : 'Novo Município'} onClose={fecharModal}>
          <form onSubmit={handleSubmit(onSalvar)} className="space-y-4">
            <div>
              <label className="label-field">Código IBGE</label>
              <input
                {...register('codigo_ibge', {
                  required: 'Obrigatório',
                  pattern: { value: /^\d{7}$/, message: 'Deve ter exatamente 7 dígitos' },
                })}
                disabled={!!editando}
                placeholder="Ex: 4314902"
                className={`input-field font-mono ${editando ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
              {errors.codigo_ibge && <p className="text-red-500 text-xs mt-1">{errors.codigo_ibge.message}</p>}
            </div>

            <div>
              <label className="label-field">Nome</label>
              <input
                {...register('nome', { required: 'Obrigatório' })}
                placeholder="Ex: Porto Alegre"
                className="input-field"
              />
              {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>}
            </div>

            <div>
              <label className="label-field">UF</label>
              <Controller
                name="uf"
                control={control}
                rules={{ required: 'Obrigatório' }}
                render={({ field }) => (
                  <Combobox
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    options={[
                      { value: '', label: 'Selecione' },
                      ...UFS.map(uf => ({ value: uf, label: uf })),
                    ]}
                    placeholder="Selecione"
                  />
                )}
              />
              {errors.uf && <p className="text-red-500 text-xs mt-1">{errors.uf.message}</p>}
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="ativo" {...register('ativo')} className="rounded" />
              <label htmlFor="ativo" className="text-sm text-gray-700">Ativo</label>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={fecharModal} className="btn-secondary flex-1">Cancelar</button>
              <button type="submit" className="btn-primary flex-1">
                {editando ? 'Salvar' : 'Cadastrar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
