import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, FileText, CheckCircle2, XCircle, Clock,
  Loader2, Copy, Printer, Download, ServerCrash, ChevronDown, ChevronUp, PenLine,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { detalheNota, respostasNota, baixarXmlNota } from '../services/api'
import { abrirDanfe } from '../utils/danfe'
import { decodeId, encodeId } from '../utils/urlUtils'

const STATUS_CONFIG = {
  autorizada: { label: 'Autorizada', icon: CheckCircle2, cls: 'text-green-700 bg-green-50 border-green-200' },
  rejeitada:  { label: 'Rejeitada',  icon: XCircle,      cls: 'text-red-700   bg-red-50   border-red-200'   },
  cancelada:  { label: 'Cancelada',  icon: XCircle,      cls: 'text-gray-600  bg-gray-100 border-gray-200'  },
  pendente:   { label: 'Pendente',   icon: Clock,        cls: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
}

const fmt = (v) =>
  (parseFloat(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const fmtDate = (d) => (d ? d.split('-').reverse().join('/') : '—')

const fmtNum = (v, dec = 4) =>
  (parseFloat(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })

const fmtDoc = (raw) => {
  if (!raw) return '—'
  const v = String(raw).replace(/\D/g, '')
  if (v.length === 11) return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (v.length === 14) return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  return raw
}

const fmtCep = (v) => {
  if (!v) return '—'
  const n = String(v).replace(/\D/g, '')
  return n.length === 8 ? n.replace(/(\d{5})(\d{3})/, '$1-$2') : v
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pendente
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  )
}

function InfoRow({ label, value, mono = false }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`text-sm text-gray-900 font-medium ${mono ? 'font-mono break-all' : ''}`}>{value || '—'}</p>
    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <div className="card p-5 space-y-4">
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b border-gray-100 pb-2">{title}</h3>
      {children}
    </div>
  )
}

function RespostaCard({ resposta }) {
  const [xmlOpen, setXmlOpen] = useState(null) // 'enviado' | 'recebido' | null

  const fmtDatetime = (iso) => {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleString('pt-BR')
    } catch {
      return iso
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{resposta.tipo}</span>
          {resposta.codigo_status && (
            <span className="text-xs font-mono bg-gray-200 text-gray-700 px-2 py-0.5 rounded">{resposta.codigo_status}</span>
          )}
        </div>
        <span className="text-xs text-gray-400">{fmtDatetime(resposta.criado_em)}</span>
      </div>
      {resposta.mensagem && (
        <div className="px-4 py-3">
          <p className="text-sm text-gray-800">{resposta.mensagem}</p>
        </div>
      )}
      <div className="px-4 pb-3 flex gap-2">
        {resposta.xml_enviado && (
          <button
            onClick={() => setXmlOpen(xmlOpen === 'enviado' ? null : 'enviado')}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {xmlOpen === 'enviado' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            XML Enviado
          </button>
        )}
        {resposta.xml_recebido && (
          <button
            onClick={() => setXmlOpen(xmlOpen === 'recebido' ? null : 'recebido')}
            className="flex items-center gap-1 text-xs text-verde-600 hover:text-verde-800 font-medium"
          >
            {xmlOpen === 'recebido' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            XML Recebido
          </button>
        )}
      </div>
      {xmlOpen && (
        <div className="border-t border-gray-100">
          <div className="flex items-center justify-between px-4 pt-2 pb-1">
            <span className="text-xs text-gray-400 font-semibold uppercase">{xmlOpen}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(xmlOpen === 'enviado' ? resposta.xml_enviado : resposta.xml_recebido)
                toast.success('Copiado!')
              }}
              className="text-gray-400 hover:text-gray-700"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <pre className="text-xs font-mono text-gray-700 bg-gray-50 px-4 py-3 overflow-x-auto whitespace-pre-wrap break-all max-h-80 overflow-y-auto">
            {xmlOpen === 'enviado' ? resposta.xml_enviado : resposta.xml_recebido}
          </pre>
        </div>
      )}
    </div>
  )
}

const TABS = ['Dados', 'Itens', 'Retornos SEFAZ']

