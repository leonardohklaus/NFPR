// ─────────────────────────────────────────────────────────────────────────────
// Gerador de DANFE (Documento Auxiliar da NF-e) — A4 retrato, HTML → nova aba
// Leiaute baseado no DANFE NF-e 4.0 oficial
// ─────────────────────────────────────────────────────────────────────────────

const fmt2 = (v) =>
  (parseFloat(v) || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmt3 = (v) =>
  (parseFloat(v) || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

const fmt4 = (v) =>
  (parseFloat(v) || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });

const fmtDate = (d) => (d ? d.split('-').reverse().join('/') : '');

const fmtDoc = (raw) => {
  const v = String(raw || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 14);
  if (v.length <= 11)
    return v.replace(/^(\w{3})(\w{3})(\w{3})(\w{2})$/, '$1.$2.$3-$4');
  return v.replace(/^(\w{2})(\w{3})(\w{3})(\w{4})(\w{2})$/, '$1.$2.$3/$4-$5');
};

const fmtChave = (c) =>
  c ? c.replace(/(\d{4})(?=\d)/g, '$1 ').trim() : '';

const FRETES = {
  '0': 'Emitente',
  '1': 'Destinatário',
  '2': 'Terceiros',
  '9': 'Sem Frete',
};

// ─── Gerador principal ───────────────────────────────────────────────────────

function gerarHtml({ dados, resultado }) {
  const isRascunho    = !resultado?.sucesso;
  const isHomologacao = parseInt(dados.ambiente) === 2;

  const p    = dados.produtor     || {};
  const pe   = p.endereco         || {};
  const d    = dados.destinatario || {};
  const de   = d.endereco         || {};
  const t    = dados.transporte   || {};
  const itens = dados.itens       || [];

  const totalProdutos = itens.reduce((s, i) => s + (parseFloat(i.valor_total)    || 0), 0);
  const totalIcms     = itens.reduce((s, i) => s + (parseFloat(i.valor_icms)     || 0), 0);
  const totalFunrural = itens.reduce((s, i) => s + (parseFloat(i.valor_funrural) || 0), 0);
  const totalSenar    = itens.reduce((s, i) => s + (parseFloat(i.valor_senar)    || 0), 0);
  const totalLiquido  = totalProdutos - totalFunrural - totalSenar;

  const totalPesoKg = itens.reduce((s, i) => {
    const u = (i.unidade || '').toUpperCase();
    const q = parseFloat(i.quantidade) || 0;
    if (u === 'KG')  return s + q;
    if (u === 'TON') return s + q * 1000;
    return s;
  }, 0);

  const pesoBruto   = parseFloat(t.peso_bruto)  || totalPesoKg || null;
  const pesoLiquido = parseFloat(t.peso_liquido) || totalPesoKg || null;

  const chave           = resultado?.chave_acesso     || '';
  const protocolo       = resultado?.numero_protocolo || '';
  const dataAutorizacao = resultado?.data_autorizacao || '';
  const numero          = dados.numero || '—';
  const serie           = dados.serie  || p.serie || '001';

  const freteSigla   = FRETES[String(t.modalidade_frete ?? 9)] ?? 'Sem Frete';
  const enderecoEmit = `${pe.logradouro || ''}${pe.numero ? ', ' + pe.numero : ''}${pe.complemento ? ' — ' + pe.complemento : ''}`;
  const enderecoDest = `${de.logradouro || ''}${de.numero ? ', ' + de.numero : ''}${de.complemento ? ' — ' + de.complemento : ''}`;

  // ── Watermark ──────────────────────────────────────────────────────────────
  const watermarkHtml = isRascunho
    ? `<div class="wm">SEM VALOR FISCAL</div>`
    : '';

  // ── Banner de homologação ──────────────────────────────────────────────────
  const homolBanner = isHomologacao
    ? `<div style="text-align:center;background:#000;color:#fff;font-size:7.5pt;
                   font-weight:bold;padding:3px;letter-spacing:3px;margin-bottom:2px;">
        AMBIENTE DE HOMOLOGAÇÃO — SEM VALOR FISCAL
      </div>`
    : '';

  // ── Simulação de código de barras ─────────────────────────────────────────
  const barcodeHtml = `<div style="
    height:36px;
    background:repeating-linear-gradient(90deg,
      #000 0px,#000 1px, #fff 1px,#fff 2px,
      #000 2px,#000 4px, #fff 4px,#fff 5px,
      #000 5px,#000 6px, #fff 6px,#fff 8px,
      #000 8px,#000 10px,#fff 10px,#fff 11px,
      #000 11px,#000 12px,#fff 12px,#fff 14px,
      #000 14px,#000 16px,#fff 16px,#fff 18px,
      #000 18px,#000 19px,#fff 19px,#fff 21px,
      #000 21px,#000 23px,#fff 23px,#fff 25px
    );
    margin:2px 0;width:100%;"></div>`;

  // ── Protocolo ──────────────────────────────────────────────────────────────
  const protocoloTexto = protocolo
    ? `${protocolo} - ${dataAutorizacao}`
    : `(nota ainda não transmitida à SEFAZ)`;

  // ── Linhas dos itens ───────────────────────────────────────────────────────
  const itensRows = itens.map((item) => {
    const cst    = item.cst_icms || '';
    const u      = (item.unidade || '').toUpperCase();
    const isPeso = u === 'KG' || u === 'TON';
    const unitFmt = isPeso ? fmt4(item.valor_unitario) : fmt2(item.valor_unitario);
    const qtdFmt  = fmt3(item.quantidade);
    const vlIcms  = cst === '51' ? fmt2(item.valor_icms) : '—';
    const pesoKg  = u === 'KG'  ? (parseFloat(item.quantidade) || 0)
                  : u === 'TON' ? (parseFloat(item.quantidade) || 0) * 1000
                  : null;
    const pesoFmt = pesoKg !== null
      ? `<strong>${fmt3(pesoKg)}</strong> <span style="font-size:4.5pt;">kg</span>`
      : '—';
    return `
    <tr>
      <td style="text-align:center">${item.codigo_produto || ''}</td>
      <td>${item.descricao || ''}</td>
      <td style="text-align:center">${item.ncm || ''}</td>
      <td style="text-align:center">${cst}</td>
      <td style="text-align:center">${item.cfop || ''}</td>
      <td style="text-align:center">${item.unidade || ''}</td>
      <td style="text-align:right">${qtdFmt}</td>
      <td style="text-align:right">${pesoFmt}</td>
      <td style="text-align:right">${unitFmt}</td>
      <td style="text-align:right;font-weight:600">${fmt2(item.valor_total)}</td>
      <td style="text-align:right">${vlIcms}</td>
      <td style="text-align:right">${fmt2(item.valor_funrural)}</td>
      <td style="text-align:right">${fmt2(item.valor_senar)}</td>
    </tr>`;
  }).join('');

  // ── CSS ────────────────────────────────────────────────────────────────────
  const css = `
    @page { size: A4 portrait; margin: 6mm; }
    @media print {
      .no-print { display:none !important; }
      body { padding:0; }
      .danfe-wrap { position:relative; }
    }
    * { box-sizing:border-box; margin:0; padding:0;
        -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    body { font-family:Arial,Helvetica,sans-serif; font-size:7pt; color:#000; background:#fff; padding:10px; }
    .lbl { font-size:5pt; color:#000; text-transform:uppercase; font-weight:bold; display:block; margin-bottom:1px; }
    .val { font-size:7.5pt; font-weight:500; display:block; }
    .shdr { background:#e8e8e8; font-weight:bold; font-size:6pt; text-transform:uppercase;
            padding:2px 4px; border:1px solid #000; border-bottom:none; letter-spacing:0.4px; }
    table.items { width:100%; border-collapse:collapse; table-layout:fixed; }
    table.items th, table.items td { border:1px solid #000; padding:1px 2px; font-size:5.8pt; overflow:hidden; }
    table.items th { background:#e8e8e8; text-align:center; font-weight:bold; }
    table.items td { vertical-align:middle; }
    .print-btn {
      position:fixed; top:14px; right:14px;
      padding:8px 18px; background:rgb(22 101 52 / var(--tw-border-opacity, 1)); color:#fff;
      border:none; border-radius:6px; cursor:pointer;
      font-size:12px; font-weight:bold; z-index:10000;
      box-shadow:0 2px 8px rgba(0,0,0,0.25);
    }
    .print-btn:hover { background:#333; }
    .wm {
      position:absolute; top:50%; left:50%;
      transform:translate(-50%,-50%) rotate(-45deg);
      font-size:72px; font-weight:900; letter-spacing:6px;
      color:rgba(0,0,0,0.08); white-space:nowrap;
      pointer-events:none; z-index:1;
      font-family:Arial,sans-serif;
    }
  `;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>DANFE — NF-e Nº ${numero}</title>
  <style>${css}</style>
</head>
<body>

<button class="print-btn no-print" onclick="setTimeout(function(){window.print()},150)">🖨️ Imprimir / Salvar PDF</button>

<div class="danfe-wrap" style="position:relative;">
${watermarkHtml}
${homolBanner}

<!-- ══ CANHOTO ════════════════════════════════════════════════════════════════ -->
<div style="border:1px solid #000;margin-bottom:3px;">
  <div style="display:grid;grid-template-columns:1fr 110px;gap:0;">
    <div style="padding:3px 5px;font-size:6.5pt;line-height:1.55;border-right:1px solid #000;">
      RECEBEMOS DE <strong>${p.nome || ''}</strong> OS PRODUTOS E/OU SERVIÇOS CONSTANTES DA NOTA FISCAL
      ELETRÔNICA INDICADA ABAIXO.
      &nbsp; EMISSÃO: <strong>${fmtDate(dados.data_emissao)}</strong>
      &nbsp; VALOR TOTAL: <strong>R$ ${fmt2(totalProdutos)}</strong>
      &nbsp; DESTINATÁRIO: <strong>${d.nome || ''}</strong>${de.logradouro ? ` — ${enderecoDest}${de.bairro ? ' ' + de.bairro : ''}${de.municipio ? ' ' + de.municipio + '-' + de.uf : ''}` : ''}
    </div>
    <div style="padding:3px 6px;text-align:center;display:flex;flex-direction:column;justify-content:center;">
      <div style="font-size:8pt;font-weight:900;letter-spacing:1px;">NF-e</div>
      <div style="font-size:7.5pt;font-weight:700;margin-top:2px;">Nº. ${numero}</div>
      <div style="font-size:6pt;">Série ${serie}</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 2fr;border-top:1px dashed #000;">
    <div style="padding:2px 5px;border-right:1px solid #000;font-size:5.5pt;text-transform:uppercase;font-weight:bold;">
      Data de Recebimento
    </div>
    <div style="padding:2px 5px;font-size:5.5pt;text-transform:uppercase;font-weight:bold;">
      Identificação e Assinatura do Recebedor
    </div>
  </div>
</div>

<!-- ══ CABEÇALHO ════════════════════════════════════════════════════════════ -->
<div style="display:grid;grid-template-columns:1fr 112px 1fr;margin-bottom:1px;">

  <!-- Emitente -->
  <div style="border:1px solid #000;border-right:none;padding:4px 5px;">
    <div style="font-size:5pt;text-transform:uppercase;font-weight:bold;margin-bottom:2px;">Identificação do Emitente</div>
    <div style="font-size:9pt;font-weight:900;margin-bottom:3px;line-height:1.2;">${p.nome || ''}</div>
    <div style="font-size:6.5pt;line-height:1.55;">
      <div>${enderecoEmit}</div>
      <div>${pe.bairro || ''}${pe.bairro && pe.municipio ? ' — ' : ''}${pe.municipio || ''}${pe.municipio && pe.uf ? ' — ' : ''}${pe.uf || ''}</div>
      <div>CEP: ${pe.cep || ''}&nbsp;&nbsp;Fone: ${pe.telefone || ''}</div>
      <div style="margin-top:3px;"><strong>${(p.documento || '').replace(/\D/g,'').length === 11 ? 'CPF' : 'CNPJ'}:</strong> <span style="font-family:monospace">${fmtDoc(p.documento)}</span> &nbsp;&nbsp;<strong>IE:</strong> ${p.ie || ''}</div>
    </div>
  </div>

  <!-- DANFE center -->
  <div style="border:1px solid #000;padding:4px;text-align:center;
              display:flex;flex-direction:column;align-items:center;justify-content:space-between;">
    <div>
      <div style="font-size:5.5pt;">DOCUMENTO AUXILIAR DA</div>
      <div style="font-size:5.5pt;">NOTA FISCAL ELETRÔNICA</div>
      <div style="font-size:13pt;font-weight:900;letter-spacing:3px;margin:3px 0;">DANFE</div>
    </div>
    <div style="font-size:6pt;line-height:1.7;">
      <div>0 - ENTRADA</div>
      <div>1 - SAÍDA &nbsp;<span style="border:1px solid #000;padding:0 3px;font-weight:bold;">1</span></div>
    </div>
    <div style="margin-top:5px;">
      <div style="font-size:8.5pt;font-weight:900;">Nº. ${numero}</div>
      <div style="font-size:6.5pt;">Série ${serie}</div>
      <div style="font-size:5.5pt;">Folha 1/1</div>
    </div>
  </div>

  <!-- Chave de acesso -->
  <div style="border:1px solid #000;border-left:none;padding:4px 5px;display:flex;flex-direction:column;gap:2px;">
    <div style="font-size:5pt;text-transform:uppercase;font-weight:bold;">Chave de Acesso</div>
    ${barcodeHtml}
    <div style="font-family:'Courier New',monospace;font-size:${chave ? '7pt' : '6.5pt'};text-align:center;
                letter-spacing:0.5px;font-weight:600;word-break:break-all;">
      ${chave ? fmtChave(chave) : '(gerada após transmissão à SEFAZ)'}
    </div>
    <div style="font-size:5.5pt;text-align:center;line-height:1.4;">
      Consulta de autenticidade no portal nacional da NF-e<br>
      www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora
    </div>
  </div>
</div>

<!-- ── NATUREZA + PROTOCOLO ──────────────────────────────────── -->
<div style="display:grid;grid-template-columns:3fr 2fr;margin-bottom:1px;">
  <div style="border:1px solid #000;border-right:none;padding:2px 3px;">
    <span class="lbl">Natureza da Operação</span>
    <span class="val">${dados.natureza_operacao || ''}</span>
  </div>
  <div style="border:1px solid #000;padding:2px 3px;">
    <span class="lbl">Protocolo de Autorização de Uso</span>
    <span class="val" style="font-size:${protocolo ? '7pt' : '6pt'}">${protocoloTexto}</span>
  </div>
</div>

<!-- ── IE + SÉRIE + CPF ───────────────────────────────────────── -->
<div style="display:grid;grid-template-columns:1fr 80px 1fr;margin-bottom:1px;">
  <div style="border:1px solid #000;border-right:none;padding:2px 3px;">
    <span class="lbl">Inscrição Estadual do Emitente</span>
    <span class="val">${p.ie || ''}</span>
  </div>
  <div style="border:1px solid #000;border-right:none;padding:2px 3px;">
    <span class="lbl">Série</span>
    <span class="val">${serie}</span>
  </div>
  <div style="border:1px solid #000;padding:2px 3px;">
    <span class="lbl">${(p.documento || '').replace(/\D/g,'').length === 11 ? 'CPF' : 'CNPJ'} do Emitente</span>
    <span class="val" style="font-family:monospace">${fmtDoc(p.documento)}</span>
  </div>
</div>

<!-- ══ DESTINATÁRIO ══════════════════════════════════════════════════════════ -->
<div class="shdr">Destinatário / Remetente</div>
<div style="border:1px solid #000;margin-bottom:1px;">
  <div style="display:grid;grid-template-columns:1fr 160px 100px;border-bottom:1px solid #000;">
    <div style="padding:2px 3px;border-right:1px solid #000;">
      <span class="lbl">Nome / Razão Social</span>
      <span class="val">${d.nome || ''}</span>
    </div>
    <div style="padding:2px 3px;border-right:1px solid #000;">
      <span class="lbl">CNPJ / CPF</span>
      <span class="val" style="font-family:monospace">${fmtDoc(d.cpf_cnpj)}</span>
    </div>
    <div style="padding:2px 3px;">
      <span class="lbl">Data de Emissão</span>
      <span class="val">${fmtDate(dados.data_emissao)}</span>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:2fr 110px 85px 100px;border-bottom:1px solid #000;">
    <div style="padding:2px 3px;border-right:1px solid #000;">
      <span class="lbl">Endereço</span>
      <span class="val">${enderecoDest}</span>
    </div>
    <div style="padding:2px 3px;border-right:1px solid #000;">
      <span class="lbl">Bairro / Distrito</span>
      <span class="val">${de.bairro || ''}</span>
    </div>
    <div style="padding:2px 3px;border-right:1px solid #000;">
      <span class="lbl">CEP</span>
      <span class="val" style="font-family:monospace">${de.cep || ''}</span>
    </div>
    <div style="padding:2px 3px;">
      <span class="lbl">Data Saída / Entrada</span>
      <span class="val">${fmtDate(dados.data_saida)}</span>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:2fr 38px 90px 1fr 90px;">
    <div style="padding:2px 3px;border-right:1px solid #000;">
      <span class="lbl">Município</span>
      <span class="val">${de.municipio || ''}</span>
    </div>
    <div style="padding:2px 3px;border-right:1px solid #000;">
      <span class="lbl">UF</span>
      <span class="val">${de.uf || ''}</span>
    </div>
    <div style="padding:2px 3px;border-right:1px solid #000;">
      <span class="lbl">Fone / Fax</span>
      <span class="val">${de.telefone || d.telefone || ''}</span>
    </div>
    <div style="padding:2px 3px;border-right:1px solid #000;">
      <span class="lbl">Inscrição Estadual do Destinatário</span>
      <span class="val">${d.ie || 'ISENTO'}</span>
    </div>
    <div style="padding:2px 3px;">
      <span class="lbl">Hora Saída / Entrada</span>
      <span class="val">${dados.hora_saida || ''}</span>
    </div>
  </div>
</div>

<!-- ══ CÁLCULO DO IMPOSTO ════════════════════════════════════════════════════ -->
<div class="shdr">Cálculo do Imposto</div>
<div style="border:1px solid #000;margin-bottom:1px;">
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;border-bottom:1px solid #000;">
    <div style="padding:2px 3px;border-right:1px solid #000;">
      <span class="lbl">Base de Cálc. do ICMS (R$)</span>
      <span class="val">${totalIcms > 0 ? fmt2(totalProdutos) : '0,00'}</span>
    </div>
    <div style="padding:2px 3px;border-right:1px solid #000;">
      <span class="lbl">Valor do ICMS (R$)</span>
      <span class="val">${fmt2(totalIcms)}</span>
    </div>
    <div style="padding:2px 3px;border-right:1px solid #000;">
      <span class="lbl">Base de Cálc. ICMS S.T. (R$)</span>
      <span class="val">0,00</span>
    </div>
    <div style="padding:2px 3px;border-right:1px solid #000;">
      <span class="lbl">Valor do ICMS Subst. (R$)</span>
      <span class="val">0,00</span>
    </div>
    <div style="padding:2px 3px;">
      <span class="lbl">Vl. Total dos Produtos (R$)</span>
      <span class="val" style="font-weight:bold;">${fmt2(totalProdutos)}</span>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;border-bottom:1px solid #000;">
    <div style="padding:2px 3px;border-right:1px solid #000;">
      <span class="lbl">Valor do Frete (R$)</span>
      <span class="val">0,00</span>
    </div>
    <div style="padding:2px 3px;border-right:1px solid #000;">
      <span class="lbl">Valor do Seguro (R$)</span>
      <span class="val">0,00</span>
    </div>
    <div style="padding:2px 3px;border-right:1px solid #000;">
      <span class="lbl">Desconto (R$)</span>
      <span class="val">0,00</span>
    </div>
    <div style="padding:2px 3px;border-right:1px solid #000;">
      <span class="lbl">Outras Despesas (R$)</span>
      <span class="val">0,00</span>
    </div>
    <div style="padding:2px 3px;">
      <span class="lbl">V. Total da Nota (R$)</span>
      <span class="val" style="font-size:9pt;font-weight:900;">${fmt2(totalProdutos)}</span>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr 2fr;">
    <div style="padding:2px 3px;border-right:1px solid #000;">
      <span class="lbl">FUNRURAL 2,5% (R$)</span>
      <span class="val" style="font-weight:bold;">${fmt2(totalFunrural)}</span>
    </div>
    <div style="padding:2px 3px;border-right:1px solid #000;">
      <span class="lbl">SENAR 0,2% (R$)</span>
      <span class="val" style="font-weight:bold;">${fmt2(totalSenar)}</span>
    </div>
    <div style="padding:2px 3px;border-right:1px solid #000;">
      <span class="lbl">Total Retenções (R$)</span>
      <span class="val" style="font-weight:bold;">${fmt2(totalFunrural + totalSenar)}</span>
    </div>
    <div style="padding:2px 3px;">
      <span class="lbl">Líquido ao Produtor (R$)</span>
      <span class="val" style="font-size:9pt;font-weight:900;">${fmt2(totalLiquido)}</span>
    </div>
  </div>
</div>

<!-- ══ TRANSPORTADOR ════════════════════════════════════════════════════════ -->
<div class="shdr">Transportador / Volumes Transportados</div>
<div style="border:1px solid #000;margin-bottom:1px;">
  <div style="display:grid;grid-template-columns:1fr 140px 100px;border-bottom:1px solid #000;">
    <div style="padding:2px 3px;border-right:1px solid #000;">
      <span class="lbl">Nome / Razão Social do Transportador</span>
      <span class="val">${t.transportador_nome || 'Sem transportador informado'}</span>
    </div>
    <div style="padding:2px 3px;border-right:1px solid #000;">
      <span class="lbl">Frete por Conta</span>
      <span class="val">(${String(t.modalidade_frete ?? 9)}) ${freteSigla}</span>
    </div>
    <div style="padding:2px 3px;">
      <span class="lbl">Placa do Veículo</span>
      <span class="val" style="font-family:monospace">${t.placa_veiculo || '—'}</span>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr 1fr;">
    <div style="padding:2px 3px;border-right:1px solid #000;">
      <span class="lbl">Quantidade</span>
      <span class="val">${itens.length}</span>
    </div>
    <div style="padding:2px 3px;border-right:1px solid #000;">
      <span class="lbl">Espécie</span>
      <span class="val">VOLUMES</span>
    </div>
    <div style="padding:2px 3px;border-right:1px solid #000;">
      <span class="lbl">Marca</span>
      <span class="val">—</span>
    </div>
    <div style="padding:2px 3px;border-right:1px solid #000;">
      <span class="lbl">Numeração</span>
      <span class="val">—</span>
    </div>
    <div style="padding:2px 3px;border-right:1px solid #000;">
      <span class="lbl">Peso Bruto (kg)</span>
      <span class="val" style="font-weight:bold;">${pesoBruto ? fmt3(pesoBruto) : '—'}</span>
    </div>
    <div style="padding:2px 3px;">
      <span class="lbl">Peso Líquido (kg)</span>
      <span class="val" style="font-weight:bold;">${pesoLiquido ? fmt3(pesoLiquido) : '—'}</span>
    </div>
  </div>
</div>

<!-- ══ DADOS DOS PRODUTOS ════════════════════════════════════════════════════ -->
<div class="shdr">Dados dos Produtos / Serviços</div>
<table class="items" style="margin-bottom:1px;">
  <colgroup>
    <col style="width:42px">
    <col>
    <col style="width:50px">
    <col style="width:22px">
    <col style="width:26px">
    <col style="width:20px">
    <col style="width:46px">
    <col style="width:52px">
    <col style="width:52px">
    <col style="width:54px">
    <col style="width:42px">
    <col style="width:44px">
    <col style="width:36px">
  </colgroup>
  <thead>
    <tr>
      <th>Cód.</th>
      <th style="text-align:left">Descrição do Produto / Serviço</th>
      <th>NCM/SH</th>
      <th>CST</th>
      <th>CFOP</th>
      <th>Und</th>
      <th>Quantidade</th>
      <th>Peso (kg)</th>
      <th>Vl. Unit.</th>
      <th>Vl. Total</th>
      <th>Vl. ICMS</th>
      <th>FUNRURAL</th>
      <th>SENAR</th>
    </tr>
  </thead>
  <tbody>
    ${itensRows}
  </tbody>
  <tfoot>
    <tr style="background:#e8e8e8;font-weight:bold;">
      <td colspan="7" style="text-align:right;padding-right:4px;font-size:5.5pt;">TOTAL</td>
      <td style="text-align:right;font-weight:bold;">
        ${totalPesoKg > 0 ? fmt3(totalPesoKg) + ' kg' : '—'}
      </td>
      <td style="text-align:right">—</td>
      <td style="text-align:right">${fmt2(totalProdutos)}</td>
      <td style="text-align:right">${totalIcms > 0 ? fmt2(totalIcms) : '—'}</td>
      <td style="text-align:right">${fmt2(totalFunrural)}</td>
      <td style="text-align:right">${fmt2(totalSenar)}</td>
    </tr>
  </tfoot>
</table>

<!-- ══ DADOS ADICIONAIS ══════════════════════════════════════════════════════ -->
<div style="display:grid;grid-template-columns:2fr 1fr;gap:0;">
  <div class="shdr" style="border-right:none;">Dados Adicionais</div>
  <div class="shdr">Reservado ao Fisco</div>
</div>
<div style="display:grid;grid-template-columns:2fr 1fr;border:1px solid #000;">
  <div style="padding:4px 5px;border-right:1px solid #000;">
    <span class="lbl" style="margin-bottom:2px;">Informações Complementares</span>
    <div style="font-size:6.5pt;line-height:1.5;">
      ${dados.informacoes_adicionais || ''}
      <div style="margin-top:4px;padding-top:4px;border-top:1px dashed #000;">
        <strong>Retenções do Produtor Rural:</strong><br>
        FUNRURAL 2,5%: R$ ${fmt2(totalFunrural)} &nbsp;|&nbsp;
        SENAR 0,2%: R$ ${fmt2(totalSenar)} &nbsp;|&nbsp;
        Total Retido: R$ ${fmt2(totalFunrural + totalSenar)}<br>
        <strong>Líquido ao Produtor: R$ ${fmt2(totalLiquido)}</strong>
      </div>
      ${totalPesoKg > 0 ? `<div style="margin-top:4px;padding-top:4px;border-top:1px dashed #000;">
        <strong>Peso Total dos Itens:</strong> ${fmt3(totalPesoKg)} kg${totalPesoKg >= 1000 ? ` &nbsp;(${fmt3(totalPesoKg / 1000)} t)` : ''}
      </div>` : ''}
      ${isRascunho ? `<div style="margin-top:5px;font-weight:bold;font-size:6.5pt;">
        ⚠ DOCUMENTO SEM VALOR FISCAL — NOTA NÃO TRANSMITIDA À SEFAZ
      </div>` : ''}
    </div>
  </div>
  <div style="padding:4px 5px;">
    <span class="lbl" style="margin-bottom:2px;">Reservado ao Fisco</span>
    ${protocolo
      ? `<div style="font-size:6.5pt;line-height:1.7;">
          <strong>Protocolo:</strong> ${protocolo}<br>
          <strong>Autorização:</strong> ${dataAutorizacao}
        </div>`
      : '<div style="font-size:6pt;font-style:italic;margin-top:2px;">Sem protocolo — nota não transmitida à SEFAZ</div>'}
  </div>
</div>

</div><!-- /danfe-wrap -->
</body>
</html>`;
}

// ─── Função pública ───────────────────────────────────────────────────────────

/**
 * Gera e abre o DANFE em nova aba do navegador.
 * @param {object} dados      - Dados do formulário (getValues() do react-hook-form)
 * @param {object|null} resultado - Resultado da transmissão SEFAZ (ou null = rascunho)
 */
export function abrirDanfe(dados, resultado = null) {
  const html = gerarHtml({ dados, resultado });
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, '_blank');
  if (!win) {
    URL.revokeObjectURL(url);
    alert('Permita pop-ups nesta página para visualizar o DANFE.');
    return;
  }
  win.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
}
