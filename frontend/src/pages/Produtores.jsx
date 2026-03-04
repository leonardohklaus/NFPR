import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  Users, Plus, Search, Pencil, Trash2, X, Check,
  ChevronRight, ShieldCheck, ShieldOff, Loader2,
} from 'lucide-react'
import { listarProdutores, criarProdutor, atualizarProdutor, removerProdutor } from '../services/api'
import { useCep } from '../hooks/useCep'
import { mascararDocumento, validarDocumento } from '../utils/documentos'
import { encodeId } from '../utils/urlId'
import { useAuth } from '../context/AuthContext'

const MUNICIPIOS_PADRAO = [
  { codigo: '4314902', nome: 'Porto Alegre' },
  { codigo: '4305108', nome: 'Caxias do Sul' },
  { codigo: '4304606', nome: 'Canoas' },
  { codigo: '4316907', nome: 'Santa Maria' },
  { codigo: '4314407', nome: 'Pelotas' },
]

export default function Produtores() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [produtores, setProdutores] = useState([])
  const [loading, setLoading] = useState(false)
  const [busca, setBusca] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [confirmarRemover, setConfirmarRemover] = useState(null)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm()
  const { buscandoCep, buscarCep } = useCep()

  const onCepBlur = async (e) => {
    const dados = await buscarCep(e.target.value)
    if (!dados) return
    if (dados.logradouro) setValue('logradouro', dados.logradouro)
    if (dados.bairro) setValue('bairro', dados.bairro)
    if (dados.municipio) setValue('municipio', dados.municipio)
    if (dados.cod_municipio) setValue('cod_municipio', dados.cod_municipio)
  }

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const params = { apenas_ativos: false }
      if (busca) params.busca = busca
      const data = await listarProdutores(params)
      setProdutores(data)
    } catch {
      toast.error('Erro ao carregar produtores')
    } finally {
      setLoading(false)
    }
  }, [busca])

  useEffect(() => {
    const t = setTimeout(carregar, 300)
    return () => clearTimeout(t)
  }, [carregar])

  const abrirModal = (p = null) => {
    setEditando(p)
    if (p) {
      reset({
        documento: mascararDocumento(p.documento),
        ie: p.ie,
        nome: p.nome,
        serie: p.serie ?? '001',
        regime_tributario: p.regime_tributario ?? 'simples',
        ativo: p.ativo,
        logradouro: p.endereco.logradouro,
        numero: p.endereco.numero,
        complemento: p.endereco.complemento ?? '',
        bairro: p.endereco.bairro,
        municipio: p.endereco.municipio,
        cod_municipio: p.endereco.cod_municipio,
        cep: p.endereco.cep,
        telefone: p.endereco.telefone ?? '',
      })
    } else {
      reset({ uf: 'RS' })
    }
    setModalAberto(true)
  }

  const fecharModal = () => {
    setModalAberto(false)
    setEditando(null)
    reset()
  }

  const onSubmit = async (dados) => {
    const docRaw = dados.documento.replace(/[^A-Za-z0-9]/g, '')
    const payload = {
      documento: docRaw,  // raw, sem formatação
      ie: dados.ie,
      nome: dados.nome,
      serie: dados.serie || '001',
      regime_tributario: docRaw.length === 14 ? (dados.regime_tributario || 'simples') : 'simples',
      endereco: {
        logradouro: dados.logradouro,
        numero: dados.numero,
        complemento: dados.complemento || null,
        bairro: dados.bairro,
        municipio: dados.municipio,
        cod_municipio: dados.cod_municipio,
        uf: 'RS',
        cep: dados.cep,
        telefone: dados.telefone || null,
      },
    }
    try {
      if (editando) {
        await atualizarProdutor(editando.id, { ...payload, ativo: dados.ativo })
        toast.success('Produtor atualizado')
      } else {
        await criarProdutor(payload)
        toast.success('Produtor cadastrado')
      }
      fecharModal()
      carregar()
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Erro ao salvar produtor')
    }
  }

  const remover = async (id) => {
    try {
      await removerProdutor(id)
      toast.success('Produtor removido')
      setConfirmarRemover(null)
      carregar()
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Erro ao remover produtor')
    }
  }

  const formatDocumento = (doc) => mascararDocumento(doc)

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">
            <Users className="w-7 h-7 text-verde-600" />
            Produtores Rurais
          </h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie os produtores, seus certificados e notas fiscais</p>
        </div>
        {isAdmin && (
          <button onClick={() => abrirModal()} className="btn-primary flex items-center gap-2 self-start sm:self-auto">
            <Plus className="w-4 h-4" />
            Novo Produtor
          </button>
        )}
      </div>

      {/* Busca */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou CNPJ..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="input-field pl-9"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Carregando...</div>
        ) : produtores.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Nenhum produtor encontrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs tracking-wide">Nome</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs tracking-wide hidden sm:table-cell">CPF / CNPJ</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs tracking-wide hidden md:table-cell">Município</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase text-xs tracking-wide w-24">Certificado</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase text-xs tracking-wide w-16">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase text-xs tracking-wide w-28">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {produtores.map(p => (
                  <tr
                    key={p.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/produtores/${encodeId(p.id)}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{p.nome}</p>
                      <p className="text-gray-400 text-xs">IE: {p.ie}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-600 hidden sm:table-cell">{formatDocumento(p.documento)}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{p.endereco?.municipio}</td>
                    <td className="px-4 py-3 text-center">
                      {p.cert_carregado ? (
                        <span className="inline-flex items-center gap-1 text-verde-700 text-xs">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-400 text-xs">
                          <ShieldOff className="w-3.5 h-3.5" />
                          Sem cert.
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium
                        ${p.ativo ? 'bg-verde-50 text-verde-700' : 'bg-gray-100 text-gray-400'}`}>
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-1 items-center">
                        <button
                          onClick={() => navigate(`/produtores/${encodeId(p.id)}`)}
                          className="p-1.5 rounded-lg hover:bg-verde-50 text-gray-400 hover:text-verde-600 transition-colors"
                          title="Ver detalhe"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => abrirModal(p)}
                              className="p-1.5 rounded-lg hover:bg-verde-50 text-gray-400 hover:text-verde-600 transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {confirmarRemover === p.id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => remover(p.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Confirmar">
                                  <Check className="w-4 h-4" />
                                </button>
                                <button onClick={() => setConfirmarRemover(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors" title="Cancelar">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmarRemover(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Remover">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
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
          {produtores.length} produtor{produtores.length !== 1 ? 'es' : ''}
        </div>
      </div>

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="font-display font-semibold text-gray-800">
                {editando ? 'Editar Produtor' : 'Novo Produtor'}
              </h2>
              <button onClick={fecharModal} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
              {/* Identificação */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Identificação</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label-field">Nome completo *</label>
                    <input {...register('nome', { required: 'Obrigatório' })} className="input-field" placeholder="João da Silva" />
                    {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>}
                  </div>
                  <div>
                    <label className="label-field">
                      {(watch('documento') || '').replace(/[^A-Za-z0-9]/g, '').length > 11 ? 'CNPJ' : 'CPF'} *
                    </label>
                    <input
                      {...register('documento', {
                        required: 'Obrigatório',
                        validate: v => {
                          const n = v.replace(/[^A-Za-z0-9]/g, '')
                          if (n.length !== 11 && n.length !== 14) return 'CPF (11 dígitos) ou CNPJ (14 caracteres)'
                          return validarDocumento(n) || (n.length === 11 ? 'CPF inválido' : 'CNPJ inválido')
                        },
                      })}
                      className="input-field font-mono"
                      placeholder="CPF ou CNPJ"
                      maxLength={18}
                      disabled={!!editando}
                      onChange={e => {
                        const masked = mascararDocumento(e.target.value)
                        e.target.value = masked
                        register('documento').onChange(e)
                      }}
                    />
                    {errors.documento && <p className="text-red-500 text-xs mt-1">{errors.documento.message}</p>}
                  </div>
                  <div>
                    <label className="label-field">Inscrição Estadual *</label>
                    <input {...register('ie', { required: 'Obrigatório' })} className="input-field font-mono" placeholder="000/0000000" />
                    {errors.ie && <p className="text-red-500 text-xs mt-1">{errors.ie.message}</p>}
                  </div>
                  <div>
                    <label className="label-field">Série da NF-e</label>
                    <input {...register('serie')} className="input-field font-mono" placeholder="001" maxLength={10} />
                  </div>
                  {(watch('documento') || '').replace(/[^A-Za-z0-9]/g, '').length === 14 && (
                    <div className="sm:col-span-2">
                      <label className="label-field">Regime Tributário *</label>
                      <select {...register('regime_tributario')} className="input-field">
                        <option value="produtor_rural">Produtor Rural PJ (CRT 4)</option>
                        <option value="simples">Simples Nacional (CRT 1)</option>
                        <option value="simples_excesso">Simples Nacional – Excesso de sublimite (CRT 2)</option>
                        <option value="presumido">Lucro Presumido (CRT 3)</option>
                        <option value="real">Lucro Real (CRT 3)</option>
                        <option value="arbitrado">Lucro Arbitrado (CRT 3)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Endereço */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Endereço</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="label-field">CEP *</label>
                    <div className="relative">
                      <input
                        {...register('cep', { required: 'Obrigatório' })}
                        className="input-field font-mono pr-8"
                        placeholder="00000000"
                        maxLength={8}
                        onBlur={onCepBlur}
                      />
                      {buscandoCep && (
                        <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-verde-500 animate-spin" />
                      )}
                    </div>
                    {errors.cep && <p className="text-red-500 text-xs mt-1">{errors.cep.message}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label-field">Logradouro *</label>
                    <input {...register('logradouro', { required: 'Obrigatório' })} className="input-field" placeholder="Rua das Araucárias" />
                    {errors.logradouro && <p className="text-red-500 text-xs mt-1">{errors.logradouro.message}</p>}
                  </div>
                  <div>
                    <label className="label-field">Número *</label>
                    <input {...register('numero', { required: 'Obrigatório' })} className="input-field" placeholder="123" />
                    {errors.numero && <p className="text-red-500 text-xs mt-1">{errors.numero.message}</p>}
                  </div>
                  <div>
                    <label className="label-field">Complemento</label>
                    <input {...register('complemento')} className="input-field" placeholder="Apto 2" />
                  </div>
                  <div>
                    <label className="label-field">Bairro *</label>
                    <input {...register('bairro', { required: 'Obrigatório' })} className="input-field" placeholder="Centro" />
                    {errors.bairro && <p className="text-red-500 text-xs mt-1">{errors.bairro.message}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label-field">Município *</label>
                    <input {...register('municipio', { required: 'Obrigatório' })} className="input-field" placeholder="Porto Alegre" />
                    {errors.municipio && <p className="text-red-500 text-xs mt-1">{errors.municipio.message}</p>}
                  </div>
                  <div>
                    <label className="label-field">Cód. IBGE *</label>
                    <input {...register('cod_municipio', { required: 'Obrigatório' })} className="input-field font-mono" placeholder="4314902" maxLength={7} />
                    {errors.cod_municipio && <p className="text-red-500 text-xs mt-1">{errors.cod_municipio.message}</p>}
                  </div>
                  <div>
                    <label className="label-field">Telefone</label>
                    <input {...register('telefone')} className="input-field" placeholder="(51) 99999-9999" />
                  </div>
                </div>
              </div>

              {editando && (
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" {...register('ativo')} className="w-4 h-4 rounded accent-verde-600" />
                  Ativo
                </label>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={fecharModal} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                  {isSubmitting ? 'Salvando...' : editando ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