export default function NotaDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const notaId = decodeId(id)
  const [nota, setNota] = useState(null)
  const [respostas, setRespostas] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingRespostas, setLoadingRespostas] = useState(false)
  const [tab, setTab] = useState('Dados')
  const [baixando, setBaixando] = useState(false)
  const [imprimindo, setImprimindo] = useState(false)

  useEffect(() => {
    if (!notaId) { toast.error('Link inválido'); navigate('/notas', { replace: true }); return }
    setLoading(true)
    detalheNota(notaId)
      .then(setNota)
      .catch(() => toast.error('Nota não encontrada'))
      .finally(() => setLoading(false))
  }, [notaId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab !== 'Retornos SEFAZ' || !notaId) return
    setLoadingRespostas(true)
    respostasNota(notaId)
      .then(setRespostas)
      .catch(() => toast.error('Erro ao carregar retornos SEFAZ'))
      .finally(() => setLoadingRespostas(false))
  }, [tab, notaId])

  const handleBaixarXml = async () => {
    if (!nota?.chave_acesso) { toast.error('XML não disponível'); return }
    setBaixando(true)
    try {
      const { blob, filename } = await baixarXmlNota(notaId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
      toast.success('XML baixado com sucesso')
    } catch {
      toast.error('Erro ao baixar o XML')
    } finally {
      setBaixando(false)
    }
  }

  const handleDanfe = async () => {
    if (!nota) return
    setImprimindo(true)
    try {
      const resultado = nota.status === 'autorizada' ? {
        sucesso: true,
        chave_acesso: nota.chave_acesso,
        numero_protocolo: nota.numero_protocolo,
        data_autorizacao: nota.data_autorizacao,
      } : null
      abrirDanfe(nota, resultado)
    } catch {
      toast.error('Erro ao gerar DANFE')
    } finally {
      setImprimindo(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 gap-3 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Carregando nota...</span>
      </div>
    )
  }

  if (!nota) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-gray-400">
        <ServerCrash className="w-8 h-8" />
        <p className="text-sm">Nota não encontrada.</p>
      </div>
    )
  }

  const end = nota.produtor?.endereco || {}
  const endDest = nota.destinatario?.endereco || {}

  return (
    <div className="space-y-5 fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-secondary p-2">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-10 h-10 bg-verde-600 rounded-xl flex items-center justify-center shadow-sm">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-gray-900 text-xl leading-tight">
              NF Nº {String(nota.numero).padStart(6, '0')} — Série {nota.serie || '001'}
            </h1>
            <p className="text-gray-500 text-sm">
              Emissão: {fmtDate(nota.data_emissao)} &nbsp;·&nbsp; {nota.ambiente === 1 ? 'Produção' : 'Homologação'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={nota.status} />
          {nota.status === 'rejeitada' && (
            <button
              onClick={() => navigate(`/emitir?editar=${encodeId(nota.id)}`)}
              title="Corrigir e retransmitir nota rejeitada"
              className="btn-secondary text-amber-700 border-amber-200 hover:bg-amber-50"
            >
              <PenLine className="w-4 h-4" />
              Editar e reenviar
            </button>
          )}
          <button
            onClick={handleBaixarXml}
            disabled={baixando || nota.status !== 'autorizada'}
            title={nota.status !== 'autorizada' ? 'XML disponível apenas para notas autorizadas' : 'Baixar XML'}
            className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {baixando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            XML
          </button>
          <button onClick={handleDanfe} disabled={imprimindo} className="btn-secondary disabled:opacity-40">
            {imprimindo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            DANFE
          </button>
        </div>
      </div>

      {/* Rejection message */}
      {nota.status === 'rejeitada' && nota.mensagem_rejeicao && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-800">Motivo da rejeição</p>
          <p className="text-xs text-red-700 mt-0.5">{nota.mensagem_rejeicao}</p>
        </div>
      )}

      {/* Authorization info */}
      {nota.status === 'autorizada' && nota.chave_acesso && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-500">Chave de Acesso</span>
            <button
              onClick={() => { navigator.clipboard.writeText(nota.chave_acesso); toast.success('Copiado!') }}
              className="text-verde-600 hover:text-verde-800"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="font-mono text-xs text-gray-800 break-all">{nota.chave_acesso}</p>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <InfoRow label="Protocolo" value={nota.numero_protocolo} mono />
            <InfoRow label="Data Autorização" value={nota.data_autorizacao} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t
                ? 'text-verde-700 border-b-2 border-verde-600 bg-white -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab: Dados */}
      {tab === 'Dados' && (
        <div className="space-y-4">
          <SectionCard title="Identificação">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <InfoRow label="Natureza da Operação" value={nota.natureza_operacao} />
              <InfoRow label="Data Emissão" value={fmtDate(nota.data_emissao)} />
              <InfoRow label="Data Saída" value={fmtDate(nota.data_saida)} />
              <InfoRow label="Hora Saída" value={nota.hora_saida} />
              <InfoRow label="Ambiente" value={nota.ambiente === 1 ? 'Produção' : 'Homologação'} />
            </div>
          </SectionCard>

          <SectionCard title="Emitente (Produtor)">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <InfoRow label="Nome" value={nota.produtor?.nome} />
              <InfoRow label="CPF/CNPJ" value={fmtDoc(nota.produtor?.documento)} mono />
              <InfoRow label="IE" value={nota.produtor?.ie} mono />
              <InfoRow label="Logradouro" value={end.logradouro} />
              <InfoRow label="Número" value={end.numero} />
              <InfoRow label="Bairro" value={end.bairro} />
              <InfoRow label="Município" value={end.municipio} />
              <InfoRow label="UF" value={end.uf} />
              <InfoRow label="CEP" value={fmtCep(end.cep)} mono />
            </div>
          </SectionCard>

          <SectionCard title="Destinatário">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <InfoRow label="Nome" value={nota.destinatario?.nome} />
              <InfoRow label="CPF/CNPJ" value={fmtDoc(nota.destinatario?.cpf_cnpj)} mono />
              <InfoRow label="IE" value={nota.destinatario?.ie || 'Não informada'} />
              <InfoRow label="Logradouro" value={endDest.logradouro} />
              <InfoRow label="Número" value={endDest.numero} />
              <InfoRow label="Bairro" value={endDest.bairro} />
              <InfoRow label="Município" value={endDest.municipio} />
              <InfoRow label="UF" value={endDest.uf} />
              <InfoRow label="CEP" value={fmtCep(endDest.cep)} mono />
            </div>
          </SectionCard>

          <SectionCard title="Totais">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <InfoRow label="Valor Total" value={fmt(nota.valor_total)} />
              <InfoRow label="Valor ICMS" value={fmt(nota.valor_icms)} />
              <InfoRow label="Valor FUNRURAL" value={fmt(nota.valor_funrural)} />
            </div>
          </SectionCard>

          {nota.informacoes_adicionais && (
            <SectionCard title="Informações Adicionais">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{nota.informacoes_adicionais}</p>
            </SectionCard>
          )}
        </div>
      )}

      {/* Tab: Itens */}
      {tab === 'Itens' && (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                  <th className="px-3 py-3 text-left w-8">#</th>
                  <th className="px-3 py-3 text-left">Descrição</th>
                  <th className="px-3 py-3 text-left w-24">NCM</th>
                  <th className="px-3 py-3 text-left w-16">CFOP</th>
                  <th className="px-3 py-3 text-right w-24">Qtd.</th>
                  <th className="px-3 py-3 text-right w-28">Vl. Unit.</th>
                  <th className="px-3 py-3 text-right w-28">Vl. Total</th>
                  <th className="px-3 py-3 text-right w-24">ICMS</th>
                  <th className="px-3 py-3 text-right w-24">FUNRURAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(nota.itens || []).map((item) => (
                  <tr key={item.numero_item} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-gray-400 font-mono text-xs">{item.numero_item}</td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-gray-900">{item.descricao}</p>
                      <p className="text-xs text-gray-400">{item.codigo_produto} · {item.unidade}</p>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-gray-600">{item.ncm}</td>
                    <td className="px-3 py-3 font-mono text-xs text-gray-600">{item.cfop}</td>
                    <td className="px-3 py-3 text-right text-gray-700">{fmtNum(item.quantidade)}</td>
                    <td className="px-3 py-3 text-right text-gray-700">{fmt(item.valor_unitario)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-gray-900">{fmt(item.valor_total)}</td>
                    <td className="px-3 py-3 text-right text-gray-700 text-xs">
                      {fmt(item.valor_icms)}
                      <span className="text-gray-400 block">{fmtNum(item.aliq_icms, 1)}%</span>
                    </td>
                    <td className="px-3 py-3 text-right text-gray-700 text-xs">
                      {fmt(item.valor_funrural)}
                      <span className="text-gray-400 block">{fmtNum(item.aliq_funrural, 1)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Retornos SEFAZ */}
      {tab === 'Retornos SEFAZ' && (
        <div className="space-y-3">
          {loadingRespostas ? (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Carregando retornos...</span>
            </div>
          ) : respostas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <ServerCrash className="w-8 h-8" />
              <p className="text-sm">Nenhum retorno SEFAZ registrado para esta nota.</p>
            </div>
          ) : (
            respostas.map((r) => <RespostaCard key={r.id} resposta={r} />)
          )}
        </div>
      )}
    </div>
  )
}
