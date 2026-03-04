import { Users, ShieldCheck, ShieldOff } from "lucide-react"
import Combobox from "../../components/Combobox"
import { mascararDocumento } from "../../utils/documentos"

export default function ProdutorSelector({ produtores, produtorSelecionado, onChangeProdutorSelect }) {
  return (
    <div className={`card p-4 border-l-4 ${produtorSelecionado ? "border-l-verde-500" : "border-l-gray-200"}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 text-gray-700 flex-shrink-0">
          <Users className="w-4 h-4 text-verde-600" />
          <span className="text-sm font-medium">Produtor emitente</span>
        </div>
        <div className="flex-1">
          <Combobox
            value={produtorSelecionado?.id ? String(produtorSelecionado.id) : ""}
            onChange={(id) => onChangeProdutorSelect(id)}
            options={[
              { value: "", label: "— Preencher manualmente —" },
              ...produtores.map((p) => ({
                value: String(p.id),
                label: `${p.nome} (${p.documento?.length === 11 ? 'CPF' : 'CNPJ'}: ${mascararDocumento(p.documento)})`,
              })),
            ]}
            placeholder="Selecione um produtor ou preencha manualmente..."
          />
        </div>
        {produtorSelecionado && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {produtorSelecionado.cert_carregado ? (
              <span className="flex items-center gap-1 text-verde-700 text-xs">
                <ShieldCheck className="w-3.5 h-3.5" /> Cert. ativo
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600 text-xs">
                <ShieldOff className="w-3.5 h-3.5" /> Sem certificado
              </span>
            )}
          </div>
        )}
      </div>
      {produtorSelecionado && (
        <p className="text-xs text-gray-400 mt-2">
          Os campos do produtor foram preenchidos automaticamente. Selecione "Preencher manualmente" para editar.
        </p>
      )}
    </div>
  )
}
