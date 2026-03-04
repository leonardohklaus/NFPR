import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  ShieldCheck, Upload, Trash2, CheckCircle2, AlertCircle,
  ExternalLink, KeyRound, Calendar, Hash, Info, Building2
} from 'lucide-react'
import { uploadCertificado, infoCertificado, removerCertificado, listarACs } from '../services/api'

export default function CertificadoDigital() {
  const [certInfo, setCertInfo] = useState(null)
  const [acs, setACs] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [arquivo, setArquivo] = useState(null)
  const { register, handleSubmit, reset } = useForm()

  const carregarInfo = async () => {
    try {
      const [info, acsList] = await Promise.all([infoCertificado(), listarACs()])
      setCertInfo(info)
      setACs(acsList)
    } catch {}
  }

  useEffect(() => { carregarInfo() }, [])

  const onUpload = async (dados) => {
    if (!arquivo) { toast.error('Selecione o arquivo .pfx'); return }
    setUploading(true)
    try {
      const res = await uploadCertificado(arquivo, dados.senha)
      if (res.sucesso) {
        toast.success('Certificado carregado com sucesso!')
        await carregarInfo()
        reset()
        setArquivo(null)
      } else {
        toast.error(res.mensagem || 'Erro ao carregar certificado')
      }
    } catch (e) {
      toast.error('Erro de comunicação')
    } finally {
      setUploading(false)
    }
  }

  const onRemover = async () => {
    if (!confirm('Remover o certificado da memória?')) return
    await removerCertificado()
    toast.success('Certificado removido')
    await carregarInfo()
  }

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-blue-600" />
          Certificado Digital
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">Gerenciamento do certificado ICP-Brasil para assinatura de NF-e</p>
      </div>

      {/* Status atual */}
      <div className={`card p-5 border-l-4 ${certInfo?.carregado ? 'border-l-verde-500' : 'border-l-gray-300'}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${certInfo?.carregado ? 'bg-verde-100' : 'bg-gray-100'}`}>
              <ShieldCheck className={`w-5 h-5 ${certInfo?.carregado ? 'text-verde-700 pulse-green' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="font-semibold text-gray-800">
                {certInfo?.carregado ? 'Certificado Ativo' : 'Nenhum Certificado Carregado'}
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
                      Serial: {certInfo.serial?.substring(0, 16)}...
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 mt-0.5">Faça o upload do certificado .pfx para habilitar a transmissão</p>
              )}
            </div>
          </div>
          {certInfo?.carregado && (
            <button onClick={onRemover} className="btn-danger">
              <Trash2 className="w-3.5 h-3.5" />
              Remover
            </button>
          )}
        </div>
      </div>

      {/* Upload */}
      <div className="card p-5">
        <h2 className="section-title mb-4">
          <Upload className="w-4 h-4 text-verde-600" />
          {certInfo?.carregado ? 'Substituir Certificado' : 'Carregar Certificado'}
        </h2>
        <form onSubmit={handleSubmit(onUpload)} className="space-y-4">
          {/* Drop zone */}
          <div>
            <label className="label-field">Arquivo do Certificado (.pfx / .p12)</label>
            <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all
              ${arquivo ? 'border-verde-400 bg-verde-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300'}`}
            >
              <div className="flex flex-col items-center gap-2">
                {arquivo ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-verde-600" />
                    <p className="text-sm font-semibold text-verde-700">{arquivo.name}</p>
                    <p className="text-xs text-verde-600">{(arquivo.size / 1024).toFixed(1)} KB</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-gray-400" />
                    <p className="text-sm text-gray-600">Arraste ou clique para selecionar</p>
                    <p className="text-xs text-gray-400">Formatos: .pfx, .p12 (Certificado A1)</p>
                  </>
                )}
              </div>
              <input
                type="file"
                accept=".pfx,.p12"
                className="hidden"
                onChange={e => setArquivo(e.target.files[0])}
              />
            </label>
          </div>

          <div>
            <label className="label-field">Senha do Certificado</label>
            <input
              type="password"
              {...register('senha', { required: true })}
              className="input-field"
              placeholder="Senha definida na compra do certificado"
            />
          </div>

          <button type="submit" disabled={uploading || !arquivo} className="btn-primary">
            <ShieldCheck className="w-4 h-4" />
            {uploading ? 'Carregando...' : 'Carregar Certificado'}
          </button>
        </form>
      </div>

      {/* Autoridades Certificadoras */}
      {acs && (
        <div className="card p-5">
          <h2 className="section-title mb-1">
            <Building2 className="w-4 h-4 text-verde-600" />
            Como obter seu certificado
          </h2>
          <p className="text-sm text-gray-500 mb-4">{acs.informacao}</p>

          <div className="bg-verde-50 border border-verde-100 rounded-xl p-4 mb-4">
            <h3 className="font-semibold text-verde-800 text-sm mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Passo a passo para o Produtor Rural
            </h3>
            <ol className="space-y-1.5">
              {acs.passos_obtencao.map((passo, i) => (
                <li key={i} className="text-sm text-verde-700">{passo}</li>
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
                    <a href={ac.site} target="_blank" rel="noopener noreferrer"
                      className="text-verde-600 hover:text-verde-800 ml-2 flex-shrink-0">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Segurança */}
      <div className="card p-4 border border-amber-100 bg-amber-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Segurança do Certificado</p>
            <p className="text-sm text-amber-700 mt-1">
              O certificado é armazenado <strong>apenas em memória RAM</strong> durante a sessão do servidor e nunca é gravado em disco.
              Em ambiente de produção, considere utilizar um HSM ou solução de cofre de chaves (AWS KMS, Azure Key Vault) para maior segurança.
              Nunca compartilhe sua senha de certificado.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
