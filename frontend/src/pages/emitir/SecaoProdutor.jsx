import { useFormContext, Controller } from "react-hook-form"
import { User, ShieldCheck, Loader2 } from "lucide-react"
import Combobox from "../../components/Combobox"
import { Section, Field } from "./components"
import { validarDocumento, mascararDocumento } from "../../utils/documentos"

export default function SecaoProdutor({ produtorSelecionado, municipios, buscandoCep, onCepBlur, onMunicipioChange }) {
  const { register, control, watch, formState: { errors } } = useFormContext()
  const locked = !!produtorSelecionado
  const cls = locked ? "opacity-60" : ""

  return (
    <Section icon={User} title="Produtor Rural (Emitente)">
      {locked && (
        <div className="mb-4 flex items-center gap-2 text-xs text-verde-700 bg-verde-50 border border-verde-100 rounded-lg px-3 py-2">
          <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
          Dados preenchidos de <strong>{produtorSelecionado.nome}</strong>. Selecione outro produtor para alterar.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label="Nome / Razão Social">
          <input
            {...register("produtor.nome", { required: "Obrigatório" })}
            className={`input-field ${cls}`}
            placeholder="João da Silva"
            readOnly={locked}
          />
        </Field>
        <Field
          label={(watch("produtor.documento") || "").replace(/[^A-Za-z0-9]/g, "").length > 11 ? "CNPJ" : "CPF"}
          error={!locked ? errors?.produtor?.documento : undefined}
        >
          <input
            {...register("produtor.documento", {
              required: "Obrigatório",
              validate: (v) => {
                if (locked) return true
                const n = v.replace(/[^A-Za-z0-9]/g, "")
                if (n.length !== 11 && n.length !== 14) return "CPF (11 dígitos) ou CNPJ (14 caracteres)"
                return validarDocumento(n) || (n.length === 11 ? "CPF inválido" : "CNPJ inválido")
              },
            })}
            className={`input-field font-mono ${cls}`}
            placeholder="CPF ou CNPJ"
            maxLength={18}
            readOnly={locked}
            onChange={e => {
              if (!locked) {
                e.target.value = mascararDocumento(e.target.value)
                register("produtor.documento").onChange(e)
              }
            }}
          />
        </Field>
        <Field label="Inscrição Estadual (Produtor Rural)">
          <input
            {...register("produtor.ie", { required: "Obrigatório" })}
            className={`input-field ${cls}`}
            placeholder="IE do produtor no RS"
            readOnly={locked}
          />
        </Field>
        {(watch("produtor.documento") || "").replace(/[^A-Za-z0-9]/g, "").length === 14 ? (
          <Field label="Regime Tributário">
            <select
              {...register("produtor.regime_tributario")}
              className={`input-field ${cls}`}
              disabled={locked}
            >
              <option value="produtor_rural">Produtor Rural PJ (CRT 4)</option>
              <option value="simples">Simples Nacional (CRT 1)</option>
              <option value="simples_excesso">Simples Nacional – Excesso de sublimite (CRT 2)</option>
              <option value="presumido">Lucro Presumido (CRT 3)</option>
              <option value="real">Lucro Real (CRT 3)</option>
              <option value="arbitrado">Lucro Arbitrado (CRT 3)</option>
            </select>
          </Field>
        ) : (
          <input type="hidden" {...register("produtor.regime_tributario")} value="simples" />
        )}
        <Field label="CEP">
          <div className="relative">
            <input
              {...register("produtor.endereco.cep", { required: "Obrigatório" })}
              className={`input-field font-mono pr-8 ${cls}`}
              placeholder="00000000"
              readOnly={locked}
              onBlur={onCepBlur}
            />
            {buscandoCep && !locked && (
              <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-verde-500 animate-spin" />
            )}
          </div>
        </Field>
        <Field label="Logradouro">
          <input
            {...register("produtor.endereco.logradouro", { required: "Obrigatório" })}
            className={`input-field ${cls}`}
            placeholder="Linha Rural"
            readOnly={locked}
          />
        </Field>
        <Field label="Número">
          <input
            {...register("produtor.endereco.numero", { required: "Obrigatório" })}
            className={`input-field ${cls}`}
            placeholder="S/N"
            readOnly={locked}
          />
        </Field>
        <Field label="Complemento">
          <input
            {...register("produtor.endereco.complemento")}
            className={`input-field ${cls}`}
            placeholder="Opcional"
            readOnly={locked}
          />
        </Field>
        <Field label="Bairro">
          <input
            {...register("produtor.endereco.bairro", { required: "Obrigatório" })}
            className={`input-field ${cls}`}
            placeholder="Zona Rural"
            readOnly={locked}
          />
        </Field>
        <Field label="Município">
          <Controller
            name="produtor.endereco.municipio"
            control={control}
            rules={{ required: "Obrigatório" }}
            render={({ field }) => (
              <Combobox
                value={field.value}
                onBlur={field.onBlur}
                onChange={(v) => {
                  field.onChange(v)
                  onMunicipioChange("produtor.endereco", v)
                }}
                options={municipios.map((m) => ({ value: m.nome, label: m.nome }))}
                placeholder="Selecione o município..."
                disabled={locked}
              />
            )}
          />
        </Field>
        <input type="hidden" {...register("produtor.endereco.cod_municipio")} />
        <input type="hidden" {...register("produtor.endereco.uf")} value="RS" />
        <Field label="Telefone">
          <input
            {...register("produtor.endereco.telefone")}
            className={`input-field ${cls}`}
            placeholder="(54) 99999-9999"
            readOnly={locked}
          />
        </Field>
      </div>
    </Section>
  )
}
