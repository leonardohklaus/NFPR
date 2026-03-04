import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, ShieldCheck, Activity, TrendingUp,
  AlertTriangle, CheckCircle2, ArrowRight,
  Leaf, RefreshCw, Server, Users, X,
} from 'lucide-react'
import { statusSefaz, infoCertificadoProdutor, proximaNumeracao, listarProdutores } from '../services/api'
import { useProdutorAtivo } from '../context/ProdutorContext'
import Combobox from '../components/Combobox'
import { encodeId } from '../utils/urlId'
import { mascararDocumento } from '../utils/documentos'

export default function Dashboard() {
  const [sefaz, setSefaz] = useState(null)
  const [cert, setCert] = useState(null)
  const [numeracao, setNumeracao] = useState(null)
  const [produtores, setProdutores] = useState([])
  const [loading, setLoading] = useState(true)
  const { produtorAtivo, selecionarProdutor, carregando: carregandoProdutor } = useProdutorAtivo()

  const carregar = async () => {
    setLoading(true)
    try {
      const produtorId = produtorAtivo?.id
      const [s, c, n, p] = await Promise.all([
        statusSefaz(2, produtorId || null),
        produtorId ? infoCertificadoProdutor(produtorId) : Promise.resolve({ carregado: false }),
        produtorId ? proximaNumeracao(produtorId) : Promise.resolve(null),
        listarProdutores({ apenas_ativos: true }),
      ])
      setSefaz(s)
      setCert(c)
      setNumeracao(n)
      setProdutores(p || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (carregandoProdutor) return
    carregar()
  }, [produtorAtivo?.id, carregandoProdutor])

  useEffect(() => {
    if (!carregandoProdutor && !produtorAtivo && produtores.length === 1) {
      selecionarProdutor(produtores[0])
    }
  }, [produtores, produtorAtivo, carregandoProdutor])

  const onChangeProdutorCombobox = async (id) => {
    if (!id) { await selecionarProdutor(null); return }
    const p = produtores.find(p => String(p.id) === id)
    if (p) await selecionarProdutor(p)
  }

  const StatusBadge = ({ status }) => {
    const map = {
      operacional: { color: 'bg-verde-100 text-verde-800', icon: CheckCircle2, label: 'Operacional' },
      simulado: { color: 'bg-blue-100 text-blue-800', icon: Activity, label: 'Dev Mode' },
      indisponível: { color: 'bg-red-100 text-red-700', icon: AlertTriangle, label: 'Indisponível' },
      erro: { color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle, label: 'Erro' },
    }
    const cfg = map[status] || map.erro
    const Icon = cfg.icon
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {cfg.label}
      </span>
    )
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Leaf className="w-7 h-7 text-verde-600" />
            Painel NFPR
          </h1>
          <p className="text-gray-500 mt-1">Nota Fiscal do Produtor Rural — Rio Grande do Sul</p>
        </div>
        <button onClick={carregar} disabled={loading} className="btn-secondary text-xs">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Seletor de produtor ativo da sessão */}
      <div className={`card p-5 border-l-4 transition-colors ${produtorAtivo ? 'border-l-verde-500' : 'border-l-gray-200'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${produtorAtivo ? 'bg-verde-100' : 'bg-gray-100'}`}>
              <Users className={`w-4 h-4 ${produtorAtivo ? 'text-verde-700' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Produtor ativo da sessão</p>
              <p className="text-xs text-gray-500">Utilizado automaticamente em emissões</p>
            </div>
          </div>

          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1">
              <Combobox
                value={produtorAtivo?.id ? String(produtorAtivo.id) : ''}
                onChange={onChangeProdutorCombobox}
                options={[
                  { value: '', label: '— Nenhum produtor selecionado —' },
                  ...produtores.map(p => ({ value: String(p.id), label: `${p.nome} — ${p.documento?.length === 11 ? 'CPF' : 'CNPJ'} ${mascararDocumento(p.documento)}` })),
                ]}
                placeholder="Selecione um produtor..."
              />
            </div>
            {produtorAtivo && (
              <button
                onClick={() => selecionarProdutor(null)}
                className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                title="Remover seleção"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {produtorAtivo && (
          <div className="mt-3 pt-3 border-t border-verde-100 flex flex-wrap gap-4 text-xs text-gray-600">
            <span><strong>{produtorAtivo.documento?.length === 11 ? 'CPF' : 'CNPJ'}:</strong> {mascararDocumento(produtorAtivo.documento)}</span>
            <span><strong>IE:</strong> {produtorAtivo.ie}</span>
            <span><strong>Série NF-e:</strong> {produtorAtivo.serie || '001'}</span>
            <span className={`flex items-center gap-1 font-medium ${produtorAtivo.cert_carregado ? 'text-verde-700' : 'text-amber-600'}`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              {produtorAtivo.cert_carregado ? 'Certificado cadastrado' : 'Sem certificado'}
            </span>
            <Link to={`/produtores/${encodeId(produtorAtivo.id)}`} className="text-verde-700 hover:underline flex items-center gap-1">
              Ver detalhe <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>

      {/* Alerta produtor inativo */}
      {produtorAtivo && !produtorAtivo.ativo && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 font-medium">
            O produtor selecionado (<strong>{produtorAtivo.nome}</strong>) está <strong>inativo</strong>. Selecione outro produtor ou reative-o antes de emitir notas.
          </p>
        </div>
      )}

      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* SEFAZ */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-verde-100 rounded-lg flex items-center justify-center">
                <Server className="w-4 h-4 text-verde-700" />
              </div>
              <span className="font-semibold text-sm text-gray-700">SEFAZ-RS</span>
            </div>
            {sefaz ? <StatusBadge status={sefaz.status} /> : <div className="w-20 h-6 bg-gray-100 rounded-full animate-pulse" />}
          </div>
          {sefaz && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500">{sefaz.mensagem}</p>
              <p className="text-xs text-gray-400">{sefaz.ambiente} · {sefaz.data_consulta}</p>
            </div>
          )}
        </div>

        {/* Certificado */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-blue-700" />
              </div>
              <span className="font-semibold text-sm text-gray-700">Certificado Digital</span>
            </div>
            {cert !== null ? (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cert.carregado ? 'bg-verde-100 text-verde-800' : 'bg-red-100 text-red-700'}`}>
                {cert.carregado ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {cert.carregado ? 'Ativo' : 'Não carregado'}
              </span>
            ) : <div className="w-20 h-6 bg-gray-100 rounded-full animate-pulse" />}
          </div>
          {cert?.carregado ? (
            <div className="space-y-1">
              <p className="text-xs text-gray-700 font-medium truncate">{cert.titular}</p>
              <p className="text-xs text-gray-500">Válido até {cert.validade}</p>
            </div>
          ) : (
            <Link
              to={produtorAtivo ? `/produtores/${encodeId(produtorAtivo.id)}?aba=Certificado` : '/produtores'}
              className="text-xs text-verde-700 hover:underline flex items-center gap-1"
            >
              Carregar via Produtor <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        {/* Numeração */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-terra-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-terra-700" />
            </div>
            <span className="font-semibold text-sm text-gray-700">Próxima NF-e</span>
          </div>
          {produtorAtivo ? (
            <div className="space-y-1">
              <p className="text-2xl font-display font-bold text-gray-900">
                {numeracao ? numeracao.numero.toString().padStart(6, '0') : '—'}
              </p>
              <p className="text-xs text-gray-500">
                Série {numeracao?.serie || produtorAtivo?.serie || '001'}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Selecione um produtor</p>
          )}
        </div>
      </div>

      {/* Ações rápidas */}
      <div>
        <h2 className="font-display text-lg font-semibold text-gray-800 mb-3">Ações rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link to="/emitir" className="card p-5 hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-verde-700 rounded-xl flex items-center justify-center shadow group-hover:scale-105 transition-transform">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">Emitir Nota Fiscal</p>
                <p className="text-sm text-gray-500">
                  {produtorAtivo ? `Produtor: ${produtorAtivo.nome}` : 'Preencher e transmitir NF-e para SEFAZ'}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-verde-600 transition-colors" />
            </div>
          </Link>

          <Link to="/produtores" className="card p-5 hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">Produtores</p>
                <p className="text-sm text-gray-500">Gerenciar cadastros e certificados</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
            </div>
          </Link>
        </div>
      </div>

      {/* Info FUNRURAL */}
      <div className="card p-5 border-l-4 border-l-terra-400">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-terra-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-gray-800 text-sm">Informações tributárias — Produtor Rural RS</p>
            <p className="text-sm text-gray-600 mt-1">
              O adquirente da produção rural é responsável pela retenção e recolhimento do <strong>FUNRURAL</strong> (2,5% sobre a receita bruta)
              e <strong>SENAR</strong> (0,2%). O ICMS nas operações com produtos da agropecuária é
              geralmente <strong>isento ou diferido</strong> no RS. Consulte sempre o contador.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
