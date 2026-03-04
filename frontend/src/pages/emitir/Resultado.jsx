import { useFormContext } from "react-hook-form"
import { CheckCircle2, AlertCircle, Copy, Printer } from "lucide-react"
import toast from "react-hot-toast"
import { abrirDanfe } from "../../utils/danfe"

export default function Resultado({ resultado }) {
  const { getValues } = useFormContext()

  if (!resultado) return null

  return (
    <div className={`card p-5 fade-in border-l-4 ${resultado.sucesso ? "border-l-verde-500" : "border-l-red-400"}`}>
      <div className="flex items-center gap-3 mb-3">
        {resultado.sucesso
          ? <CheckCircle2 className="w-6 h-6 text-verde-600" />
          : <AlertCircle className="w-6 h-6 text-red-500" />}
        <h3 className="font-display font-bold text-lg">
          {resultado.sucesso ? "Nota Fiscal Autorizada!" : "Erro na Transmissão"}
        </h3>
      </div>

      {resultado.sucesso ? (
        <div className="space-y-2">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-semibold">Chave de Acesso</span>
              <button
                onClick={() => { navigator.clipboard.writeText(resultado.chave_acesso); toast.success("Copiado!") }}
                className="text-verde-600 hover:text-verde-800"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="font-mono text-xs text-gray-800 break-all mt-1">{resultado.chave_acesso}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500">Protocolo</p>
              <p className="font-semibold text-sm">{resultado.numero_protocolo}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Data Autorização</p>
              <p className="font-semibold text-sm">{resultado.data_autorizacao}</p>
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button
              type="button"
              onClick={() => abrirDanfe(getValues(), resultado)}
              className="btn-secondary"
            >
              <Printer className="w-4 h-4" />
              DANFE Autorizado
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-sm text-red-700">{resultado.mensagem}</p>
            {resultado.codigo_status && (
              <p className="text-xs text-red-500 mt-1">Código SEFAZ: {resultado.codigo_status}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
