let configuracoes = JSON.parse(localStorage.getItem("financeiroConfiguracoes")) || {};
if (!Array.isArray(configuracoes.tiposRendaExtra)) {
  configuracoes.tiposRendaExtra = [{ id: 1, nome: "Renda extra", valor: Number(configuracoes.comissaoPorAparelho) || 100 }];
}
if (!configuracoes.caixaEmergencial) {
  configuracoes.caixaEmergencial = { tipoMeta: "fixo", valorMeta: 0, saldoAtual: 0, aportePercentual: 10 };
}

let receitas = JSON.parse(localStorage.getItem("financeiroReceitasFixas")) || [];
let comissoes = JSON.parse(localStorage.getItem("financeiroComissoesDiarias")) || [];
let despesas = JSON.parse(localStorage.getItem("financeiroDespesasFixas")) || [];
let parcelas = JSON.parse(localStorage.getItem("financeiroParcelas")) || [];
let objetivos = JSON.parse(localStorage.getItem("financeiroObjetivos")) || [];
let investimentos = JSON.parse(localStorage.getItem("financeiroInvestimentos")) || [];

let receitaEditandoId = null;
let comissaoEditandoId = null;
let despesaEditandoId = null;
let parcelaEditandoId = null;
let objetivoEditandoId = null;
let investimentoEditandoId = null;
let tipoRendaExtraEditandoId = null;

const mesAtual = document.getElementById("mesAtual");

