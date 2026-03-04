import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  Users, ArrowLeft, ShieldCheck, ShieldOff, FileText,
  Upload, Trash2, CheckCircle2, AlertCircle, KeyRound,
  Calendar, Hash, Info, Building2, Zap, ExternalLink, Loader2,
  UserPlus, UserMinus, Shield, User,
} from 'lucide-react'
import {
  buscarProdutor, atualizarProdutor,
  uploadCertificadoProdutor, infoCertificadoProdutor,
  removerCertificadoProdutor, ativarCertificadoProdutor,
  listarNotasProdutor, listarACs,
  listarUsuariosProdutor, vincularUsuarioProdutor, desvincularUsuarioProdutor,
  criarUsuarioParaProdutor, listarUsuarios,
} from '../services/api'
import { useCep } from '../hooks/useCep'
import Combobox from '../components/Combobox'
import { decodeId } from '../utils/urlId'
import { mascararDocumento } from '../utils/documentos'
import { useAuth } from '../context/AuthContext'

const ABAS = ['Dados', 'Certificado', 'Notas', 'Usuários']

export default function ProdutorDetalhe() {
  const { id: idEncoded } = useParams()
  const id = decodeId(idEncoded)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAdmin } = useAuth()
  const [abaAtiva, setAbaAtiva] = useState(() => {
    const aba = searchParams.get('aba')
    return ABAS.includes(aba) ? aba : 'Dados'
  })

  useEffect(() => {
    const aba = searchParams.get('aba')
    if (ABAS.includes(aba)) setAbaAtiva(aba)
  }, [searchParams])
  const [produtor, setProdutor] = useState(null)
  const [certInfo, setCertInfo] = useState(null)
  const [notas, setNotas] = useState([])
  const [acs, setACs] = useState(null)
  const [arquivo, setArquivo] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [ativando, setAtivando] = useState(false)
  const [usuariosVinculados, setUsuariosVinculados] = useState([])
  const [todosUsuarios, setTodosUsuarios] = useState([])
  const [usuarioParaVincular, setUsuarioParaVincular] = useState('')
  const [vinculando, setVinculando] = useState(false)
  const [novoUsuario, setNovoUsuario] = useState({ username: '', nome: '', email: '', password: '' })
  const [criandoUsuario, setCriandoUsuario] = useState(false)

  const { register: regDados, handleSubmit: subDados, reset: resetDados, setValue: setValueDados, formState: { isSubmitting: savingDados } } = useForm()
  const { register: regCert, handleSubmit: subCert, reset: resetCert } = useForm()
  const { buscandoCep, buscarCep } = useCep()

  const onCepBlur = async (e) => {
    const dados = await buscarCep(e.target.value)
    if (!dados) return
    if (dados.logradouro) setValueDados('logradouro', dados.logradouro)
    if (dados.bairro) setValueDados('bairro', dados.bairro)
    if (dados.municipio) setValueDados('municipio', dados.municipio)
    if (dados.cod_municipio) setValueDados('cod_municipio', dados.cod_municipio)
  }

  const carregarProdutor = async () => {
    try {
      const [p, cert, acs] = await Promise.all([
        buscarProdutor(id),
        infoCertificadoProdutor(id),
        listarACs(),
      ])
      setProdutor(p)
      setCertInfo(cert)
      setACs(acs)
      resetDados({
        ie: p.ie,
        nome: p.nome,
        serie: p.serie ?? '001',
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
    } catch {
      toast.error('Produtor não encontrado')
      navigate('/produtores')
    }
  }

  const carregarNotas = async () => {
    try {
      const data = await listarNotasProdutor(id)
      setNotas(data.notas ?? [])
    } catch {}
  }

  const carregarUsuarios = async () => {
    try {
      const vinculados = await listarUsuariosProdutor(id)
      setUsuariosVinculados(vinculados)
      if (isAdmin) {
        const todos = await listarUsuarios()
        setTodosUsuarios(todos.filter(u => u.role === 'produtor'))
      }
    } catch {}
  }

  useEffect(() => { carregarProdutor() }, [id])
  useEffect(() => {
    if (abaAtiva === 'Notas') carregarNotas()
    if (abaAtiva === 'Usuários') carregarUsuarios()
  }, [abaAtiva])

  const salvarDados = async (dados) => {
    try {
      await atualizarProdutor(id, {
        ie: dados.ie,
        nome: dados.nome,
        serie: dados.serie,
        ativo: dados.ativo,
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
      })
      toast.success('Dados atualizados')
      carregarProdutor()
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Erro ao salvar')
    }
  }

  const onUploadCert = async (dados) => {
    if (!arquivo) { toast.error('Selecione o arquivo .pfx'); return }
    setUploading(true)
    try {
      const res = await uploadCertificadoProdutor(id, arquivo, dados.senha)
      if (res.sucesso) {
        toast.success('Certificado salvo com sucesso')
        resetCert()
        setArquivo(null)
        carregarProdutor()
      } else {
        toast.error(res.mensagem ?? 'Erro ao carregar certificado')
      }
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Erro de comunicação')
    } finally {
      setUploading(false)
    }
  }

  const removerCert = async () => {
    if (!confirm(`Remover o certificado de ${produtor?.nome}?`)) return
    try {
      await removerCertificadoProdutor(id)
      toast.success('Certificado removido')
      carregarProdutor()
    } catch {
      toast.error('Erro ao remover certificado')
    }
  }

  const ativarCert = async () => {
    setAtivando(true)
    try {
      await ativarCertificadoProdutor(id)
      toast.success(`Certificado de ${produtor?.nome} ativado para emissão`)
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Erro ao ativar certificado')
    } finally {
      setAtivando(false)
    }
  }

  const handleVincular = async () => {
    if (!usuarioParaVincular) return
    setVinculando(true)
    try {
      await vincularUsuarioProdutor(id, usuarioParaVincular)
      toast.success('Usuário vinculado')
      setUsuarioParaVincular('')
      carregarUsuarios()
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Erro ao vincular usuário')
    } finally {
      setVinculando(false)
    }
  }

  const handleDesvincular = async (userId) => {
    try {
      await desvincularUsuarioProdutor(id, userId)
      toast.success('Usuário desvinculado')
      carregarUsuarios()
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Erro ao desvincular usuário')
    }
  }

  const handleCriarUsuario = async (e) => {
    e.preventDefault()
    if (!novoUsuario.username || !novoUsuario.nome || !novoUsuario.password) {
      toast.error('Preencha usuário, nome e senha')
      return
    }
    setCriandoUsuario(true)
    try {
      const res = await criarUsuarioParaProdutor(id, novoUsuario)
      toast.success(res.mensagem)
      setNovoUsuario({ username: '', nome: '', email: '', password: '' })
      carregarUsuarios()
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Erro ao criar usuário')
    } finally {
      setCriandoUsuario(false)
    }
  }

  const tipoDocumento = (produtor?.documento || '').replace(/[^A-Za-z0-9]/g, '').length === 11 ? 'CPF' : 'CNPJ'

  if (!produtor) {
    return <div className="p-10 text-center text-gray-400">Carregando...</div>
  }

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/produtores')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 mt-0.5 flex-shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="section-title">
              <Users className="w-6 h-6 text-verde-600" />
              {produtor.nome}
            </h1>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium
              ${produtor.ativo ? 'bg-verde-50 text-verde-700' : 'bg-gray-100 text-gray-400'}`}>
              {produtor.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-0.5">{tipoDocumento}: {mascararDocumento(produtor.documento)} · IE: {produtor.ie} · Série {produtor.serie || '001'}</p>
        </div>
      </div>

      {/* Abas */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {ABAS.map(aba => (
            <button
              key={aba}
              onClick={() => setAbaAtiva(aba)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
                ${abaAtiva === aba
                  ? 'border-verde-600 text-verde-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {aba === 'Notas' ? `${aba} (${notas.length})`
               : aba === 'Usuários' ? `${aba} (${usuariosVinculados.length})`
               : aba}
            </button>
          ))}
        </nav>
      </div>

      {/* ─── ABA: DADOS ─── */}
      {abaAtiva === 'Dados' && (
        <form onSubmit={subDados(salvarDados)} className="space-y-5">
          <div className="card p-5 space-y-5">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Identificação</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Nome completo *</label>
                  <input {...regDados('nome', { required: true })} className="input-field" />
                </div>
                <div>
                  <label className="label-field">{tipoDocumento}</label>
                  <input value={mascararDocumento(produtor.documento)} disabled className="input-field opacity-50 font-mono" />
                </div>
                <div>
                  <label className="label-field">Inscrição Estadual *</label>
                  <input {...regDados('ie', { required: true })} className="input-field font-mono" />
                </div>
                <div>
                  <label className="label-field">Série da NF-e</label>
                  <input {...regDados('serie')} className="input-field font-mono" placeholder="001" maxLength={10} />
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Endereço</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label-field">CEP *</label>
                  <div className="relative">
                    <input
                      {...regDados('cep', { required: true })}
                      className="input-field font-mono pr-8"
                      maxLength={8}
                      onBlur={onCepBlur}
                    />
                    {buscandoCep && (
                      <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-verde-500 animate-spin" />
                    )}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="label-field">Logradouro *</label>
                  <input {...regDados('logradouro', { required: true })} className="input-field" />
                </div>
                <div>
                  <label className="label-field">Número *</label>
                  <input {...regDados('numero', { required: true })} className="input-field" />
                </div>
                <div>
                  <label className="label-field">Complemento</label>
                  <input {...regDados('complemento')} className="input-field" />
                </div>
                <div>
                  <label className="label-field">Bairro *</label>
                  <input {...regDados('bairro', { required: true })} className="input-field" />
                </div>
                <div className="sm:col-span-2">
                  <label className="label-field">Município *</label>
                  <input {...regDados('municipio', { required: true })} className="input-field" />
                </div>
                <div>
                  <label className="label-field">Cód. IBGE *</label>
                  <input {...regDados('cod_municipio', { required: true })} className="input-field font-mono" maxLength={7} />
                </div>
                <div>
                  <label className="label-field">Telefone</label>
                  <input {...regDados('telefone')} className="input-field" />
                </div>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" {...regDados('ativo')} className="w-4 h-4 rounded accent-verde-600" />
              Produtor ativo
            </label>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={savingDados} className="btn-primary">
              {savingDados ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      )}

      {/* ─── ABA: CERTIFICADO ─── */}
      {abaAtiva === 'Certificado' && (
        <div className="space-y-5">
          {/* Status */}
          <div className={`card p-5 border-l-4 ${certInfo?.carregado ? 'border-l-verde-500' : 'border-l-gray-300'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                  ${certInfo?.carregado ? 'bg-verde-100' : 'bg-gray-100'}`}>
                  {certInfo?.carregado
                    ? <ShieldCheck className="w-5 h-5 text-verde-700" />
                    : <ShieldOff className="w-5 h-5 text-gray-400" />
                  }
                </div>
                <div>
                  <p className="font-semibold text-gray-800">
                    {certInfo?.carregado ? 'Certificado Cadastrado' : 'Nenhum Certificado'}
                  </p>
                  {certInfo?.carregado ? (
                    <div className="space-y-1 mt-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <KeyRound className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-medium">{certInfo.titular}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Válido até {certInfo.validade}
                        </span>
                        <span className="flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          {certInfo.serial?.substring(0, 16)}...
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-0.5">Faça o upload do .pfx para habilitar a transmissão</p>
                  )}
                </div>
              </div>
              {certInfo?.carregado && (
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={ativarCert}
                    disabled={ativando}
                    className="btn-primary flex items-center gap-1.5 text-xs"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    {ativando ? 'Ativando...' : 'Ativar para emissão'}
                  </button>
                  <button onClick={removerCert} className="btn-danger flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5" />
                    Remover
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Upload */}
          <div className="card p-5">
            <h2 className="section-title mb-4">
              <Upload className="w-4 h-4 text-verde-600" />
              {certInfo?.carregado ? 'Substituir Certificado' : 'Carregar Certificado'}
            </h2>
            <form onSubmit={subCert(onUploadCert)} className="space-y-4">
              <div>
                <label className="label-field">Arquivo (.pfx / .p12)</label>
                <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-all
                  ${arquivo ? 'border-verde-400 bg-verde-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}>
                  <div className="flex flex-col items-center gap-1.5">
                    {arquivo ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-verde-600" />
                        <p className="text-sm font-semibold text-verde-700">{arquivo.name}</p>
                        <p className="text-xs text-verde-600">{(arquivo.size / 1024).toFixed(1)} KB</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-gray-400" />
                        <p className="text-sm text-gray-500">Clique para selecionar .pfx ou .p12</p>
                      </>
                    )}
                  </div>
                  <input type="file" accept=".pfx,.p12" className="hidden" onChange={e => setArquivo(e.target.files[0])} />
                </label>
              </div>
              <div>
                <label className="label-field">Senha do Certificado</label>
                <input type="password" {...regCert('senha', { required: true })} className="input-field" placeholder="Senha do .pfx" />
              </div>
              <button type="submit" disabled={uploading || !arquivo} className="btn-primary">
                <ShieldCheck className="w-4 h-4" />
                {uploading ? 'Salvando...' : 'Salvar Certificado'}
              </button>
            </form>
          </div>

          {/* ACs */}
          {acs && (
            <div className="card p-5">
              <h2 className="section-title mb-1">
                <Building2 className="w-4 h-4 text-verde-600" />
                Como obter um certificado
              </h2>
              <p className="text-sm text-gray-500 mb-4">{acs.informacao}</p>
              <div className="bg-verde-50 border border-verde-100 rounded-xl p-4 mb-4">
                <h3 className="font-semibold text-verde-800 text-sm mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4" /> Passo a passo para o Produtor Rural
                </h3>
                <ol className="space-y-1.5">
                  {acs.passos_obtencao.map((p, i) => (
                    <li key={i} className="text-sm text-verde-700">{p}</li>
                  ))}
                </ol>
                <p className="text-xs text-verde-600 mt-3 font-medium">✓ {acs.tipo_recomendado}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {acs.autoridades_certificadoras.map((ac, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-4 bg-white hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{ac.nome}</p>
                        {ac.telefone && <p className="text-xs text-gray-500 mt-0.5">{ac.telefone}</p>}
                        {ac.descricao && <p className="text-xs text-gray-500 mt-0.5 italic">{ac.descricao}</p>}
                      </div>
                      {ac.site && (
                        <a href={ac.site} target="_blank" rel="noopener noreferrer" className="text-verde-600 hover:text-verde-800 ml-2 flex-shrink-0">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-4 border border-amber-100 bg-amber-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">
                O certificado é armazenado de forma segura no banco de dados.
                Para transmitir notas, clique em <strong>"Ativar para emissão"</strong> para carregá-lo na memória do servidor.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── ABA: USUÁRIOS ─── */}
      {abaAtiva === 'Usuários' && (
        <div className="space-y-4">
          {/* Admin: vincular usuário existente */}
          {isAdmin && (
            <div className="card p-5">
              <h2 className="section-title mb-4">
                <UserPlus className="w-4 h-4 text-verde-600" />
                Vincular usuário existente
              </h2>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Combobox
                    value={usuarioParaVincular}
                    onChange={setUsuarioParaVincular}
                    placeholder="Selecione ou busque um usuário produtor..."
                    options={todosUsuarios
                      .filter(u => !usuariosVinculados.some(v => v.id === u.id))
                      .map(u => ({ value: u.id, label: `${u.nome} (${u.username})` }))}
                  />
                </div>
                <button
                  onClick={handleVincular}
                  disabled={!usuarioParaVincular || vinculando}
                  className="btn-primary flex items-center gap-1.5 whitespace-nowrap"
                >
                  <UserPlus className="w-4 h-4" />
                  {vinculando ? 'Vinculando...' : 'Vincular'}
                </button>
              </div>
            </div>
          )}

          {/* Criar novo usuário produtor */}
          <div className="card p-5">
            <h2 className="section-title mb-4">
              <UserPlus className="w-4 h-4 text-verde-600" />
              {isAdmin ? 'Criar novo usuário' : 'Criar usuário para este produtor'}
            </h2>
            <form onSubmit={handleCriarUsuario} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Usuário (login)</label>
                  <input
                    className="input-field"
                    placeholder="ex: joao.silva"
                    value={novoUsuario.username}
                    onChange={e => setNovoUsuario(p => ({ ...p, username: e.target.value.toLowerCase() }))}
                  />
                </div>
                <div>
                  <label className="label-field">Nome completo</label>
                  <input
                    className="input-field"
                    placeholder="ex: João Silva"
                    value={novoUsuario.nome}
                    onChange={e => setNovoUsuario(p => ({ ...p, nome: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label-field">E-mail <span className="text-gray-400 font-normal">(opcional)</span></label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="ex: joao@exemplo.com"
                    value={novoUsuario.email}
                    onChange={e => setNovoUsuario(p => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label-field">Senha</label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Senha de acesso"
                    value={novoUsuario.password}
                    onChange={e => setNovoUsuario(p => ({ ...p, password: e.target.value }))}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Se já existir um usuário com esse login, ele será vinculado automaticamente a este produtor.
              </p>
              <div className="flex justify-end">
                <button type="submit" disabled={criandoUsuario} className="btn-primary flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4" />
                  {criandoUsuario ? 'Salvando...' : 'Criar e vincular'}
                </button>
              </div>
            </form>
          </div>

          {/* Lista de usuários vinculados */}
          <div className="card overflow-hidden">
            {usuariosVinculados.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Nenhum usuário vinculado a este produtor
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Nome</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Usuário</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {usuariosVinculados.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-verde-50 flex items-center justify-center">
                            <User className="w-3 h-3 text-verde-600" />
                          </div>
                          <span className="font-medium text-gray-900">{u.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{u.username}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${u.ativo ? 'text-verde-600' : 'text-gray-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.ativo ? 'bg-verde-500' : 'bg-gray-300'}`} />
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDesvincular(u.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                            title="Desvincular"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ─── ABA: NOTAS ─── */}
      {abaAtiva === 'Notas' && (
        <div className="card overflow-hidden">
          {notas.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Nenhuma nota emitida por este produtor
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs tracking-wide w-20">Nº</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs tracking-wide hidden sm:table-cell">Data</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase text-xs tracking-wide">Destinatário</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase text-xs tracking-wide hidden md:table-cell">Valor</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase text-xs tracking-wide w-24">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {notas.map(n => (
                    <tr key={n.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-verde-700">{String(n.numero).padStart(6, '0')}</td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{n.data_emissao}</td>
                      <td className="px-4 py-3 text-gray-700">{n.destinatario_nome}</td>
                      <td className="px-4 py-3 text-right text-gray-700 hidden md:table-cell">
                        {n.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium
                          ${n.status === 'autorizada' ? 'bg-verde-50 text-verde-700'
                          : n.status === 'pendente' ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-600'}`}>
                          {n.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-4 py-2 border-t border-gray-50 text-xs text-gray-400">
            {notas.length} nota{notas.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
