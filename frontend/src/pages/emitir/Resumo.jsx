import { useFormContext } from "react-hook-form"
import { Info, Download, Send, Printer, PenLine } from "lucide-react"
import { fmt } from "./constants"
import { abrirDanfe } from "../../utils/danfe"

export default function Resumo({ gerando, assinando, enviando, onGerarXML, onAssinarXML }) {
  const { watch, handleSubmit, getValues } = useFormContext()
  const itens = watch("itens")

  const totalNF       = itens?.reduce((acc, i) => acc + (parseFloat(i.valor_total)    || 0), 0) || 0
  const totalFunrural = itens?.reduce((acc, i) => acc + (parseFloat(i.valor_funrural) || 0), 0) || 0
  const totalSenar    = itens?.reduce((acc, i) => acc + (parseFloat(i.valor_senar)    || 0), 0) || 0
  const totalIcmsDif  = itens?.reduce((acc, i) => acc + (i.cst_icms === "51" ? parseFloat(i.valor_icms) || 0 : 0), 0) || 0
  const totalLiquido  = totalNF - totalFunrural - totalSenar

  const icmsNota = () => {
    if (!itens?.length) return ""
    if (itens.every((i) => (i.cst_icms || "41") === "41"))
      return "Não tributado — CST 41 (Simples Nacional / Produtor Rural)"
    if (itens.every((i) => i.cst_icms === "40"))
      return "Isento — CST 40"
    return `Misto — ${itens.filter((i) => i.cst_icms === "51").length} item(s) com diferimento (CST 51)`
  }

  return (
    <div className="card p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
        Resumo da Nota Fiscal
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-gray-50 rounded-xl p-4 lg:col-span-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total dos Produtos</p>
          <p className="text-3xl font-display font-bold text-gray-900">R$ {fmt(totalNF)}</p>
          <p className="text-xs text-gray-400 mt-1">{itens?.length || 0} item(s)</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4">
          <p className="text-xs text-amber-700 uppercase tracking-wide mb-1">FUNRURAL 2,5%</p>
          <p className="text-xl font-display font-bold text-amber-800">R$ {fmt(totalFunrural)}</p>
          <p className="text-xs text-amber-600 mt-1">Retido pelo adquirente</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4">
          <p className="text-xs text-amber-700 uppercase tracking-wide mb-1">SENAR 0,2%</p>
          <p className="text-xl font-display font-bold text-amber-800">R$ {fmt(totalSenar)}</p>
          <p className="text-xs text-amber-600 mt-1">Retido pelo adquirente</p>
        </div>
      </div>

      {totalIcmsDif > 0 && (
        <div className="bg-blue-50 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-700 uppercase tracking-wide mb-1">ICMS Diferido (CST 51)</p>
              <p className="text-xs text-blue-600">100% diferido — recolhido pelo adquirente na saída</p>
            </div>
            <p className="text-xl font-display font-bold text-blue-800">R$ {fmt(totalIcmsDif)}</p>
          </div>
        </div>
      )}

      <div className="border-t border-gray-100 pt-4 mb-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-700">Total Líquido do Produtor</p>
            <p className="text-xs text-gray-400">Total − FUNRURAL − SENAR</p>
          </div>
          <p className="text-3xl font-display font-bold text-verde-700">R$ {fmt(totalLiquido)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-4">
        <Info className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
        <span>
          ICMS: {icmsNota()}{" · "}FUNRURAL e SENAR retidos pelo adquirente da produção
        </span>
      </div>

      <div className="flex flex-wrap gap-3 justify-end">
        <button
          type="button"
          onClick={() => abrirDanfe(getValues())}
          className="btn-secondary"
        >
          <Printer className="w-4 h-4" />
          Visualizar DANFE
        </button>
        <button
          type="button"
          onClick={handleSubmit(onGerarXML)}
          disabled={gerando}
          className="btn-secondary"
        >
          <Download className="w-4 h-4" />
          {gerando ? "Gerando..." : "Baixar XML"}
        </button>
        <button
          type="button"
          onClick={handleSubmit(onAssinarXML)}
          disabled={assinando}
          className="btn-secondary"
        >
          <PenLine className="w-4 h-4" />
          {assinando ? "Assinando..." : "Assinar XML"}
        </button>
        <button type="submit" disabled={enviando} className="btn-primary">
          <Send className="w-4 h-4" />
          {enviando ? "Transmitindo..." : "Transmitir à SEFAZ"}
        </button>
      </div>
    </div>
  )
}