function iniciarMesAtual() {
  const hoje = new Date();
  mesAtual.value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

function formatarMoeda(valor) {
  return (Number(valor) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseValor(campoOuValor) {
  const bruto = typeof campoOuValor === "string" ? campoOuValor : (campoOuValor?.value || "");
  let texto = String(bruto)
    .replace(/R\$/g, "")
    .replace(/\s/g, "")
    .replace(/[^0-9,.-]/g, "");

  if (texto.includes(",")) {
    texto = texto.replace(/\./g, "").replace(/,/g, ".");
  } else {
    const partes = texto.split(".");
    if (partes.length > 2) {
      const decimal = partes.pop();
      texto = partes.join("") + "." + decimal;
    }
  }

  const valor = Number(texto);
  return Number.isFinite(valor) ? valor : 0;
}

function setTexto(id, valor) {
  const el = document.getElementById(id);
  if (el) el.textContent = valor;
}

function notificarSalvo(mensagem = "Salvo com sucesso.") {
  const aviso = document.getElementById("toastAviso");
  if (!aviso) return;
  aviso.textContent = mensagem;
  aviso.classList.add("visivel");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => aviso.classList.remove("visivel"), 2200);
}

function formatarData(data) {
  if (!data) return "-";
  const partes = data.split("-");
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarMes(mes) {
  if (!mes) return "-";
  const [ano, numeroMes] = mes.split("-");
  return `${numeroMes}/${ano}`;
}

function salvarLocal() {
  localStorage.setItem("financeiroConfiguracoes", JSON.stringify(configuracoes));
  localStorage.setItem("financeiroReceitasFixas", JSON.stringify(receitas));
  localStorage.setItem("financeiroComissoesDiarias", JSON.stringify(comissoes));
  localStorage.setItem("financeiroDespesasFixas", JSON.stringify(despesas));
  localStorage.setItem("financeiroParcelas", JSON.stringify(parcelas));
  localStorage.setItem("financeiroObjetivos", JSON.stringify(objetivos));
  localStorage.setItem("financeiroInvestimentos", JSON.stringify(investimentos));
}

function filtrarPorMes(lista, mes = mesAtual.value) {
  return lista.filter(item => item.data && item.data.startsWith(mes));
}

function mesParaIndice(mes) {
  const [ano, numeroMes] = mes.split("-").map(Number);
  return ano * 12 + numeroMes;
}

function parcelaAtivaNoMes(parcela, mes) {
  const inicio = mesParaIndice(parcela.inicio);
  const atual = mesParaIndice(mes);
  const parcelaNumero = atual - inicio + 1;
  return parcelaNumero >= 1 && parcelaNumero <= parcela.qtdParcelas;
}

function numeroParcelaNoMes(parcela, mes) {
  return mesParaIndice(mes) - mesParaIndice(parcela.inicio) + 1;
}

function obterParcelasDoMes(mes = mesAtual.value) {
  return parcelas.filter(parcela => parcelaAtivaNoMes(parcela, mes));
}

function obterTotalReceitasFixas() {
  return receitas.reduce((s, item) => s + (Number(item.valor) || 0), 0);
}

function mostrarAba(aba) {
  const abas = ["dashboard", "receitas", "comissoes", "despesas", "parcelas", "caixa", "investimentos", "objetivos", "configuracoes"];
  const mapa = {
    dashboard: "btnDashboard",
    receitas: "btnReceitas",
    comissoes: "btnComissoes",
    despesas: "btnDespesas",
    parcelas: "btnParcelas",
    caixa: "btnCaixa",
    investimentos: "btnInvestimentos",
    objetivos: "btnObjetivos",
    configuracoes: "btnConfiguracoes"
  };

  if (!abas.includes(aba)) aba = "dashboard";

  abas.forEach(nome => {
    const secao = document.getElementById(nome);
    if (secao) secao.classList.add("oculto");
  });

  document.querySelectorAll(".nav-btn, .bottom-nav button").forEach(botao => {
    botao.classList.remove("ativo");
  });

  const secaoAtiva = document.getElementById(aba);
  if (secaoAtiva) secaoAtiva.classList.remove("oculto");

  const botaoLateral = document.getElementById(mapa[aba]);
  if (botaoLateral) botaoLateral.classList.add("ativo");

  document.querySelectorAll(`[data-aba="${aba}"]`).forEach(botao => {
    botao.classList.add("ativo");
  });

  atualizarTela();
  fecharMenuMobile();
}

function salvarReceita() {
  const descricao = document.getElementById("descricaoReceita").value.trim();
  const valor = parseValor(document.getElementById("valorReceita"));
  if (!descricao || valor <= 0) return alert("Preencha descrição e valor da receita fixa.");

  if (receitaEditandoId) {
    receitas = receitas.map(item => item.id === receitaEditandoId ? { ...item, descricao, valor } : item);
    receitaEditandoId = null;
    document.getElementById("btnSalvarReceita").textContent = "Adicionar";
    document.getElementById("btnCancelarReceita").classList.add("oculto");
  } else {
    receitas.push({ id: Date.now(), descricao, valor });
  }

  salvarLocal();
  notificarSalvo();
  limparFormularioReceita();
  atualizarTela();
}

function editarReceita(id) {
  const item = receitas.find(r => r.id === id);
  if (!item) return;
  document.getElementById("descricaoReceita").value = item.descricao;
  document.getElementById("valorReceita").value = item.valor;
  receitaEditandoId = id;
  document.getElementById("btnSalvarReceita").textContent = "Salvar";
  document.getElementById("btnCancelarReceita").classList.remove("oculto");
  mostrarAba("receitas");
}

function cancelarEdicaoReceita() {
  receitaEditandoId = null;
  limparFormularioReceita();
  document.getElementById("btnSalvarReceita").textContent = "Adicionar";
  document.getElementById("btnCancelarReceita").classList.add("oculto");
}

function limparFormularioReceita() {
  document.getElementById("descricaoReceita").value = "";
  document.getElementById("valorReceita").value = "";
}

function removerReceita(id) {
  if (!confirm("Remover esta receita fixa?")) return;
  receitas = receitas.filter(item => item.id !== id);
  salvarLocal();
  atualizarTela();
}

function obterTipoRendaExtra(id) {
  return configuracoes.tiposRendaExtra.find(tipo => String(tipo.id) === String(id));
}

function salvarComissao() {
  const data = document.getElementById("dataComissao").value;
  const tipoId = document.getElementById("tipoRendaExtra").value;
  const quantidade = parseValor(document.getElementById("qtdExtra")) || 0;
  const tipo = obterTipoRendaExtra(tipoId);

  if (!data) return alert("Preencha a data.");
  if (!tipo) return alert("Cadastre um tipo de renda extra em Configurações.");
  if (quantidade <= 0) return alert("Informe uma quantidade maior que zero.");

  const valorUnitario = Number(tipo.valor) || 0;
  const valor = quantidade * valorUnitario;

  const registro = {
    id: comissaoEditandoId || Date.now(),
    data,
    tipoId: tipo.id,
    tipoNome: tipo.nome,
    quantidade,
    valorUnitario,
    valor,
    totalAparelhos: quantidade
  };

  if (comissaoEditandoId) {
    comissoes = comissoes.map(item => item.id === comissaoEditandoId ? registro : item);
    comissaoEditandoId = null;
    document.getElementById("btnSalvarComissao").textContent = "Adicionar";
    document.getElementById("btnCancelarComissao").classList.add("oculto");
  } else {
    comissoes.push(registro);
  }

  salvarLocal();
  notificarSalvo();
  limparFormularioComissao();
  atualizarTela();
}

function editarComissao(id) {
  const item = comissoes.find(c => c.id === id);
  if (!item) return;
  document.getElementById("dataComissao").value = item.data;
  document.getElementById("tipoRendaExtra").value = item.tipoId || configuracoes.tiposRendaExtra[0]?.id || "";
  document.getElementById("qtdExtra").value = item.quantidade || item.totalAparelhos || 1;
  comissaoEditandoId = id;
  document.getElementById("btnSalvarComissao").textContent = "Salvar";
  document.getElementById("btnCancelarComissao").classList.remove("oculto");
  mostrarAba("comissoes");
}

function cancelarEdicaoComissao() {
  comissaoEditandoId = null;
  limparFormularioComissao();
  document.getElementById("btnSalvarComissao").textContent = "Adicionar";
  document.getElementById("btnCancelarComissao").classList.add("oculto");
}

function limparFormularioComissao() {
  document.getElementById("dataComissao").value = "";
  document.getElementById("qtdExtra").value = "";
}

function removerComissao(id) {
  if (!confirm("Remover esta renda extra?")) return;
  comissoes = comissoes.filter(item => item.id !== id);
  salvarLocal();
  atualizarTela();
}

function salvarDespesa() {
  const descricao = document.getElementById("descricaoDespesa").value.trim();
  const categoria = document.getElementById("categoriaDespesa").value;
  const valor = parseValor(document.getElementById("valorDespesa"));
  if (!descricao || valor <= 0) return alert("Preencha descrição e valor da despesa fixa.");

  if (despesaEditandoId) {
    despesas = despesas.map(item => item.id === despesaEditandoId ? { ...item, descricao, categoria, valor } : item);
    despesaEditandoId = null;
    document.getElementById("btnSalvarDespesa").textContent = "Adicionar";
    document.getElementById("btnCancelarDespesa").classList.add("oculto");
  } else {
    despesas.push({ id: Date.now(), descricao, categoria, valor });
  }

  salvarLocal();
  notificarSalvo();
  limparFormularioDespesa();
  atualizarTela();
}

function editarDespesa(id) {
  const item = despesas.find(d => d.id === id);
  if (!item) return;
  document.getElementById("descricaoDespesa").value = item.descricao;
  document.getElementById("categoriaDespesa").value = item.categoria;
  document.getElementById("valorDespesa").value = item.valor;
  despesaEditandoId = id;
  document.getElementById("btnSalvarDespesa").textContent = "Salvar";
  document.getElementById("btnCancelarDespesa").classList.remove("oculto");
  mostrarAba("despesas");
}

function cancelarEdicaoDespesa() {
  despesaEditandoId = null;
  limparFormularioDespesa();
  document.getElementById("btnSalvarDespesa").textContent = "Adicionar";
  document.getElementById("btnCancelarDespesa").classList.add("oculto");
}

function limparFormularioDespesa() {
  document.getElementById("descricaoDespesa").value = "";
  document.getElementById("categoriaDespesa").value = "Moradia";
  document.getElementById("valorDespesa").value = "";
}

function removerDespesa(id) {
  if (!confirm("Remover esta despesa fixa?")) return;
  despesas = despesas.filter(item => item.id !== id);
  salvarLocal();
  atualizarTela();
}

function salvarParcela() {
  const descricao = document.getElementById("descricaoParcela").value.trim();
  const inicio = document.getElementById("inicioParcela").value;
  const valor = parseValor(document.getElementById("valorParcela"));
  const qtdParcelas = parseValor(document.getElementById("qtdParcelas"));
  if (!descricao || !inicio || valor <= 0 || qtdParcelas <= 0) return alert("Preencha descrição, início, valor e quantidade de parcelas.");

  if (parcelaEditandoId) {
    parcelas = parcelas.map(item => item.id === parcelaEditandoId ? { ...item, descricao, inicio, valor, qtdParcelas } : item);
    parcelaEditandoId = null;
    document.getElementById("btnSalvarParcela").textContent = "Adicionar";
    document.getElementById("btnCancelarParcela").classList.add("oculto");
  } else {
    parcelas.push({ id: Date.now(), descricao, inicio, valor, qtdParcelas });
  }

  salvarLocal();
  notificarSalvo();
  limparFormularioParcela();
  atualizarTela();
}

function editarParcela(id) {
  const item = parcelas.find(p => p.id === id);
  if (!item) return;
  document.getElementById("descricaoParcela").value = item.descricao;
  document.getElementById("inicioParcela").value = item.inicio;
  document.getElementById("valorParcela").value = item.valor;
  document.getElementById("qtdParcelas").value = item.qtdParcelas;
  parcelaEditandoId = id;
  document.getElementById("btnSalvarParcela").textContent = "Salvar";
  document.getElementById("btnCancelarParcela").classList.remove("oculto");
  mostrarAba("parcelas");
}

function cancelarEdicaoParcela() {
  parcelaEditandoId = null;
  limparFormularioParcela();
  document.getElementById("btnSalvarParcela").textContent = "Adicionar";
  document.getElementById("btnCancelarParcela").classList.add("oculto");
}

function limparFormularioParcela() {
  document.getElementById("descricaoParcela").value = "";
  document.getElementById("inicioParcela").value = "";
  document.getElementById("valorParcela").value = "";
  document.getElementById("qtdParcelas").value = "";
}

function removerParcela(id) {
  if (!confirm("Remover esta parcela?")) return;
  parcelas = parcelas.filter(item => item.id !== id);
  salvarLocal();
  atualizarTela();
}

function salvarCaixaEmergencial() {
  const tipoMeta = document.getElementById("reservaTipoMeta").value;
  const valorMeta = parseValor(document.getElementById("reservaValorMeta")) || 0;
  const saldoAtual = parseValor(document.getElementById("reservaSaldoAtual")) || 0;
  const aportePercentual = parseValor(document.getElementById("reservaAportePercentual")) || 0;

  if (valorMeta < 0 || saldoAtual < 0 || aportePercentual < 0) return alert("Os valores não podem ser negativos.");

  configuracoes.caixaEmergencial = { tipoMeta, valorMeta, saldoAtual, aportePercentual };
  salvarLocal();
  notificarSalvo();
  atualizarTela();
  alert("Caixa emergencial salvo.");
}

function calcularCaixaEmergencial() {
  const cfg = configuracoes.caixaEmergencial || { tipoMeta: "fixo", valorMeta: 0, saldoAtual: 0, aportePercentual: 10 };
  const receitasFixas = obterTotalReceitasFixas();
  const despesasMensais = despesas.reduce((s, item) => s + (Number(item.valor) || 0), 0);
  let meta = 0;

  if (cfg.tipoMeta === "percentual") {
    meta = receitasFixas * ((Number(cfg.valorMeta) || 0) / 100);
  } else if (cfg.tipoMeta === "meses") {
    meta = despesasMensais * (Number(cfg.valorMeta) || 0);
  } else {
    meta = Number(cfg.valorMeta) || 0;
  }

  const atual = Number(cfg.saldoAtual) || 0;
  const faltam = Math.max(0, meta - atual);
  const aporte = receitasFixas * ((Number(cfg.aportePercentual) || 0) / 100);
  const percentual = meta > 0 ? Math.min(100, Math.max(0, (atual / meta) * 100)) : 0;
  const meses = faltam <= 0 ? "Concluído" : aporte > 0 ? `${Math.ceil(faltam / aporte)} mês${Math.ceil(faltam / aporte) === 1 ? "" : "es"}` : "Sem previsão";
  return { receitasFixas, despesasMensais, meta, atual, faltam, aporte, percentual, meses, cfg };
}

function carregarCaixaEmergencialNaTela() {
  const cfg = configuracoes.caixaEmergencial;
  document.getElementById("reservaTipoMeta").value = cfg.tipoMeta || "fixo";
  document.getElementById("reservaValorMeta").value = cfg.valorMeta || "";
  document.getElementById("reservaSaldoAtual").value = cfg.saldoAtual || "";
  document.getElementById("reservaAportePercentual").value = cfg.aportePercentual || "";
}

function atualizarCaixaEmergencial() {
  const r = calcularCaixaEmergencial();
  const descricao = r.cfg.tipoMeta === "percentual" ? `Meta equivalente a ${r.cfg.valorMeta || 0}% das receitas fixas.` : r.cfg.tipoMeta === "meses" ? `Meta equivalente a ${r.cfg.valorMeta || 0} mês(es) de despesas fixas.` : "Meta definida em valor fixo.";
  const ids = {
    reservaDescricao: descricao,
    reservaPercentual: `${Math.round(r.percentual)}%`,
    reservaReceitas: formatarMoeda(r.receitasFixas),
    reservaDespesas: formatarMoeda(r.despesasMensais),
    reservaDespesasDashboard: formatarMoeda(r.despesasMensais),
    reservaMeta: formatarMoeda(r.meta),
    reservaAtual: formatarMoeda(r.atual),
    reservaFaltam: formatarMoeda(r.faltam),
    reservaAporte: formatarMoeda(r.aporte),
    reservaPrevisao: r.meses,
    reservaDashboard: formatarMoeda(r.atual),
    reservaPercentualDashboard: `${Math.round(r.percentual)}%`,
    reservaMetaDashboard: formatarMoeda(r.meta),
    reservaAtualDashboard: formatarMoeda(r.atual),
    reservaFaltanteDashboard: formatarMoeda(r.faltam),
    reservaAporteDashboard: formatarMoeda(r.aporte)
  };
  Object.entries(ids).forEach(([id, valor]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = valor;
  });
  const barra = document.getElementById("barraReserva");
  const barraDash = document.getElementById("barraReservaDashboard");
  if (barra) barra.style.width = `${r.percentual}%`;
  if (barraDash) barraDash.style.width = `${r.percentual}%`;
}

function salvarObjetivo() {
  const nome = document.getElementById("nomeObjetivo").value.trim();
  const valorAlvo = parseValor(document.getElementById("valorAlvoObjetivo"));
  const valorAtual = parseValor(document.getElementById("valorAtualObjetivo")) || 0;
  const aporteMensal = parseValor(document.getElementById("aporteMensalObjetivo")) || 0;
  if (!nome || valorAlvo <= 0) return alert("Preencha o nome do objetivo e o valor alvo.");
  if (valorAtual < 0 || aporteMensal < 0) return alert("Os valores não podem ser negativos.");

  if (objetivoEditandoId) {
    objetivos = objetivos.map(item => item.id === objetivoEditandoId ? { ...item, nome, valorAlvo, valorAtual, aporteMensal } : item);
    objetivoEditandoId = null;
    document.getElementById("btnSalvarObjetivo").textContent = "Adicionar";
    document.getElementById("btnCancelarObjetivo").classList.add("oculto");
  } else {
    objetivos.push({ id: Date.now(), nome, valorAlvo, valorAtual, aporteMensal });
  }
  salvarLocal();
  notificarSalvo();
  limparFormularioObjetivo();
  atualizarTela();
}

function editarObjetivo(id) {
  const item = objetivos.find(o => o.id === id);
  if (!item) return;
  document.getElementById("nomeObjetivo").value = item.nome;
  document.getElementById("valorAlvoObjetivo").value = item.valorAlvo;
  document.getElementById("valorAtualObjetivo").value = item.valorAtual;
  document.getElementById("aporteMensalObjetivo").value = item.aporteMensal;
  objetivoEditandoId = id;
  document.getElementById("btnSalvarObjetivo").textContent = "Salvar";
  document.getElementById("btnCancelarObjetivo").classList.remove("oculto");
  mostrarAba("objetivos");
}

function cancelarEdicaoObjetivo() {
  objetivoEditandoId = null;
  limparFormularioObjetivo();
  document.getElementById("btnSalvarObjetivo").textContent = "Adicionar";
  document.getElementById("btnCancelarObjetivo").classList.add("oculto");
}

function limparFormularioObjetivo() {
  document.getElementById("nomeObjetivo").value = "";
  document.getElementById("valorAlvoObjetivo").value = "";
  document.getElementById("valorAtualObjetivo").value = "";
  document.getElementById("aporteMensalObjetivo").value = "";
}

function removerObjetivo(id) {
  if (!confirm("Remover este objetivo?")) return;
  objetivos = objetivos.filter(item => item.id !== id);
  salvarLocal();
  atualizarTela();
}

function aportarObjetivo(id) {
  const item = objetivos.find(o => o.id === id);
  if (!item) return;
  const valor = parseValor(prompt(`Quanto deseja aportar em ${item.nome}?`));
  if (!valor || valor <= 0) return;
  objetivos = objetivos.map(obj => obj.id === id ? { ...obj, valorAtual: obj.valorAtual + valor } : obj);
  salvarLocal();
  atualizarTela();
}

function calcularPrevisaoObjetivo(objetivo) {
  const faltam = Math.max(0, objetivo.valorAlvo - objetivo.valorAtual);
  if (faltam <= 0) return "Concluído";
  if (!objetivo.aporteMensal || objetivo.aporteMensal <= 0) return "Sem previsão";
  const meses = Math.ceil(faltam / objetivo.aporteMensal);
  return `${meses} mês${meses === 1 ? "" : "es"}`;
}

function salvarTipoRendaExtra() {
  const nome = document.getElementById("nomeRendaExtraConfig").value.trim();
  const valor = parseValor(document.getElementById("valorRendaExtraConfig"));
  if (!nome || valor <= 0) return alert("Preencha o nome e o valor da renda extra.");

  if (tipoRendaExtraEditandoId) {
    configuracoes.tiposRendaExtra = configuracoes.tiposRendaExtra.map(item => item.id === tipoRendaExtraEditandoId ? { ...item, nome, valor } : item);
    tipoRendaExtraEditandoId = null;
    document.getElementById("btnSalvarTipoRendaExtra").textContent = "Adicionar renda extra";
    document.getElementById("btnCancelarTipoRendaExtra").classList.add("oculto");
  } else {
    configuracoes.tiposRendaExtra.push({ id: Date.now(), nome, valor });
  }

  salvarLocal();
  notificarSalvo();
  limparFormularioTipoRendaExtra();
  atualizarTela();
}

function editarTipoRendaExtra(id) {
  const item = configuracoes.tiposRendaExtra.find(tipo => tipo.id === id);
  if (!item) return;
  document.getElementById("nomeRendaExtraConfig").value = item.nome;
  document.getElementById("valorRendaExtraConfig").value = item.valor;
  tipoRendaExtraEditandoId = id;
  document.getElementById("btnSalvarTipoRendaExtra").textContent = "Salvar renda extra";
  document.getElementById("btnCancelarTipoRendaExtra").classList.remove("oculto");
}

function cancelarEdicaoTipoRendaExtra() {
  tipoRendaExtraEditandoId = null;
  limparFormularioTipoRendaExtra();
  document.getElementById("btnSalvarTipoRendaExtra").textContent = "Adicionar renda extra";
  document.getElementById("btnCancelarTipoRendaExtra").classList.add("oculto");
}

function limparFormularioTipoRendaExtra() {
  document.getElementById("nomeRendaExtraConfig").value = "";
  document.getElementById("valorRendaExtraConfig").value = "";
}

function removerTipoRendaExtra(id) {
  if (configuracoes.tiposRendaExtra.length <= 1) return alert("Mantenha pelo menos um tipo de renda extra cadastrado.");
  if (!confirm("Remover este tipo de renda extra?")) return;
  configuracoes.tiposRendaExtra = configuracoes.tiposRendaExtra.filter(item => item.id !== id);
  salvarLocal();
  atualizarTela();
}

function atualizarSelectRendasExtras() {
  const select = document.getElementById("tipoRendaExtra");
  if (!select) return;
  select.innerHTML = "";
  configuracoes.tiposRendaExtra.forEach(tipo => {
    select.innerHTML += `<option value="${tipo.id}">${tipo.nome} — ${formatarMoeda(tipo.valor)}</option>`;
  });
}

function atualizarTabelaTiposRendaExtra() {
  const tbody = document.getElementById("listaTiposRendaExtra");
  if (!tbody) return;
  tbody.innerHTML = "";
  configuracoes.tiposRendaExtra.forEach(item => {
    tbody.innerHTML += `<tr><td>${item.nome}</td><td>${formatarMoeda(item.valor)}</td><td><button class="botao-editar" onclick="editarTipoRendaExtra(${item.id})">Editar</button><button class="botao-remover" onclick="removerTipoRendaExtra(${item.id})">Remover</button></td></tr>`;
  });
}

function aplicarLabelsMobile() {
  document.querySelectorAll(".tabela-area table").forEach(tabela => {
    const titulos = Array.from(tabela.querySelectorAll("thead th")).map(th => th.textContent.trim());
    tabela.querySelectorAll("tbody tr").forEach(linha => {
      Array.from(linha.children).forEach((celula, index) => celula.setAttribute("data-label", titulos[index] || ""));
    });
  });
}

function atualizarTela() {
  const comissoesMes = filtrarPorMes(comissoes);
  const parcelasMes = obterParcelasDoMes();
  atualizarSelectRendasExtras();
  atualizarDashboard(receitas, comissoesMes, despesas, parcelasMes);
  atualizarTabelaReceitas(receitas);
  atualizarTabelaComissoes(comissoesMes);
  atualizarTabelaDespesas(despesas);
  atualizarTabelaParcelas(parcelas);
  atualizarTabelaObjetivos(objetivos);
  atualizarObjetivosDashboard(objetivos);
  atualizarTabelaInvestimentos();
  atualizarDashboardInvestimentos();
  atualizarTabelaTiposRendaExtra();
  atualizarCaixaEmergencial();
  atualizarPatrimonio();
  atualizarHistorico();
  carregarCaixaEmergencialNaTela();
  aplicarLabelsMobile();
}

function atualizarDashboard(receitasFixas, comissoesMes, despesasFixas, parcelasMes) {
  const totalReceitasFixas = receitasFixas.reduce((s, item) => s + item.valor, 0);
  const comissaoMes = comissoesMes.reduce((s, item) => s + item.valor, 0);
  const lancamentosExtras = comissoesMes.reduce((s, item) => s + (Number(item.quantidade) || Number(item.totalAparelhos) || 1), 0);
  const totalDespesasFixas = despesasFixas.reduce((s, item) => s + item.valor, 0);
  const totalParcelasMes = parcelasMes.reduce((s, item) => s + item.valor, 0);
  const entradas = totalReceitasFixas + comissaoMes;
  const saidas = totalDespesasFixas + totalParcelasMes;
  const saldo = entradas - saidas;

  const reserva = calcularCaixaEmergencial();
  const totalObjetivos = objetivos.reduce((s, item) => s + (Number(item.valorAtual) || 0), 0);
  const totalInvestimentos = calcularTotalInvestimentos();
  const patrimonioTotal = Math.max(0, saldo) + reserva.atual + totalObjetivos + totalInvestimentos;

  setTexto("receitasFixas", formatarMoeda(totalReceitasFixas));
  setTexto("comissaoMes", formatarMoeda(comissaoMes));
  setTexto("aparelhosVendidos", lancamentosExtras);
  setTexto("despesasFixas", formatarMoeda(totalDespesasFixas));
  setTexto("parcelasMes", formatarMoeda(totalParcelasMes));
  setTexto("saldoDisponivel", formatarMoeda(saldo));
  setTexto("patrimonioTotalHero", formatarMoeda(patrimonioTotal));
  setTexto("patrimonioVariacaoHero", saldo >= 0 ? `Resultado positivo de ${formatarMoeda(saldo)} no mês` : `Resultado negativo de ${formatarMoeda(Math.abs(saldo))} no mês`);

  const saldoEl = document.getElementById("saldoDisponivel");
  saldoEl.classList.remove("positivo", "negativo");
  saldoEl.classList.add(saldo >= 0 ? "positivo" : "negativo");

  atualizarGrafico(entradas, saidas, Math.max(saldo, 0));
}

function atualizarGrafico(entradas, saidas, saldo) {
  const maior = Math.max(entradas, saidas, saldo, 1);
  document.getElementById("barraEntradas").style.width = `${(entradas / maior) * 100}%`;
  document.getElementById("barraDespesas").style.width = `${(saidas / maior) * 100}%`;
  document.getElementById("barraSaldo").style.width = `${(saldo / maior) * 100}%`;
  document.getElementById("labelEntradas").textContent = formatarMoeda(entradas);
  document.getElementById("labelDespesas").textContent = formatarMoeda(saidas);
  document.getElementById("labelSaldo").textContent = formatarMoeda(saldo);
}

function atualizarTabelaReceitas(lista) {
  const tbody = document.getElementById("listaReceitas");
  tbody.innerHTML = "";
  lista.forEach(item => tbody.innerHTML += `<tr><td>${item.descricao}</td><td>${formatarMoeda(item.valor)}</td><td><button class="botao-editar" onclick="editarReceita(${item.id})">Editar</button><button class="botao-remover" onclick="removerReceita(${item.id})">Remover</button></td></tr>`);
}

function atualizarTabelaComissoes(lista) {
  const tbody = document.getElementById("listaComissoes");
  tbody.innerHTML = "";
  lista.forEach(item => {
    const quantidade = Number(item.quantidade) || Number(item.totalAparelhos) || 1;
    const valorUnitario = Number(item.valorUnitario) || (quantidade > 0 ? item.valor / quantidade : item.valor);
    const nome = item.tipoNome || "Renda extra";
    tbody.innerHTML += `<tr><td>${formatarData(item.data)}</td><td>${nome}</td><td>${quantidade}</td><td>${formatarMoeda(valorUnitario)}</td><td>${formatarMoeda(item.valor)}</td><td><button class="botao-editar" onclick="editarComissao(${item.id})">Editar</button><button class="botao-remover" onclick="removerComissao(${item.id})">Remover</button></td></tr>`;
  });
}

function atualizarTabelaDespesas(lista) {
  const tbody = document.getElementById("listaDespesas");
  tbody.innerHTML = "";
  lista.forEach(item => tbody.innerHTML += `<tr><td>${item.descricao}</td><td>${item.categoria}</td><td>${formatarMoeda(item.valor)}</td><td><button class="botao-editar" onclick="editarDespesa(${item.id})">Editar</button><button class="botao-remover" onclick="removerDespesa(${item.id})">Remover</button></td></tr>`);
}

function atualizarTabelaParcelas(lista) {
  const tbody = document.getElementById("listaParcelas");
  tbody.innerHTML = "";
  lista.forEach(item => {
    const ativa = parcelaAtivaNoMes(item, mesAtual.value);
    const numeroAtual = numeroParcelaNoMes(item, mesAtual.value);
    const status = ativa ? `${numeroAtual}/${item.qtdParcelas}` : numeroAtual < 1 ? "Ainda não começou" : "Finalizada";
    const restantes = ativa ? (item.qtdParcelas - numeroAtual + 1) * item.valor : numeroAtual < 1 ? item.qtdParcelas * item.valor : 0;
    tbody.innerHTML += `<tr><td>${item.descricao}</td><td>${formatarMes(item.inicio)}</td><td>${formatarMoeda(item.valor)}</td><td>${item.qtdParcelas}x</td><td>${status}</td><td>${formatarMoeda(restantes)}</td><td><button class="botao-editar" onclick="editarParcela(${item.id})">Editar</button><button class="botao-remover" onclick="removerParcela(${item.id})">Remover</button></td></tr>`;
  });
}

function atualizarTabelaObjetivos(lista) {
  const tbody = document.getElementById("listaObjetivos");
  tbody.innerHTML = "";
  lista.forEach(item => {
    const faltam = Math.max(0, item.valorAlvo - item.valorAtual);
    tbody.innerHTML += `<tr><td>${item.nome}</td><td>${formatarMoeda(item.valorAlvo)}</td><td>${formatarMoeda(item.valorAtual)}</td><td>${formatarMoeda(faltam)}</td><td>${formatarMoeda(item.aporteMensal || 0)}</td><td>${calcularPrevisaoObjetivo(item)}</td><td><button class="botao-editar" onclick="aportarObjetivo(${item.id})">Aportar</button><button class="botao-editar" onclick="editarObjetivo(${item.id})">Editar</button><button class="botao-remover" onclick="removerObjetivo(${item.id})">Remover</button></td></tr>`;
  });
}

function atualizarObjetivosDashboard(lista) {
  const totalGuardado = lista.reduce((s, item) => s + item.valorAtual, 0);
  const totalAlvo = lista.reduce((s, item) => s + item.valorAlvo, 0);
  const card = document.getElementById("objetivosGuardados");
  const box = document.getElementById("listaObjetivosDashboard");
  if (card) card.textContent = `${formatarMoeda(totalGuardado)} / ${formatarMoeda(totalAlvo)}`;
  if (!box) return;
  if (lista.length === 0) {
    box.innerHTML = `<p class="aviso">Nenhum objetivo cadastrado ainda. Use a aba Objetivos para cadastrar apartamento, reserva, viagem ou outras metas.</p>`;
    return;
  }
  box.innerHTML = "";
  lista.forEach(item => {
    const percentual = item.valorAlvo > 0 ? Math.min((item.valorAtual / item.valorAlvo) * 100, 100) : 0;
    const faltam = Math.max(0, item.valorAlvo - item.valorAtual);
    box.innerHTML += `<div class="objetivo-item"><div class="objetivo-linha"><span>${item.nome}</span><strong>${Math.round(percentual)}%</strong></div><div class="objetivo-info"><span>${formatarMoeda(item.valorAtual)} de ${formatarMoeda(item.valorAlvo)}</span><span>Faltam ${formatarMoeda(faltam)}</span></div><div class="objetivo-barra"><div style="width:${percentual}%"></div></div></div>`;
  });
}

function calcularResumoMes(mes) {
  const totalReceitasFixas = receitas.reduce((s, item) => s + item.valor, 0);
  const comissoesMes = filtrarPorMes(comissoes, mes);
  const totalComissoes = comissoesMes.reduce((s, item) => s + item.valor, 0);
  const totalLancamentos = comissoesMes.reduce((s, item) => s + (Number(item.quantidade) || Number(item.totalAparelhos) || 1), 0);
  const totalDespesas = despesas.reduce((s, item) => s + item.valor, 0);
  const totalParcelas = obterParcelasDoMes(mes).reduce((s, item) => s + item.valor, 0);
  const saidas = totalDespesas + totalParcelas;
  const saldo = totalReceitasFixas + totalComissoes - saidas;
  return { totalReceitasFixas, totalComissoes, saidas, saldo, totalLancamentos };
}

function obterUltimosMeses(qtd = 6) {
  const [anoBase, mesBase] = mesAtual.value.split("-").map(Number);
  const meses = [];
  for (let i = 0; i < qtd; i++) {
    const data = new Date(anoBase, mesBase - 1 + i, 1);
    meses.push(`${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`);
  }
  return meses;
}

function atualizarHistorico() {
  const tbody = document.getElementById("listaHistorico");
  tbody.innerHTML = "";
  obterUltimosMeses().forEach(mes => {
    const r = calcularResumoMes(mes);
    tbody.innerHTML += `<tr><td>${formatarMes(mes)}</td><td>${formatarMoeda(r.totalReceitasFixas)}</td><td>${formatarMoeda(r.totalComissoes)}</td><td>${formatarMoeda(r.saidas)}</td><td>${formatarMoeda(r.saldo)}</td><td>${r.totalLancamentos}</td></tr>`;
  });
}

function normalizarTicker(ticker) {
  return String(ticker || "").trim().toUpperCase().replace(/\s/g, "");
}

function calcularValorInvestimento(item) {
  const quantidade = Number(item.quantidade) || 0;
  const precoAtual = Number(item.precoAtual) || 0;
  return quantidade * precoAtual;
}

function calcularCustoInvestimento(item) {
  const quantidade = Number(item.quantidade) || 0;
  const precoMedio = Number(item.precoMedio) || 0;
  return quantidade * precoMedio;
}

function calcularTotalInvestimentos() {
  return investimentos.reduce((s, item) => s + calcularValorInvestimento(item), 0);
}

function salvarInvestimento() {
  const ticker = normalizarTicker(document.getElementById("tickerInvestimento").value);
  const quantidade = parseValor(document.getElementById("qtdInvestimento"));
  const precoMedio = parseValor(document.getElementById("precoMedioInvestimento"));
  const precoAtualDigitado = parseValor(document.getElementById("precoAtualInvestimento"));
  const categoria = document.getElementById("categoriaInvestimento").value;

  if (!ticker || quantidade <= 0) return alert("Informe o ativo e a quantidade.");
  if (precoMedio < 0 || precoAtualDigitado < 0) return alert("Os valores não podem ser negativos.");

  const existente = investimentos.find(item => item.ticker === ticker && item.id !== investimentoEditandoId);
  if (existente && !investimentoEditandoId) {
    if (!confirm("Este ativo já existe na carteira. Deseja cadastrar mesmo assim?")) return;
  }

  const payload = {
    ticker,
    quantidade,
    precoMedio,
    precoAtual: precoAtualDigitado,
    categoria,
    atualizadoEm: precoAtualDigitado > 0 ? new Date().toISOString() : null
  };

  if (investimentoEditandoId) {
    investimentos = investimentos.map(item => item.id === investimentoEditandoId ? { ...item, ...payload } : item);
    investimentoEditandoId = null;
    document.getElementById("btnSalvarInvestimento").textContent = "Adicionar";
    document.getElementById("btnCancelarInvestimento").classList.add("oculto");
  } else {
    investimentos.push({ id: Date.now(), ...payload });
  }

  salvarLocal();
  limparFormularioInvestimento();
  atualizarTela();
  notificarSalvo("Investimento salvo.");

  if (precoAtualDigitado <= 0) {
    atualizarCotacaoInvestimento(ticker);
  }
}

function editarInvestimento(id) {
  const item = investimentos.find(inv => inv.id === id);
  if (!item) return;
  document.getElementById("tickerInvestimento").value = item.ticker;
  document.getElementById("qtdInvestimento").value = item.quantidade;
  document.getElementById("precoMedioInvestimento").value = item.precoMedio || "";
  document.getElementById("precoAtualInvestimento").value = item.precoAtual || "";
  document.getElementById("categoriaInvestimento").value = item.categoria || "Ação";
  investimentoEditandoId = id;
  document.getElementById("btnSalvarInvestimento").textContent = "Salvar";
  document.getElementById("btnCancelarInvestimento").classList.remove("oculto");
  mostrarAba("investimentos");
}

function cancelarEdicaoInvestimento() {
  investimentoEditandoId = null;
  limparFormularioInvestimento();
  document.getElementById("btnSalvarInvestimento").textContent = "Adicionar";
  document.getElementById("btnCancelarInvestimento").classList.add("oculto");
}

function limparFormularioInvestimento() {
  document.getElementById("tickerInvestimento").value = "";
  document.getElementById("qtdInvestimento").value = "";
  document.getElementById("precoMedioInvestimento").value = "";
  document.getElementById("precoAtualInvestimento").value = "";
  document.getElementById("categoriaInvestimento").value = "Ação";
}

function removerInvestimento(id) {
  if (!confirm("Remover este investimento?")) return;
  investimentos = investimentos.filter(item => item.id !== id);
  salvarLocal();
  atualizarTela();
}

async function buscarCotacaoOnline(ticker) {
  const token = String(configuracoes.tokenCotacao || "").trim();
  const url = `https://brapi.dev/api/quote/${encodeURIComponent(ticker)}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error("Não foi possível consultar a cotação.");
  const dados = await resposta.json();
  const resultado = dados && dados.results && dados.results[0];
  const preco = Number(resultado?.regularMarketPrice || resultado?.regularMarketPreviousClose || 0);
  if (!preco || preco <= 0) throw new Error("Cotação não encontrada.");
  return preco;
}

async function atualizarCotacaoInvestimento(ticker) {
  const alvo = normalizarTicker(ticker);
  const item = investimentos.find(inv => inv.ticker === alvo);
  if (!item) return;
  try {
    const preco = await buscarCotacaoOnline(alvo);
    investimentos = investimentos.map(inv => inv.ticker === alvo ? { ...inv, precoAtual: preco, atualizadoEm: new Date().toISOString() } : inv);
    salvarLocal();
    atualizarTela();
    notificarSalvo(`Cotação de ${alvo} atualizada.`);
  } catch (erro) {
    notificarSalvo("Cotação online indisponível. Informe o preço atual manualmente.");
  }
}

async function atualizarCotacoesInvestimentos() {
  if (!investimentos.length) return alert("Cadastre pelo menos um investimento.");
  let atualizados = 0;
  for (const item of investimentos) {
    try {
      const preco = await buscarCotacaoOnline(item.ticker);
      investimentos = investimentos.map(inv => inv.id === item.id ? { ...inv, precoAtual: preco, atualizadoEm: new Date().toISOString() } : inv);
      atualizados++;
    } catch (erro) {
      // Mantém preço manual quando a consulta falha.
    }
  }
  salvarLocal();
  atualizarTela();
  notificarSalvo(atualizados > 0 ? `${atualizados} cotação(ões) atualizada(s).` : "Não foi possível atualizar online. Use preço manual.");
}

function atualizarTabelaInvestimentos() {
  const tbody = document.getElementById("listaInvestimentos");
  if (!tbody) return;
  tbody.innerHTML = "";
  investimentos.forEach(item => {
    const valorAtual = calcularValorInvestimento(item);
    const custo = calcularCustoInvestimento(item);
    const resultado = valorAtual - custo;
    const classe = resultado >= 0 ? "positivo" : "negativo";
    tbody.innerHTML += `<tr><td>${item.ticker}</td><td>${item.categoria || "Ação"}</td><td>${item.quantidade}</td><td>${formatarMoeda(item.precoMedio || 0)}</td><td>${formatarMoeda(item.precoAtual || 0)}</td><td>${formatarMoeda(valorAtual)}</td><td class="${classe}">${formatarMoeda(resultado)}</td><td><button class="botao-editar" onclick="atualizarCotacaoInvestimento('${item.ticker}')">Cotação</button><button class="botao-editar" onclick="editarInvestimento(${item.id})">Editar</button><button class="botao-remover" onclick="removerInvestimento(${item.id})">Remover</button></td></tr>`;
  });
}

function agruparInvestimentosPorTicker() {
  const total = calcularTotalInvestimentos();
  return investimentos
    .map(item => ({ ticker: item.ticker, categoria: item.categoria || "Ação", valor: calcularValorInvestimento(item), percentual: total > 0 ? (calcularValorInvestimento(item) / total) * 100 : 0 }))
    .filter(item => item.valor > 0)
    .sort((a, b) => b.valor - a.valor);
}

function montarDonutInvestimentos(idGrafico, idLista) {
  const grafico = document.getElementById(idGrafico);
  const lista = document.getElementById(idLista);
  if (!grafico || !lista) return;
  const dados = agruparInvestimentosPorTicker();
  const total = calcularTotalInvestimentos();

  if (!dados.length || total <= 0) {
    grafico.style.background = "conic-gradient(rgba(255,255,255,0.10) 0 100%)";
    grafico.innerHTML = "<span>0%</span>";
    lista.innerHTML = `<p class="aviso">Cadastre ativos e informe preço atual para montar a distribuição da carteira.</p>`;
    return;
  }

  const cores = ["#c8a96a", "#16a34a", "#22c55e", "#84cc16", "#14b8a6", "#94a3b8", "#64748b"];
  let inicio = 0;
  const partes = dados.map((item, index) => {
    const fim = inicio + item.percentual;
    const parte = `${cores[index % cores.length]} ${inicio}% ${fim}%`;
    inicio = fim;
    return parte;
  });
  grafico.style.background = `conic-gradient(${partes.join(", ")})`;
  grafico.innerHTML = `<span>${formatarMoeda(total)}</span>`;
  lista.innerHTML = dados.slice(0, 6).map((item, index) => `<div><i style="background:${cores[index % cores.length]}"></i><span>${item.ticker}</span><strong>${formatarMoeda(item.valor)} · ${Math.round(item.percentual)}%</strong></div>`).join("");
}

function atualizarDashboardInvestimentos() {
  const total = calcularTotalInvestimentos();
  setTexto("investimentosDashboard", formatarMoeda(total));
  setTexto("investimentosTotal", formatarMoeda(total));
  setTexto("investimentosTotalDashboard", formatarMoeda(total));
  const status = document.getElementById("investimentosStatus");
  if (status) status.textContent = investimentos.length ? `${investimentos.length} ativo(s) cadastrado(s) na carteira.` : "Nenhum ativo cadastrado ainda.";
  montarDonutInvestimentos("graficoPizzaInvestimentos", "listaResumoInvestimentos");
  montarDonutInvestimentos("graficoPizzaInvestimentosAba", "listaResumoInvestimentosAba");
}

function carregarTokenCotacaoNaTela() {
  const campo = document.getElementById("configTokenCotacao");
  if (campo) campo.value = configuracoes.tokenCotacao || "";
}

function salvarTokenCotacao() {
  const campo = document.getElementById("configTokenCotacao");
  configuracoes.tokenCotacao = campo ? campo.value.trim() : "";
  salvarLocal();
  notificarSalvo("Configuração de cotações salva.");
}

function obterDadosPatrimonio(qtd = 6) {
  let acumulado = objetivos.reduce((s, item) => s + (Number(item.valorAtual) || 0), 0) + calcularCaixaEmergencial().atual + calcularTotalInvestimentos();
  return obterUltimosMeses(qtd).map(mes => {
    const resumo = calcularResumoMes(mes);
    acumulado += resumo.saldo;
    return { mes: formatarMes(mes), valor: acumulado };
  });
}

function atualizarPatrimonio() {
  const box = document.getElementById("graficoPatrimonio");
  if (!box) return;
  const dados = obterDadosPatrimonio(6);
  const valores = dados.map(item => item.valor);
  const menor = Math.min(...valores, 0);
  const maior = Math.max(...valores, 1);
  const faixa = Math.max(maior - menor, 1);
  const pontos = dados.map((item, index) => {
    const x = dados.length === 1 ? 0 : (index / (dados.length - 1)) * 100;
    const y = 100 - (((item.valor - menor) / faixa) * 82 + 8);
    return `${x},${y}`;
  }).join(" ");
  const barras = dados.map(item => {
    const altura = Math.max(6, ((item.valor - menor) / faixa) * 100);
    return `<div class="patrimonio-coluna"><div class="patrimonio-barra-wrap"><div class="patrimonio-barra" style="height:${altura}%"></div></div><strong>${formatarMoeda(item.valor)}</strong><span>${item.mes}</span></div>`;
  }).join("");
  const chartSvg = `<div class="patrimonio-svg-area"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pontos}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline></svg></div>`;
  box.innerHTML = `${chartSvg}<div class="patrimonio-barras">${barras}</div>`;
  const heroChart = document.getElementById("heroChart");
  if (heroChart) heroChart.innerHTML = chartSvg;
}

function alternarMenuMobile() {
  document.body.classList.toggle("menu-aberto");
}

function fecharMenuMobile() {
  document.body.classList.remove("menu-aberto");
}

function obterPacoteDadosFinanceiro() {
  return {
    app: "Financeiro+",
    versao: "v9-comercial",
    exportadoEm: new Date().toISOString(),
    dados: { configuracoes, receitas, comissoes, despesas, parcelas, objetivos, investimentos }
  };
}

function baixarArquivo(nome, conteudo, tipo = "application/json") {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 400);
}

function exportarDadosFinanceiro() {
  const pacote = obterPacoteDadosFinanceiro();
  const data = new Date().toISOString().slice(0, 10);
  baixarArquivo(`financeiro-plus-backup-${data}.json`, JSON.stringify(pacote, null, 2));
  const status = document.getElementById("backupStatus");
  if (status) status.textContent = `Backup exportado em ${new Date().toLocaleString("pt-BR")}.`;
  notificarSalvo("Backup exportado.");
}

function importarDadosArquivo(event) {
  const arquivo = event.target.files && event.target.files[0];
  if (!arquivo) return;
  const leitor = new FileReader();
  leitor.onload = function() {
    try {
      const pacote = JSON.parse(String(leitor.result || "{}"));
      const dados = pacote.dados || pacote;
      if (!dados || typeof dados !== "object") throw new Error("Arquivo inválido.");
      if (!confirm("Importar este backup vai substituir os dados atuais deste aparelho. Continuar?")) return;

      configuracoes = dados.configuracoes || {};
      if (!Array.isArray(configuracoes.tiposRendaExtra)) {
        configuracoes.tiposRendaExtra = [{ id: 1, nome: "Renda extra", valor: 100 }];
      }
      if (!configuracoes.caixaEmergencial) {
        configuracoes.caixaEmergencial = { tipoMeta: "fixo", valorMeta: 0, saldoAtual: 0, aportePercentual: 10 };
      }
      receitas = Array.isArray(dados.receitas) ? dados.receitas : [];
      comissoes = Array.isArray(dados.comissoes) ? dados.comissoes : [];
      despesas = Array.isArray(dados.despesas) ? dados.despesas : [];
      parcelas = Array.isArray(dados.parcelas) ? dados.parcelas : [];
      objetivos = Array.isArray(dados.objetivos) ? dados.objetivos : [];
      investimentos = Array.isArray(dados.investimentos) ? dados.investimentos : [];

      receitaEditandoId = comissaoEditandoId = despesaEditandoId = parcelaEditandoId = objetivoEditandoId = investimentoEditandoId = tipoRendaExtraEditandoId = null;
      salvarLocal();
      carregarCaixaEmergencialNaTela();
      carregarTokenCotacaoNaTela();
      atualizarTela();
      mostrarAba("dashboard");
      const status = document.getElementById("backupStatus");
      if (status) status.textContent = `Backup importado em ${new Date().toLocaleString("pt-BR")}.`;
      notificarSalvo("Backup importado com sucesso.");
    } catch (erro) {
      alert("Não foi possível importar este backup. Verifique se o arquivo é um JSON exportado pelo Financeiro+.");
    } finally {
      event.target.value = "";
    }
  };
  leitor.readAsText(arquivo);
}

function exportarDashboardPDF() {
  mostrarAba("dashboard");
  setTimeout(() => window.print(), 200);
}

// Fallback de navegação: garante que os botões funcionem mesmo em alguns navegadores móveis
// que bloqueiam ou atrasam handlers inline durante testes locais.
document.addEventListener("click", function(event) {
  const botao = event.target.closest("[data-aba]");
  if (!botao) return;
  event.preventDefault();
  mostrarAba(botao.getAttribute("data-aba"));
});


Object.assign(window, {
  mostrarAba, alternarMenuMobile, atualizarTela, exportarDashboardPDF, exportarDadosFinanceiro, importarDadosArquivo,
  salvarReceita, editarReceita, cancelarEdicaoReceita, removerReceita,
  salvarComissao, editarComissao, cancelarEdicaoComissao, removerComissao,
  salvarDespesa, editarDespesa, cancelarEdicaoDespesa, removerDespesa,
  salvarParcela, editarParcela, cancelarEdicaoParcela, removerParcela,
  salvarCaixaEmergencial,
  salvarInvestimento, editarInvestimento, cancelarEdicaoInvestimento, removerInvestimento, atualizarCotacaoInvestimento, atualizarCotacoesInvestimentos, salvarTokenCotacao,
  salvarObjetivo, editarObjetivo, cancelarEdicaoObjetivo, removerObjetivo, aportarObjetivo,
  salvarTipoRendaExtra, editarTipoRendaExtra, cancelarEdicaoTipoRendaExtra, removerTipoRendaExtra
});

iniciarMesAtual();
carregarCaixaEmergencialNaTela();
carregarTokenCotacaoNaTela();
atualizarTela();
mostrarAba("dashboard");
