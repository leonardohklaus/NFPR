import { useFormContext, Controller } from "react-hook-form"
import { Info } from "lucide-react"
import Combobox from "../../components/Combobox"
import { Section, Field } from "./components"
import { NATUREZAS, FORMAS_PAGAMENTO } from "./constants"

export default function SecaoIdentificacao() {
  const { register, control } = useFormContext()
  return (
    <Section icon={Info} title="Identificação da Nota">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Field label="Natureza da Operação">
            <Controller
              name="natureza_operacao"
              control={control}
              render={({ field }) => (
                <Combobox
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  options={NATUREZAS.map((n) => ({ value: n, label: n }))}
                  placeholder="Selecione a natureza..."
                />
              )}
            />
          </Field>
        </div>
        <Field label="Data de Emissão">
          <input type="date" {...register("data_emissao")} className="input-field" />
        </Field>
        <Field label="Data de Saída">
          <input type="date" {...register("data_saida")} className="input-field" />
        </Field>
        <Field label="Hora de Saída">
          <input type="time" {...register("hora_saida")} className="input-field" />
        </Field>
        <Field label="Forma de Pagamento">
          <select {...register("forma_pagamento")} className="input-field">
            {FORMAS_PAGAMENTO.map((fp) => (
              <option key={fp.value} value={fp.value}>{fp.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Informações Adicionais">
          <input
            {...register("informacoes_adicionais")}
            placeholder="Observações da nota..."
            className="input-field"
          />
        </Field>
      </div>
    </Section>
  )
}
