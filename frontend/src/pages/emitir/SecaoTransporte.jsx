import { useFormContext, Controller } from "react-hook-form"
import { Truck } from "lucide-react"
import Combobox from "../../components/Combobox"
import { Section, Field } from "./components"
import { FRETES } from "./constants"

export default function SecaoTransporte() {
  const { register, control } = useFormContext()
  return (
    <Section icon={Truck} title="Transporte" defaultOpen={false}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Modalidade do Frete">
          <Controller
            name="transporte.modalidade_frete"
            control={control}
            render={({ field }) => (
              <Combobox
                value={String(field.value ?? 9)}
                onChange={field.onChange}
                onBlur={field.onBlur}
                options={FRETES}
                placeholder="Modalidade..."
              />
            )}
          />
        </Field>
        <Field label="Nome do Transportador">
          <input
            {...register("transporte.transportador_nome")}
            className="input-field"
            placeholder="Opcional"
          />
        </Field>
        <Field label="Placa do Veículo">
          <input
            {...register("transporte.placa_veiculo")}
            className="input-field"
            placeholder="ABC-1234"
          />
        </Field>
        <Field label="Peso Bruto (kg)">
          <input
            type="number" step="0.001"
            {...register("transporte.peso_bruto")}
            className="input-field"
          />
        </Field>
        <Field label="Peso Líquido (kg)">
          <input
            type="number" step="0.001"
            {...register("transporte.peso_liquido")}
            className="input-field"
          />
        </Field>
      </div>
    </Section>
  )
}
