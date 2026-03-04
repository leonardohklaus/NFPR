import { useFormContext, Controller } from "react-hook-form"
import { MapPin, Loader2 } from "lucide-react"
import Combobox from "../../components/Combobox"
import { Section, Field } from "./components"
import { UFS } from "./constants"
import { validarCpf, validarCnpj } from "../../utils/documentos"

export default function SecaoDestinatario({ municipios, buscandoCep, buscandoCnpj, onCepBlur, onCpfCnpjBlur, onMunicipioChange }) {
  const { register, control, formState: { errors } } = useFormContext()

  return (
    <Section icon={MapPin} title="Destinatário">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label="CPF / CNPJ" error={errors?.destinatario?.cpf_cnpj}>
          <div className="relative">
            <input
              {...register("destinatario.cpf_cnpj", {
                required: "Obrigatório",
                validate: (v) => {
                  const n = v.replace(/\D/g, "")
                  if (n.length === 11) return validarCpf(n) || "CPF inválido"
                  if (n.length === 14) return validarCnpj(n) || "CNPJ inválido"
                  return "Informe CPF (11) ou CNPJ (14 dígitos)"
                },
              })}
              className="input-field pr-8"
              placeholder="CPF ou CNPJ (somente dígitos)"
              onBlur={onCpfCnpjBlur}
            />
            {buscandoCnpj && (
              <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-verde-500 animate-spin" />
            )}
          </div>
        </Field>
        <Field label="Nome / Razão Social">
          <input
            {...register("destinatario.nome", { required: "Obrigatório" })}
            className="input-field"
            placeholder="Empresa Compradora LTDA"
          />
        </Field>
        <Field label="Inscrição Estadual">
          <input {...register("destinatario.ie")} className="input-field" placeholder="Opcional" />
        </Field>
        <Field label="CEP">
          <div className="relative">
            <input
              {...register("destinatario.endereco.cep", { required: "Obrigatório" })}
              className="input-field pr-8"
              placeholder="00000000"
              onBlur={onCepBlur}
            />
            {buscandoCep && (
              <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-verde-500 animate-spin" />
            )}
          </div>
        </Field>
        <Field label="UF">
          <Controller
            name="destinatario.endereco.uf"
            control={control}
            render={({ field }) => (
              <Combobox
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                options={UFS.map((uf) => ({ value: uf, label: uf }))}
                placeholder="UF"
              />
            )}
          />
        </Field>
        <Field label="Logradouro">
          <input
            {...register("destinatario.endereco.logradouro", { required: "Obrigatório" })}
            className="input-field"
            placeholder="Rua das Indústrias"
          />
        </Field>
        <Field label="Número">
          <input
            {...register("destinatario.endereco.numero", { required: "Obrigatório" })}
            className="input-field"
            placeholder="100"
          />
        </Field>
        <Field label="Complemento">
          <input
            {...register("destinatario.endereco.complemento")}
            className="input-field"
            placeholder="Galpão A"
          />
        </Field>
        <Field label="Bairro">
          <input
            {...register("destinatario.endereco.bairro", { required: "Obrigatório" })}
            className="input-field"
            placeholder="Industrial"
          />
        </Field>
        <Field label="Município">
          <Controller
            name="destinatario.endereco.municipio"
            control={control}
            rules={{ required: "Obrigatório" }}
            render={({ field }) => (
              <Combobox
                value={field.value}
                onBlur={field.onBlur}
                onChange={(v) => {
                  field.onChange(v)
                  onMunicipioChange("destinatario.endereco", v)
                }}
                options={municipios.map((m) => ({ value: m.nome, label: m.nome }))}
                placeholder="Selecione o município..."
              />
            )}
          />
        </Field>
        <input type="hidden" {...register("destinatario.endereco.cod_municipio")} />
      </div>
    </Section>
  )
}
