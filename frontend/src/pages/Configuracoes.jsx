import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Settings, Save, AlertTriangle } from 'lucide-react'

const CONFIG_KEY = 'nfpr_config'

export default function Configuracoes() {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { ambiente_padrao: '2' }
  })

  useEffect(() => {
    const salvo = localStorage.getItem(CONFIG_KEY)
    if (salvo) {
      try { reset(JSON.parse(salvo)) } catch {}
    }
  }, [reset])

  const onSalvar = (dados) => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(dados))
    toast.success('Configurações salvas!')
  }

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-verde-600" />
          Configurações
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">Preferências do sistema</p>
      </div>

      <div className="card p-5">
        <h2 className="section-title mb-4">Ambiente SEFAZ</h2>
        <form onSubmit={handleSubmit(onSalvar)} className="space-y-4 max-w-sm">
          <div>
            <label className="label-field">Ambiente padrão para transmissão</label>
            <select {...register('ambiente_padrao')} className="input-field">
              <option value="2">Homologação (testes)</option>
              <option value="1">Produção</option>
            </select>
          </div>
          <button type="submit" className="btn-primary">
            <Save className="w-4 h-4" />
            Salvar
          </button>
        </form>
      </div>

      <div className="card p-5 border border-amber-100 bg-amber-50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Ambiente de Produção</p>
            <p className="text-sm text-amber-700 mt-1">
              Somente altere para <strong>Produção</strong> quando estiver com o certificado digital
              válido e após testar todos os fluxos em homologação. Notas emitidas em produção
              têm validade legal e fiscal.
            </p>
          </div>
        </div>
      </div>

      <div className="card p-5 border border-blue-100 bg-blue-50">
        <div className="flex items-start gap-3">
          <Settings className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-800 text-sm">Dados do Produtor</p>
            <p className="text-sm text-blue-700 mt-1">
              As configurações de cada produtor (nome, CPF, IE, série da NF-e e certificado digital)
              são gerenciadas individualmente em <strong>Produtores</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
