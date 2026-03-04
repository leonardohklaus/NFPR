import { useState, useEffect } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { useSearchParams } from "react-router-dom"
import toast from "react-hot-toast"
import { FileText, AlertTriangle } from "lucide-react"
import {
  emitirNota,
  gerarXML,
  assinarXML,
  detalheNota,
  listarMunicipios,
  listarCFOPs,
  listarNCMs,
  listarProdutores,
} from "../services/api"
import { decodeId } from "../utils/urlUtils"
import { useProdutorAtivo } from "../context/ProdutorContext"
import { useCep } from "../hooks/useCep"
import { useCnpj } from "../hooks/useCnpj"
import { DEFAULT_ITEM, NATUREZAS } from "./emitir/constants"
import ProdutorSelector   from "./emitir/ProdutorSelector"
import SecaoIdentificacao from "./emitir/SecaoIdentificacao"
import SecaoProdutor      from "./emitir/SecaoProdutor"
import SecaoDestinatario  from "./emitir/SecaoDestinatario"
import SecaoItens         from "./emitir/SecaoItens"
import SecaoTransporte    from "./emitir/SecaoTransporte"
import Resumo             from "./emitir/Resumo"
import Resultado          from "./emitir/Resultado"

export default function EmitirNota() {
  const [municipios, setMunicipios] = useState([])
  const [cfops,      setCfops]      = useState([])
  const [ncms,       setNcms]       = useState([])
  const [produtores, setProdutores] = useState([])
  const [resultado,  setResultado]  = useState(null)
  const [enviando,   setEnviando]   = useState(false)
  const [gerando,    setGerando]    = useState(false)
  const [assinando,  setAssinando]  = useState(false)
  const [editandoNota, setEditandoNota] = useState(null) // { id, mensagem_rejeicao, produtor_id, numero, serie }
  const [numeroOverride, setNumeroOverride] = useState(null)
  const [serieOverride,  setSerieOverride]  = useState(null)

  const [searchParams] = useSearchParams()

  const { produtorAtivo, selecionarProdutor } = useProdutorAtivo()
  const produtorSelecionado = produtorAtivo

  const ambientePadrao = () => {
    try {
      return parseInt(JSON.parse(localStorage.getItem("nfpr_config") || "{}").ambiente_padrao || "2")
    } catch {
      return 2
    }
  }

  const methods = useForm({
    defaultValues: {
      ambiente: ambientePadrao(),
      natureza_operacao: NATUREZAS[0],
      data_emissao: new Date().toISOString().split("T")[0],
      data_saida:   new Date().toISOString().split("T")[0],
      hora_saida:   "12:00:00",
      produtor:     { endereco: { uf: "RS" } },
      destinatario: { endereco: { uf: "RS" } },
      transporte:   { modalidade_frete: 9 },
      forma_pagamento: "90",
      itens: [{ ...DEFAULT_ITEM }],
    },
  })

  const { register, handleSubmit, setValue } = methods

  // ── Data loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      listarMunicipios(),
      listarCFOPs(),
      listarNCMs(),
      listarProdutores({ apenas_ativos: true }),
    ]).then(([m, c, n, p]) => {
      setMunicipios(m.municipios || [])
      setCfops(c.cfops || [])
      setNcms(n.produtos || [])
      setProdutores(p || [])
    })
  }, [])

  // ── Load rejected nota for editing ───────────────────────────────────────
  useEffect(() => {
    const encoded = searchParams.get("editar")
    if (!encoded) return
    const editarId = decodeId(encoded)
    if (!editarId) return
    detalheNota(editarId).then((nota) => {
      if (nota.status !== "rejeitada") return
      setEditandoNota({ id: nota.id, mensagem_rejeicao: nota.mensagem_rejeicao, produtor_id: nota.produtor_id, numero: nota.numero, serie: nota.serie })
      setNumeroOverride(null)
      setSerieOverride(null)
      methods.reset({
        ambiente: nota.ambiente,
        natureza_operacao: nota.natureza_operacao,
        data_emissao: nota.data_emissao,
        data_saida: nota.data_saida,
        hora_saida: nota.hora_saida,
        produtor: {
          documento: nota.produtor.documento,
          ie: nota.produtor.ie,
          nome: nota.produtor.nome,
          regime_tributario: nota.produtor.regime_tributario || "simples",
          endereco: nota.produtor.endereco,
        },
        destinatario: {
          cpf_cnpj: nota.destinatario.cpf_cnpj,
          ie: nota.destinatario.ie || "",
          nome: nota.destinatario.nome,
          endereco: nota.destinatario.endereco,
        },
        transporte: nota.transporte,
        forma_pagamento: nota.forma_pagamento || "90",
        itens: nota.itens.map((item) => ({
          numero_item:    item.numero_item,
          codigo_produto: item.codigo_produto,
          descricao:      item.descricao,
          ncm:            item.ncm,
          cfop:           item.cfop,
          unidade:        item.unidade,
          quantidade:     item.quantidade,
          valor_unitario: item.valor_unitario,
          valor_total:    item.valor_total,
          cst_icms:       item.cst_icms || "41",
          aliq_icms:      item.aliq_icms || 0,
          valor_icms:     item.valor_icms || 0,
          aliq_funrural:  item.aliq_funrural || 2.5,
          valor_funrural: item.valor_funrural || 0,
          aliq_senar:     item.aliq_senar || 0.2,
          valor_senar:    item.valor_senar || 0,
        })),
        informacoes_adicionais: nota.informacoes_adicionais || "",
      })
    }).catch(() => toast.error("Erro ao carregar nota para edição"))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-fill form when active producer changes ───────────────────────────
  useEffect(() => {
    if (!produtorAtivo) return
    const p = produtorAtivo
    setValue("produtor.nome",                  p.nome)
    setValue("produtor.documento",              p.documento)
    setValue("produtor.ie",                    p.ie)
    setValue("produtor.regime_tributario",     p.regime_tributario || "simples")
    setValue("produtor.endereco.logradouro",   p.endereco.logradouro)
    setValue("produtor.endereco.numero",       p.endereco.numero)
    setValue("produtor.endereco.complemento",  p.endereco.complemento ?? "")
    setValue("produtor.endereco.bairro",       p.endereco.bairro)
    setValue("produtor.endereco.municipio",    p.endereco.municipio)
    setValue("produtor.endereco.cod_municipio",p.endereco.cod_municipio)
    setValue("produtor.endereco.cep",          p.endereco.cep)
    setValue("produtor.endereco.telefone",     p.endereco.telefone ?? "")
    setValue("produtor.endereco.uf",           p.endereco.uf || "RS")
  }, [produtorAtivo, setValue])

  // ── Produtor selector ─────────────────────────────────────────────────────
  const onChangeProdutorSelect = async (id) => {
    if (!id) { await selecionarProdutor(null); return }
    const p = produtores.find((p) => String(p.id) === String(id))
    if (p) await selecionarProdutor(p)
  }

  // ── CEP / CNPJ lookup ─────────────────────────────────────────────────────
  const { buscandoCep, buscarCep }   = useCep()
  const { buscandoCnpj, buscarCnpj } = useCnpj()

  const onMunicipioChange = (prefix, nome) => {
    const mun = municipios.find((m) => m.nome === nome)
    if (mun) setValue(`${prefix}.cod_municipio`, mun.codigo)
  }

  const preencherEnderecoViaCep = (prefix, dados) => {
    if (dados.logradouro)   setValue(`${prefix}.logradouro`,   dados.logradouro)
    if (dados.bairro)       setValue(`${prefix}.bairro`,       dados.bairro)
    if (dados.municipio) {
      setValue(`${prefix}.municipio`, dados.municipio)
      const mun = municipios.find((m) => m.nome.toLowerCase() === dados.municipio.toLowerCase())
      if (mun) setValue(`${prefix}.cod_municipio`, mun.codigo)
      else if (dados.cod_municipio) setValue(`${prefix}.cod_municipio`, dados.cod_municipio)
    }
  }

  const onCepBlurProdutor = async (e) => {
    if (produtorSelecionado) return
    const dados = await buscarCep(e.target.value)
    if (dados) preencherEnderecoViaCep("produtor.endereco", dados)
  }

  const onCepBlurDestinatario = async (e) => {
    const dados = await buscarCep(e.target.value)
    if (!dados) return
    preencherEnderecoViaCep("destinatario.endereco", dados)
    if (dados.uf) setValue("destinatario.endereco.uf", dados.uf)
  }

  const onCpfCnpjBlurDestinatario = async (e) => {
    const nums = e.target.value.replace(/\D/g, "")
    if (nums.length !== 14) return
    const dados = await buscarCnpj(nums)
    if (!dados) { toast.error("CNPJ não encontrado na Receita Federal"); return }
    setValue("destinatario.nome", dados.nome)
    if (dados.logradouro)  setValue("destinatario.endereco.logradouro",  dados.logradouro)
    if (dados.numero)      setValue("destinatario.endereco.numero",      dados.numero)
    if (dados.complemento) setValue("destinatario.endereco.complemento", dados.complemento)
    if (dados.bairro)      setValue("destinatario.endereco.bairro",      dados.bairro)
    if (dados.municipio)   setValue("destinatario.endereco.municipio",   dados.municipio)
    if (dados.uf)          setValue("destinatario.endereco.uf",          dados.uf)
    if (dados.cep)         setValue("destinatario.endereco.cep",         dados.cep)
    if (dados.municipio) {
      const mun = municipios.find((m) => m.nome.toLowerCase() === dados.municipio.toLowerCase())
      if (mun) {
        setValue("destinatario.endereco.cod_municipio", mun.codigo)
      } else if (dados.cep) {
        const cepDados = await buscarCep(dados.cep)
        if (cepDados?.cod_municipio) setValue("destinatario.endereco.cod_municipio", cepDados.cod_municipio)
      }
    }
    toast.success(`Dados de ${dados.nome} preenchidos`)
  }

  // ── Form submission ───────────────────────────────────────────────────────
  const prepararDados = (dados) => {
    // Determina tipo de emitente pelo documento (raw, sem máscara)
    const docRaw = (dados.produtor?.documento || "").replace(/\D/g, "")
    const isPJ   = docRaw.length === 14
    // PF: SENAR 0,2% | PJ: SENAR 0,25% (Lei 8.212/91)
    const aliqSenar = isPJ ? 0.25 : 0.2
    const serie = editandoNota
      ? (serieOverride ?? editandoNota.serie)
      : (produtorSelecionado?.serie || "1")
    return {
      ...dados,
      produtor_id: produtorSelecionado?.id ?? editandoNota?.produtor_id ?? null,
      editar_nota_id: editandoNota?.id ?? null,
      numero_override: (editandoNota && numeroOverride !== null) ? numeroOverride : undefined,
      serie,
      ambiente: parseInt(dados.ambiente),
      transporte: { modalidade_frete: parseInt(dados.transporte?.modalidade_frete || 9) },
      itens: dados.itens.map((item, i) => ({
        ...item,
        numero_item:    i + 1,
        quantidade:     parseFloat(item.quantidade)    || 0,
        valor_unitario: parseFloat(item.valor_unitario)|| 0,
        valor_total:    parseFloat(item.valor_total)   || 0,
        valor_funrural: parseFloat(item.valor_funrural)|| 0,
        valor_senar:    parseFloat(item.valor_senar)   || 0,
        aliq_funrural:  2.5,
        aliq_senar:     aliqSenar,
        cst_icms:       item.cst_icms || "41",
        aliq_icms:      parseFloat(item.aliq_icms)     || 0,
        valor_icms:     parseFloat(item.valor_icms)    || 0,
      })),
    }
  }

  const onSubmitEmitir = async (dados) => {
    setEnviando(true)
    setResultado(null)
    try {
      const res = await emitirNota(prepararDados(dados))
      setResultado(res)
      if (res.sucesso) toast.success("Nota fiscal emitida com sucesso!")
      else toast.error(res.mensagem || "Erro ao emitir nota")
    } catch {
      toast.error("Erro de comunicação com o servidor")
    } finally {
      setEnviando(false)
    }
  }

  const onGerarXML = async (dados) => {
    setGerando(true)
    try {
      const { blob, chave } = await gerarXML(prepararDados(dados))
      const url = URL.createObjectURL(blob)
      const a   = document.createElement("a")
      a.href = url
      a.download = `NFe_${chave || "nota"}.xml`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("XML gerado e baixado!")
    } catch {
      toast.error("Erro ao gerar XML")
    } finally {
      setGerando(false)
    }
  }

  const onAssinarXML = async (dados) => {
    setAssinando(true)
    try {
      const { blob, chave } = await assinarXML(prepararDados(dados))
      const url = URL.createObjectURL(blob)
      const a   = document.createElement("a")
      a.href = url
      a.download = `NFe_${chave || "nota"}_assinado.xml`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("XML assinado e baixado!")
    } catch {
      toast.error("Erro ao assinar XML")
    } finally {
      setAssinando(false)
    }
  }

  return (
    <FormProvider {...methods}>
      <div className="space-y-5 fade-in">
        {/* Page header + ambiente selector */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-verde-600" />
              Emitir Nota Fiscal
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">Nota Fiscal de Produtor Rural — RS</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">Ambiente:</span>
            <select
              {...register("ambiente")}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-verde-500 focus:outline-none"
            >
              <option value={2}>🧪 Homologação</option>
              <option value={1}>🏭 Produção</option>
            </select>
          </div>
        </div>

        {/* Editing rejected nota banner */}
        {editandoNota && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Editando nota rejeitada #{editandoNota.id} — corrija e reenvie
                </p>
                {editandoNota.mensagem_rejeicao && (
                  <p className="text-xs text-amber-700 mt-0.5">{editandoNota.mensagem_rejeicao}</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-4 pt-1 border-t border-amber-200">
              <p className="w-full text-xs text-amber-700">
                Altere o número ou série se necessário (ex: erro 104 — número já utilizado pela SEFAZ).
              </p>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-amber-800">Número da NF-e</label>
                <input
                  type="number"
                  min={1}
                  className="input-field w-36 font-mono"
                  value={numeroOverride ?? editandoNota.numero}
                  onChange={(e) => setNumeroOverride(parseInt(e.target.value) || editandoNota.numero)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-amber-800">Série</label>
                <input
                  type="text"
                  maxLength={3}
                  className="input-field w-20 font-mono"
                  value={serieOverride ?? editandoNota.serie}
                  onChange={(e) => setSerieOverride(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Producer selector card */}
        <ProdutorSelector
          produtores={produtores}
          produtorSelecionado={produtorSelecionado}
          onChangeProdutorSelect={onChangeProdutorSelect}
        />

        {/* Main form */}
        <form onSubmit={handleSubmit(onSubmitEmitir)} className="space-y-5">
          <SecaoIdentificacao />

          <SecaoProdutor
            produtorSelecionado={produtorSelecionado}
            municipios={municipios}
            buscandoCep={buscandoCep}
            onCepBlur={onCepBlurProdutor}
            onMunicipioChange={onMunicipioChange}
          />

          <SecaoDestinatario
            municipios={municipios}
            buscandoCep={buscandoCep}
            buscandoCnpj={buscandoCnpj}
            onCepBlur={onCepBlurDestinatario}
            onCpfCnpjBlur={onCpfCnpjBlurDestinatario}
            onMunicipioChange={onMunicipioChange}
          />

          <SecaoItens ncms={ncms} cfops={cfops} />

          <SecaoTransporte />

          <Resumo gerando={gerando} assinando={assinando} enviando={enviando} onGerarXML={onGerarXML} onAssinarXML={onAssinarXML} />
        </form>

        <Resultado resultado={resultado} />
      </div>
    </FormProvider>
  )
}
