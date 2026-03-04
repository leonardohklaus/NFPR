import { useState, useEffect, useCallback } from 'react'
import {
  ClipboardList, Download, Printer, RefreshCw,
  Search, CheckCircle2, XCircle, Clock, AlertCircle, Loader2, Users,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { listarNotas, detalheNota, baixarXmlNota, listarProdutores } from '../services/api'
import { encodeId } from '../utils/urlUtils'
import { abrirDanfe } from '../utils/danfe'
import { useProdutorAtivo } from '../context/ProdutorContext'
import Combobox from '../components/Combobox'
import { mascararDocumento } from '../utils/documentos'

const STATUS_CONFIG = {
  autorizada: { label: 'Autorizada', icon: CheckCircle2, cls: 'text-green-700 bg-green-50 border-green-200' },
  rejeitada:  { label: 'Rejeitada',  icon: XCircle,      cls: 'text-red-700   bg-red-50   border-red-200'   },
  cancelada:  { label: 'Cancelada',  icon: XCircle,      cls: 'text-gray-600  bg-gray-100 border-gray-200'  },
  pendente:   { label: 'Pendente',   icon: Clock,        cls: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
}

const fmt = (v) =>
  (parseFloat(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const fmtDate = (d) => (d ? d.split('-').reverse().join('/') : '—')

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pendente
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}

export default function NotasEmitidas() {
  const [notas, setNotas]     = useState([])
  const [loading, setLoading] = useState(false)
  const [busca, setBusca]     = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [baixando, setBaixando] = useState(null)  // id da nota sendo baixada
  const [imprimindo, setImprimindo] = useState(null)
  const [produtores, setProdutores] = useState([])
  const navigate = useNavigate()
  const { produtorAtivo, selecionarProdutor, carregando: carregandoProdutor } = useProdutorAtivo()

  const carregar = useCallback(async (produtorId) => {
    if (!produtorId) { setNotas([]); return }
    setLoading(true)
    try {
      const data = await listarNotas(produtorId)
      setNotas(data.notas || [])
    } catch {
      toast.error('Erro ao carregar notas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (carregandoProdutor) return
    carregar(produtorAtivo?.id)
  }, [produtorAtivo?.id, carregandoProdutor, carregar])

  useEffect(() => {
    listarProdutores({ apenas_ativos: true }).then(p => setProdutores(p || [])).catch(() => {})
  }, [])

  const onChangeProdutorCombobox = async (id) => {
    if (!id) { await selecionarProdutor(null); return }
    const p = produtores.find(p => String(p.id) === id)
    if (p) await selecionarProdutor(p)
  }

  const notasFiltradas = notas.filter((n) => {
    const termo = busca.toLowerCase()
    const matchBusca =
      !termo ||
      String(n.numero).includes(termo) ||
      n.destinatario_nome?.toLowerCase().includes(termo) ||
      n.produtor_nome?.toLowerCase().includes(termo) ||
      n.chave_acesso?.includes(termo)
    const matchStatus = filtroStatus === 'todos' || n.status === filtroStatus
    return matchBusca && matchStatus
  })

  const handleBaixarXml = async (nota) => {
    if (!nota.chave_acesso) {
      toast.error('XML não disponível — nota sem chave de acesso')
      return
    }
    setBaixando(nota.id)
    try {
      const { blob, filename } = await baixarXmlNota(nota.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success('XML baixado com sucesso')
    } catch {
      toast.error('Erro ao baixar o XML')
    } finally {
      setBaixando(null)
    }
  }

  const handleDanfe = async (nota) => {
    setImprimindo(nota.id)
    try {
      const detalhe = await detalheNota(nota.id)
      // Monta os objetos esperados por abrirDanfe
      const dados = {
        numero:               detalhe.numero,
        serie:                detalhe.serie,
        ambiente:             detalhe.ambiente,
        natureza_operacao:    detalhe.natureza_operacao,
        data_emissao:         detalhe.data_emissao,
        data_saida:           detalhe.data_saida,
        hora_saida:           detalhe.hora_saida,
        produtor:             detalhe.produtor,
        destinatario:         detalhe.destinatario,
        transporte:           detalhe.transporte,
        itens:                detalhe.itens,
        informacoes_adicionais: detalhe.informacoes_adicionais,
      }
      const resultado = detalhe.status === 'autorizada' ? {
        sucesso:          true,
        chave_acesso:     detalhe.chave_acesso,
        numero_protocolo: detalhe.numero_protocolo,
        data_autorizacao: detalhe.data_autorizacao,
      } : null
      abrirDanfe(dados, resultado)
    } catch {
      toast.error('Erro ao carregar dados para o DANFE')
    } finally {
      setImprimindo(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-verde-600 rounded-xl flex items-center justify-center shadow-sm">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-gray-900 text-xl leading-tight">
              Notas Emitidas
            </h1>
            <p className="text-gray-500 text-sm">
              {loading ? 'Carregando...' : `${notasFiltradas.length} de ${notas.length} nota${notas.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <button
          onClick={() => carregar(produtorAtivo?.id)}
          disabled={loading}
          className="btn-secondary"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Banner produtor */}
      {produtorAtivo ? (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-verde-50 border border-verde-100 rounded-xl text-sm text-verde-800">
          <Users className="w-4 h-4 flex-shrink-0" />
          Exibindo notas de <strong className="ml-1">{produtorAtivo.nome}</strong>
        </div>
      ) : (
        <div className="card p-5 border-l-4 border-l-amber-400">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Nenhum produtor selecionado</p>
                <p className="text-xs text-gray-500">Selecione um produtor para ver as notas emitidas</p>
              </div>
            </div>
            <div className="flex-1">
              <Combobox
                value=""
                onChange={onChangeProdutorCombobox}
                options={[
                  { value: '', label: '— Selecione um produtor —' },
                  ...produtores.map(p => ({ value: String(p.id), label: `${p.nome} — ${p.documento?.length === 11 ? 'CPF' : 'CNPJ'} ${mascararDocumento(p.documento)}` })),
                ]}
                placeholder="Selecione um produtor..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por número, destinatário, produtor ou chave..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="input-field pl-9 w-full"
          />
        </div>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="input-field w-auto"
        >
          <option value="todos">Todos os status</option>
          <option value="autorizada">Autorizada</option>
          <option value="rejeitada">Rejeitada</option>
          <option value="cancelada">Cancelada</option>
          <option value="pendente">Pendente</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Carregando notas...</span>
          </div>
        ) : !produtorAtivo ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <Users className="w-8 h-8" />
            <p className="text-sm font-medium">Selecione um produtor acima para ver as notas</p>
          </div>
        ) : notasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <AlertCircle className="w-8 h-8" />
            <p className="text-sm font-medium">
              {notas.length === 0 ? 'Nenhuma nota emitida ainda' : 'Nenhuma nota encontrada para os filtros'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                  <th className="px-4 py-3 text-left w-28">Nº / Série</th>
                  <th className="px-4 py-3 text-left w-28">Data</th>
                  <th className="px-4 py-3 text-left">Produtor</th>
                  <th className="px-4 py-3 text-left">Destinatário</th>
                  <th className="px-4 py-3 text-right w-32">Total</th>
                  <th className="px-4 py-3 text-center w-32">Status</th>
                  <th className="px-4 py-3 text-center w-24">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {notasFiltradas.map((nota) => (
                  <tr
                    key={nota.id}
                    onClick={() => navigate(`/notas/${encodeId(nota.id)}`)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    {/* Nº / Série */}
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-gray-900 text-sm">
                        {String(nota.numero).padStart(6, '0')}
                      </span>
                      <span className="text-gray-400 text-xs block">Série {nota.serie || '001'}</span>
                    </td>
                    {/* Data */}
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {fmtDate(nota.data_emissao)}
                    </td>
                    {/* Produtor */}
                    <td className="px-4 py-3">
                      <span className="text-gray-800 font-medium truncate block max-w-[180px]" title={nota.produtor_nome}>
                        {nota.produtor_nome || '—'}
                      </span>
                    </td>
                    {/* Destinatário */}
                    <td className="px-4 py-3">
                      <span className="text-gray-700 truncate block max-w-[200px]" title={nota.destinatario_nome}>
                        {nota.destinatario_nome || '—'}
                      </span>
                    </td>
                    {/* Total */}
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                      {fmt(nota.valor_total)}
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={nota.status} />
                    </td>
                    {/* Ações */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        {/* Download XML */}
                        <button
                          onClick={() => handleBaixarXml(nota)}
                          disabled={baixando === nota.id || nota.status !== 'autorizada'}
                          title={nota.status !== 'autorizada' ? 'XML disponível apenas para notas autorizadas' : 'Baixar XML'}
                          className="p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed
                                     text-gray-500 hover:text-verde-700 hover:bg-verde-50 enabled:cursor-pointer"
                        >
                          {baixando === nota.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Download className="w-4 h-4" />}
                        </button>
                        {/* DANFE */}
                        <button
                          onClick={() => handleDanfe(nota)}
                          disabled={imprimindo === nota.id}
                          title="Visualizar / Reimprimir DANFE"
                          className="p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed
                                     text-gray-500 hover:text-verde-700 hover:bg-verde-50 enabled:cursor-pointer"
                        >
                          {imprimindo === nota.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Printer className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
