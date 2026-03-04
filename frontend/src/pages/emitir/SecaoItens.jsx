import { useState, useEffect } from "react"
import { useFormContext, useFieldArray, Controller } from "react-hook-form"
import { Package, Trash2, Plus, Calculator } from "lucide-react"
import Combobox from "../../components/Combobox"
import CurrencyInput from "../../components/CurrencyInput"
import { Section, Field } from "./components"
import { UNIDADES, CST_ICMS, DEFAULT_ITEM, formatBRL, getAliqSugerida } from "./constants"

export default function SecaoItens({ ncms, cfops }) {
  const { register, control, watch, setValue } = useFormContext()
  const { fields, append, remove } = useFieldArray({ control, name: "itens" })

  const [modoItem, setModoItem] = useState({})
  const [sacasData, setSacasData] = useState({})

  const itens = watch("itens")
  const ufEmit = watch("produtor.endereco.uf")
  const ufDest = watch("destinatario.endereco.uf")
  const aliqSugerida = getAliqSugerida(ufEmit, ufDest)
  const labelOperacao = ufEmit === ufDest ? "interna" : "interestadual"

  const getModoItem = (idx) => modoItem[idx] || "padrao"
  const getSacasData = (idx) => sacasData[idx] || { sacas: "", kgPorSaca: 60, precoPorSaca: "" }

  const calcularItem = (idx) => {
    const item = watch(`itens.${idx}`)
    const total = (parseFloat(item.quantidade) || 0) * (parseFloat(item.valor_unitario) || 0)
    setValue(`itens.${idx}.valor_total`, parseFloat(total.toFixed(2)))
    setValue(`itens.${idx}.valor_funrural`, parseFloat((total * 0.025).toFixed(2)))
    setValue(`itens.${idx}.valor_senar`, parseFloat((total * 0.002).toFixed(2)))
    const aliq = parseFloat(item.aliq_icms) || 0
    const valorIcms = item.cst_icms === "51" && aliq > 0
      ? parseFloat(((total * aliq) / 100).toFixed(2))
      : 0
    setValue(`itens.${idx}.valor_icms`, valorIcms)
  }

  const onNCMChange = (idx, ncm) => {
    const produto = ncms.find((p) => p.ncm === ncm)
    if (produto) setValue(`itens.${idx}.descricao`, produto.descricao)
  }

  // Auto-aplicar alíquota sugerida a todos os itens CST 51 quando as UFs mudam
  useEffect(() => {
    if (aliqSugerida === null) return
    const currentItems = watch("itens") || []
    currentItems.forEach((item, idx) => {
      if (item.cst_icms === "51") {
        setValue(`itens.${idx}.aliq_icms`, aliqSugerida)
        setTimeout(() => calcularItem(idx), 50)
      }
    })
  }, [aliqSugerida]) // eslint-disable-line react-hooks/exhaustive-deps

  const onCstIcmsChange = (idx, cst) => {
    if (cst !== "51") {
      setValue(`itens.${idx}.aliq_icms`, 0)
      setValue(`itens.${idx}.valor_icms`, 0)
    } else {
      if (aliqSugerida !== null) {
        setValue(`itens.${idx}.aliq_icms`, aliqSugerida)
      }
      setTimeout(() => calcularItem(idx), 50)
    }
  }

  const calcularDeSacas = (sacas, kgPorSaca, precoPorSaca, idx) => {
    const s = parseFloat(sacas) || 0
    const kg = parseFloat(kgPorSaca) || 60
    const preco = parseFloat(precoPorSaca) || 0
    const total = parseFloat((s * preco).toFixed(2))
    const qtd = parseFloat((s * kg).toFixed(3))
    const unitario = kg > 0 ? parseFloat((preco / kg).toFixed(6)) : 0
    const item = watch(`itens.${idx}`)
    const aliq = parseFloat(item?.aliq_icms) || 0
    const cst = item?.cst_icms
    setValue(`itens.${idx}.unidade`, "KG")
    setValue(`itens.${idx}.quantidade`, qtd)
    setValue(`itens.${idx}.valor_unitario`, unitario)
    setValue(`itens.${idx}.valor_total`, total)
    setValue(`itens.${idx}.valor_funrural`, parseFloat((total * 0.025).toFixed(2)))
    setValue(`itens.${idx}.valor_senar`, parseFloat((total * 0.002).toFixed(2)))
    setValue(
      `itens.${idx}.valor_icms`,
      cst === "51" && aliq > 0 ? parseFloat(((total * aliq) / 100).toFixed(2)) : 0,
    )
  }

  const onSacaChange = (idx, key, value) => {
    const curr = sacasData[idx] || { sacas: "", kgPorSaca: 60, precoPorSaca: "" }
    const next = { ...curr, [key]: value }
    setSacasData((prev) => ({ ...prev, [idx]: next }))
    calcularDeSacas(next.sacas, next.kgPorSaca, next.precoPorSaca, idx)
  }

  const removeItem = (idx) => {
    const remap = (prev) => {
      const next = {}
      Object.entries(prev).forEach(([k, v]) => {
        const ki = parseInt(k)
        if (ki < idx) next[ki] = v
        else if (ki > idx) next[ki - 1] = v
      })
      return next
    }
    setModoItem(remap)
    setSacasData(remap)
    remove(idx)
  }

  return (
    <Section icon={Package} title={`Produtos / Itens (${fields.length})`}>
      <div className="space-y-5">
        {fields.map((field, idx) => (
          <div key={field.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50 relative">
            {/* Item header: label + mode toggle + remove */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Item {idx + 1}
                </span>
                <div className="flex items-center">
                  {[
                    { key: "padrao", label: "Qtd × Unit." },
                    { key: "peso",   label: "Peso × Unit.", extra: () => setValue(`itens.${idx}.unidade`, "KG") },
                    { key: "sacas",  label: "Por Sacas" },
                  ].map((m, i, arr) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => {
                        setModoItem((p) => ({ ...p, [idx]: m.key }))
                        m.extra?.()
                      }}
                      className={`text-xs px-2.5 py-0.5 border transition-colors
                        ${i === 0 ? "rounded-l-md border-r-0" : i === arr.length - 1 ? "rounded-r-md" : "border-r-0"}
                        ${getModoItem(idx) === m.key
                          ? "bg-verde-600 text-white border-verde-600"
                          : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                        }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="btn-danger py-1 px-2 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* NCM — full width */}
              <div className="col-span-2 md:col-span-4">
                <Field label="NCM">
                  <Controller
                    name={`itens.${idx}.ncm`}
                    control={control}
                    rules={{ required: "Obrigatório" }}
                    render={({ field }) => (
                      <Combobox
                        value={field.value}
                        onBlur={field.onBlur}
                        onChange={(v) => { field.onChange(v); onNCMChange(idx, v) }}
                        options={ncms.map((p) => ({ value: p.ncm, label: `${p.ncm} — ${p.descricao}` }))}
                        placeholder="Digite o produto ou NCM..."
                      />
                    )}
                  />
                </Field>
              </div>

              {/* Descrição + Código */}
              <div className="col-span-2">
                <Field label="Descrição do Produto">
                  <input
                    {...register(`itens.${idx}.descricao`, { required: "Obrigatório" })}
                    className="input-field"
                  />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Código do Produto">
                  <input
                    {...register(`itens.${idx}.codigo_produto`, { required: "Obrigatório" })}
                    className="input-field"
                  />
                </Field>
              </div>

              {/* CFOP + Unidade */}
              <div className="col-span-1 md:col-span-3">
                <Field label="CFOP">
                  <Controller
                    name={`itens.${idx}.cfop`}
                    control={control}
                    rules={{ required: "Obrigatório" }}
                    render={({ field }) => (
                      <Combobox
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        options={cfops.map((c) => ({ value: c.codigo, label: `${c.codigo} — ${c.descricao}` }))}
                        placeholder="CFOP..."
                      />
                    )}
                  />
                </Field>
              </div>
              <div className="col-span-1">
                <Field label="Unidade">
                  <Controller
                    name={`itens.${idx}.unidade`}
                    control={control}
                    render={({ field }) => (
                      <Combobox
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        options={UNIDADES.map((u) => ({ value: u, label: u }))}
                        placeholder="Un..."
                      />
                    )}
                  />
                </Field>
              </div>

              {/* Calculadora de Sacas */}
              {getModoItem(idx) === "sacas" && (
                <div className="col-span-2 md:col-span-4 bg-amber-50/70 border border-amber-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-700 mb-2.5 flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5" />
                    Calculadora de Sacas — os campos abaixo são preenchidos automaticamente
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Field label="Nº de Sacas">
                        <input
                          type="number" step="0.5" min="0"
                          value={getSacasData(idx).sacas}
                          onChange={(e) => onSacaChange(idx, "sacas", e.target.value)}
                          className="input-field"
                          placeholder="ex: 100"
                        />
                      </Field>
                    </div>
                    <div>
                      <Field label="Peso por Saca (kg)">
                        <input
                          type="number" step="0.5" min="0"
                          value={getSacasData(idx).kgPorSaca}
                          onChange={(e) => onSacaChange(idx, "kgPorSaca", e.target.value)}
                          className="input-field"
                          placeholder="60"
                        />
                        <p className="text-xs text-gray-400 mt-0.5">Soja/milho: 60 · Arroz: 50 · Feijão: 40</p>
                      </Field>
                    </div>
                    <div>
                      <Field label="Preço por Saca (R$)">
                        <CurrencyInput
                          value={getSacasData(idx).precoPorSaca}
                          className="input-field"
                          onChange={(v) => onSacaChange(idx, "precoPorSaca", v)}
                        />
                      </Field>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 pt-2 border-t border-amber-100 text-xs text-amber-700">
                    <span>
                      Peso total:{" "}
                      <strong>
                        {((parseFloat(getSacasData(idx).sacas) || 0) * (parseFloat(getSacasData(idx).kgPorSaca) || 60))
                          .toLocaleString("pt-BR", { maximumFractionDigits: 3 })} kg
                      </strong>
                    </span>
                    <span className="text-amber-300">·</span>
                    <span>
                      Valor/kg:{" "}
                      <strong>
                        {(parseFloat(getSacasData(idx).kgPorSaca) || 60) > 0
                          ? ((parseFloat(getSacasData(idx).precoPorSaca) || 0) / (parseFloat(getSacasData(idx).kgPorSaca) || 60))
                              .toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })
                          : "0,0000"}
                      </strong>
                    </span>
                    <span className="text-amber-300">·</span>
                    <span>
                      Total:{" "}
                      <strong>
                        {formatBRL((parseFloat(getSacasData(idx).sacas) || 0) * (parseFloat(getSacasData(idx).precoPorSaca) || 0))}
                      </strong>
                    </span>
                  </div>
                </div>
              )}

              {/* Quantidade / Peso */}
              <div className="col-span-1 md:col-span-2">
                <Field label={
                  getModoItem(idx) === "sacas" ? "Peso Total (kg) — calculado"
                  : getModoItem(idx) === "peso"  ? "Peso (kg)"
                  : "Quantidade"
                }>
                  <input
                    type="number" step="0.001" min="0"
                    {...register(`itens.${idx}.quantidade`, { required: "Obrigatório" })}
                    className={`input-field ${getModoItem(idx) === "sacas" ? "bg-gray-100 cursor-not-allowed" : ""}`}
                    readOnly={getModoItem(idx) === "sacas"}
                    onBlur={() => getModoItem(idx) !== "sacas" && setTimeout(() => calcularItem(idx), 100)}
                  />
                </Field>
              </div>

              {/* Valor Unitário */}
              <div className="col-span-1 md:col-span-2">
                <Field label={
                  getModoItem(idx) === "sacas" ? "Valor/kg — calculado"
                  : getModoItem(idx) === "peso"  ? "R$/kg"
                  : "Valor Unitário"
                }>
                  <Controller
                    name={`itens.${idx}.valor_unitario`}
                    control={control}
                    rules={{ required: "Obrigatório" }}
                    render={({ field }) => (
                      <CurrencyInput
                        value={field.value}
                        decimalScale={getModoItem(idx) === "peso" ? 4 : 2}
                        readOnly={getModoItem(idx) === "sacas"}
                        className={`input-field ${getModoItem(idx) === "sacas" ? "bg-gray-100 cursor-not-allowed" : ""}`}
                        onBlur={field.onBlur}
                        onChange={(v) => {
                          if (getModoItem(idx) === "sacas") return
                          field.onChange(v)
                          calcularItem(idx)
                        }}
                      />
                    )}
                  />
                </Field>
              </div>

              {/* Strip informativo — modo Peso × Unit. */}
              {getModoItem(idx) === "peso" && (
                <div className="col-span-2 md:col-span-4 flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 bg-verde-50 border border-verde-100 rounded-lg text-xs text-verde-700">
                  <span>
                    Total:{" "}
                    <strong>
                      {formatBRL((parseFloat(itens?.[idx]?.quantidade) || 0) * (parseFloat(itens?.[idx]?.valor_unitario) || 0))}
                    </strong>
                  </span>
                  <span className="text-verde-300">·</span>
                  <span>
                    ≈{" "}
                    <strong>
                      {((parseFloat(itens?.[idx]?.quantidade) || 0) / 60).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                    </strong>{" "}
                    sacas de 60 kg
                  </span>
                  {(parseFloat(itens?.[idx]?.quantidade) || 0) > 0 && (parseFloat(itens?.[idx]?.valor_unitario) || 0) > 0 && (
                    <>
                      <span className="text-verde-300">·</span>
                      <span>
                        Preço/saca 60 kg:{" "}
                        <strong>{formatBRL((parseFloat(itens?.[idx]?.valor_unitario) || 0) * 60)}</strong>
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Calculados: Vl.Total, FUNRURAL, SENAR, CST */}
              <Field label="Valor Total">
                <Controller name={`itens.${idx}.valor_total`} control={control}
                  render={({ field }) => (
                    <input type="text" readOnly value={formatBRL(field.value)}
                      className="input-field bg-gray-100 cursor-not-allowed" />
                  )} />
              </Field>
              <Field label="FUNRURAL 2,5%">
                <Controller name={`itens.${idx}.valor_funrural`} control={control}
                  render={({ field }) => (
                    <input type="text" readOnly value={formatBRL(field.value)}
                      className="input-field bg-amber-50 cursor-not-allowed text-amber-700" />
                  )} />
              </Field>
              <Field label="SENAR 0,2%">
                <Controller name={`itens.${idx}.valor_senar`} control={control}
                  render={({ field }) => (
                    <input type="text" readOnly value={formatBRL(field.value)}
                      className="input-field bg-amber-50 cursor-not-allowed text-amber-700" />
                  )} />
              </Field>
              <Field label="CST ICMS">
                <Controller name={`itens.${idx}.cst_icms`} control={control} defaultValue="51"
                  render={({ field }) => (
                    <Combobox value={field.value || "51"} onBlur={field.onBlur}
                      onChange={(v) => { field.onChange(v); onCstIcmsChange(idx, v) }}
                      options={CST_ICMS} placeholder="CST..." />
                  )} />
              </Field>

              {/* ICMS diferido — condicional */}
              {itens?.[idx]?.cst_icms === "51" && (
                <div className="col-span-1 md:col-span-2">
                  <Field label="Alíq. ICMS (%)">
                    <input
                      type="number" step="0.01" min="0" max="100"
                      {...register(`itens.${idx}.aliq_icms`, {
                        onChange: () => setTimeout(() => calcularItem(idx), 50),
                      })}
                      className="input-field"
                    />
                    {aliqSugerida !== null && (
                      <p className="mt-0.5 text-xs text-blue-600">
                        Sugerida: {aliqSugerida}% ({labelOperacao}) — aplicada automaticamente
                      </p>
                    )}
                  </Field>
                </div>
              )}
              <div className="col-span-1 md:col-span-2">
                <Field label="ICMS Diferido">
                  <Controller name={`itens.${idx}.valor_icms`} control={control}
                    render={({ field }) => (
                      <input type="text" readOnly value={formatBRL(field.value)}
                        className={`input-field cursor-not-allowed ${
                          itens?.[idx]?.cst_icms === "51" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-400"
                        }`} />
                    )} />
                </Field>
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => append({ ...DEFAULT_ITEM, numero_item: fields.length + 1, codigo_produto: `PROD${String(fields.length + 1).padStart(3, "0")}`, aliq_icms: aliqSugerida ?? 0 })}
          className="btn-secondary w-full justify-center border-dashed"
        >
          <Plus className="w-4 h-4" />
          Adicionar Item
        </button>
      </div>
    </Section>
  )
}
