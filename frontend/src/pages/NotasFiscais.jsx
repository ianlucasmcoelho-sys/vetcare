import React, { useState, useEffect, useMemo } from "react";
import { 
  FiPlus, FiSearch, FiX, FiCheckCircle, FiAlertCircle, 
  FiFileText, FiPrinter, FiSettings, FiDownload, 
  FiCalendar, FiDollarSign, FiTrash2, FiEye, FiSlash, FiSend, FiInfo
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { TbReceiptTax, TbFileInvoice, TbBuildingBank, TbShieldCheck } from "react-icons/tb";
import { apiGet, apiPost, apiPut } from "../services/api";
import "./NotasFiscais.css";

export default function NotasFiscais() {
  const [notas, setNotas] = useState([]);
  const [tutores, setTutores] = useState([]);
  const [stats, setStats] = useState({
    totalMes: 0,
    qtdMes: 0,
    qtdNfse: 0,
    totalNfse: 0,
    qtdNfce: 0,
    totalNfce: 0,
    qtdCanceladas: 0
  });

  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todas");
  const [filtroStatus, setFiltroStatus] = useState("todas");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  // Modais
  const [showNovaNotaModal, setShowNovaNotaModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [notaSelecionada, setNotaSelecionada] = useState(null);
  const [showDanfeModal, setShowDanfeModal] = useState(false);
  const [showCancelarModal, setShowCancelarModal] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");

  // Formulário de Nova Emissão
  const [formEmissao, setFormEmissao] = useState({
    tipo: "NFSE", // NFSE ou NFCE
    tutor_id: "",
    tutor_nome: "",
    tutor_cpf: "",
    tutor_email: "",
    tutor_telefone: "",
    descricao: "",
    valor: "",
    forma_pagamento: "Pix",
    aliquota_iss: 2.0,
    itens: [
      { descricao: "Consulta Clínica Geral Veterinária", quantidade: 1, valor_unitario: "" }
    ]
  });

  // Configurações Fiscais da Clínica
  const [configFiscal, setConfigFiscal] = useState({
    cnpj: "",
    razao_social: "",
    nome_fantasia: "",
    inscricao_municipal: "",
    inscricao_estadual: "",
    regime_tributario: "simples_nacional",
    provedor: "focus_nfe",
    ambiente: "homologacao",
    api_token: "",
    cnae: "7500-1/00",
    codigo_servico_municipal: "5.01",
    aliquota_iss: 2.0
  });

  // Carrega Notas e Métricas
  const carregarDados = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtroTipo !== "todas") params.append("tipo", filtroTipo);
      if (filtroStatus !== "todas") params.append("status", filtroStatus);
      if (dataInicio) params.append("dataInicio", dataInicio);
      if (dataFim) params.append("dataFim", dataFim);
      if (busca) params.append("busca", busca);

      const [resNotas, resStats] = await Promise.all([
        apiGet(`/notas-fiscais?${params.toString()}`),
        apiGet("/notas-fiscais/stats")
      ]);

      if (resNotas && resNotas.ok) {
        const dados = await resNotas.json();
        setNotas(Array.isArray(dados) ? dados : []);
      }

      if (resStats && resStats.ok) {
        const dadosStats = await resStats.json();
        setStats(dadosStats);
      }
    } catch (err) {
      console.error("Erro ao carregar dados fiscais:", err);
    } finally {
      setLoading(false);
    }
  };

  // Carrega Tutores para o Seletor de Tomador
  const carregarTutores = async () => {
    try {
      const res = await apiGet("/responsaveis");
      if (res && res.ok) {
        const dados = await res.json();
        setTutores(Array.isArray(dados) ? dados : []);
      }
    } catch (err) {
      console.error("Erro ao carregar tutores:", err);
    }
  };

  // Carrega Configurações Fiscais
  const carregarConfigFiscais = async () => {
    try {
      const res = await apiGet("/notas-fiscais/configuracoes");
      if (res && res.ok) {
        const dados = await res.json();
        setConfigFiscal(prev => ({ ...prev, ...dados }));
      }
    } catch (err) {
      console.error("Erro ao carregar configurações fiscais:", err);
    }
  };

  useEffect(() => {
    carregarDados();
    carregarTutores();
    carregarConfigFiscais();
  }, [filtroTipo, filtroStatus, dataInicio, dataFim]);

  // Recalcula valor total quando itens mudam
  const totalItensCalculado = useMemo(() => {
    return formEmissao.itens.reduce((acc, it) => {
      const q = parseFloat(it.quantidade) || 0;
      const v = parseFloat(it.valor_unitario) || 0;
      return acc + (q * v);
    }, 0);
  }, [formEmissao.itens]);

  const handleTutorChange = (e) => {
    const tutorId = e.target.value;
    if (!tutorId) {
      setFormEmissao(prev => ({
        ...prev,
        tutor_id: "",
        tutor_nome: "Consumidor Final",
        tutor_cpf: "",
        tutor_email: "",
        tutor_telefone: ""
      }));
      return;
    }

    const tutor = tutores.find(t => String(t.id) === String(tutorId));
    if (tutor) {
      setFormEmissao(prev => ({
        ...prev,
        tutor_id: tutor.id,
        tutor_nome: tutor.nome || "",
        tutor_cpf: tutor.cpf || "",
        tutor_email: tutor.email || "",
        tutor_telefone: tutor.celular || tutor.telefone || ""
      }));
    }
  };

  const handleAddItem = () => {
    setFormEmissao(prev => ({
      ...prev,
      itens: [
        ...prev.itens,
        { 
          descricao: prev.tipo === "NFSE" ? "Procedimento Clínico Adicional" : "Produto Veterinário", 
          quantidade: 1, 
          valor_unitario: "" 
        }
      ]
    }));
  };

  const handleRemoveItem = (index) => {
    if (formEmissao.itens.length <= 1) return;
    setFormEmissao(prev => ({
      ...prev,
      itens: prev.itens.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormEmissao(prev => {
      const novosItens = [...prev.itens];
      novosItens[index] = { ...novosItens[index], [field]: value };
      return { ...prev, itens: novosItens };
    });
  };

  // Submissão de Emissão de Nota
  const handleEmitirNota = async (e) => {
    e.preventDefault();
    const valorFinal = totalItensCalculado > 0 ? totalItensCalculado : parseFloat(formEmissao.valor);

    if (!valorFinal || valorFinal <= 0) {
      alert("Por favor, preencha o valor dos itens da nota.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formEmissao,
        valor: valorFinal,
        descricao: formEmissao.descricao || formEmissao.itens.map(i => `${i.quantidade}x ${i.descricao}`).join(" | ")
      };

      const res = await apiPost("/notas-fiscais", payload);
      if (res && res.ok) {
        const data = await res.json();
        alert(`Sucesso: ${data.message}`);
        setShowNovaNotaModal(false);
        // Reset form
        setFormEmissao({
          tipo: "NFSE",
          tutor_id: "",
          tutor_nome: "",
          tutor_cpf: "",
          tutor_email: "",
          tutor_telefone: "",
          descricao: "",
          valor: "",
          forma_pagamento: "Pix",
          aliquota_iss: 2.0,
          itens: [{ descricao: "Consulta Clínica Geral Veterinária", quantidade: 1, valor_unitario: "" }]
        });
        carregarDados();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao emitir nota fiscal.");
      }
    } catch (err) {
      console.error("Erro na emissão fiscal:", err);
      alert("Erro ao conectar ao servidor fiscal.");
    } finally {
      setLoading(false);
    }
  };

  // Salvar Configurações Fiscais
  const handleSalvarConfig = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await apiPut("/notas-fiscais/configuracoes", configFiscal);
      if (res && res.ok) {
        alert("Configurações fiscais da clínica salvas com sucesso!");
        setShowConfigModal(false);
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao salvar configurações fiscais.");
      }
    } catch (err) {
      console.error("Erro ao salvar config fiscal:", err);
      alert("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  // Cancelamento de Nota
  const handleConfirmarCancelamento = async () => {
    if (!notaSelecionada) return;
    if (!motivoCancelamento || motivoCancelamento.trim().length < 10) {
      alert("Informe uma justificativa de cancelamento com no mínimo 10 caracteres.");
      return;
    }

    try {
      setLoading(true);
      const res = await apiPost(`/notas-fiscais/${notaSelecionada.id}/cancelar`, { motivo: motivoCancelamento });
      if (res && res.ok) {
        alert("Nota fiscal cancelada com sucesso!");
        setShowCancelarModal(false);
        setMotivoCancelamento("");
        setNotaSelecionada(null);
        carregarDados();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao cancelar nota.");
      }
    } catch (err) {
      console.error("Erro ao cancelar nota:", err);
      alert("Erro de conexão ao cancelar.");
    } finally {
      setLoading(false);
    }
  };

  // Envio via WhatsApp
  const handleEnviarWhatsApp = (nota) => {
    const fone = nota.tutor_telefone ? nota.tutor_telefone.replace(/\D/g, '') : '';
    const texto = encodeURIComponent(
      `Olá, ${nota.tutor_nome || 'Cliente'}! Seguem os dados da sua Nota Fiscal (${nota.tipo}):\n\n` +
      `📄 Número: ${nota.numero} (Série ${nota.serie})\n` +
      `💰 Valor: R$ ${nota.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `🔑 Chave: ${nota.chave_acesso}\n` +
      `Status: Autorizada e Homologada.\n\nAgradecemos a confiança em nossos serviços veterinários!`
    );
    const link = fone ? `https://wa.me/55${fone}?text=${texto}` : `https://wa.me/?text=${texto}`;
    window.open(link, "_blank");
  };

  const formatarDinheiro = (v) => {
    return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const formatarData = (dt) => {
    if (!dt) return "-";
    try {
      const d = new Date(dt.replace(" ", "T"));
      return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dt;
    }
  };

  return (
    <div className="notas-fiscais-page reveal-fade">
      {/* CABEÇALHO */}
      <div className="page-header">
        <div className="header-info">
          <div className="v-header-badge">
            <TbShieldCheck size={16} /> <span>Módulo Fiscal Homologado</span>
          </div>
          <h1 className="page-title">Notas Fiscais (NFS-e & NFC-e)</h1>
          <p className="page-subtitle">Emissão e controle fiscal de serviços clínicos e produtos veterinários</p>
        </div>
        <div className="header-actions">
          <button className="btn-outline" onClick={() => setShowConfigModal(true)} title="Configurar Parâmetros Tributários">
            <FiSettings size={17} />
            <span>Configurações Fiscais</span>
          </button>
          <button className="v-btn-primary-glow" onClick={() => setShowNovaNotaModal(true)}>
            <FiPlus size={18} />
            <span>Nova Emissão Fiscal</span>
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="stats-grid">
        <div className="stat-card v-glass-panel reveal-up nf-stat-total" style={{ animationDelay: '0.05s' }}>
          <div className="stat-icon"><FiDollarSign size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Faturado em Notas (Mês)</span>
            <span className="stat-value">{formatarDinheiro(stats.totalMes)}</span>
            <small className="stat-subtext">{stats.qtdMes} notas autorizadas neste mês</small>
          </div>
        </div>

        <div className="stat-card v-glass-panel reveal-up nf-stat-nfse" style={{ animationDelay: '0.1s' }}>
          <div className="stat-icon"><TbFileInvoice size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">NFS-e (Serviços Clínicos)</span>
            <span className="stat-value">{stats.qtdNfse} notas</span>
            <small className="stat-subtext">Total: {formatarDinheiro(stats.totalNfse)}</small>
          </div>
        </div>

        <div className="stat-card v-glass-panel reveal-up nf-stat-nfce" style={{ animationDelay: '0.15s' }}>
          <div className="stat-icon"><TbReceiptTax size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">NFC-e (Produtos & Vendas)</span>
            <span className="stat-value">{stats.qtdNfce} notas</span>
            <small className="stat-subtext">Total: {formatarDinheiro(stats.totalNfce)}</small>
          </div>
        </div>

        <div className="stat-card v-glass-panel reveal-up nf-stat-canceladas" style={{ animationDelay: '0.2s' }}>
          <div className="stat-icon"><FiAlertCircle size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Canceladas / Estornos</span>
            <span className="stat-value">{stats.qtdCanceladas} notas</span>
            <small className="stat-subtext">Histórico de estornos fiscais</small>
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS E PESQUISA */}
      <div className="notas-card v-glass-panel reveal-up" style={{ animationDelay: '0.25s' }}>
        <div className="nf-filter-bar">
          <div className="search-wrapper">
            <FiSearch className="search-icon" />
            <input 
              className="search-input"
              placeholder="Buscar por número, tutor, CPF ou chave de acesso..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') carregarDados(); }}
            />
            {busca && (
              <button className="search-clear" onClick={() => { setBusca(""); carregarDados(); }}>
                <FiX size={16} />
              </button>
            )}
          </div>

          <div className="nf-type-pills">
            <button 
              className={`nf-pill ${filtroTipo === "todas" ? "active" : ""}`}
              onClick={() => setFiltroTipo("todas")}
            >
              Todas
            </button>
            <button 
              className={`nf-pill nf-pill-nfse ${filtroTipo === "NFSE" ? "active" : ""}`}
              onClick={() => setFiltroTipo("NFSE")}
            >
              NFS-e (Serviços)
            </button>
            <button 
              className={`nf-pill nf-pill-nfce ${filtroTipo === "NFCE" ? "active" : ""}`}
              onClick={() => setFiltroTipo("NFCE")}
            >
              NFC-e (Produtos)
            </button>
          </div>

          <div className="nf-extra-filters">
            <select 
              className="nf-select"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <option value="todas">Todos os Status</option>
              <option value="autorizada">Autorizadas</option>
              <option value="cancelada">Canceladas</option>
            </select>

            <input 
              type="date"
              className="nf-date-input"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              title="Data inicial"
            />
            <span className="nf-date-sep">até</span>
            <input 
              type="date"
              className="nf-date-input"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              title="Data final"
            />
          </div>
        </div>

        {/* TABELA DE NOTAS FISCAIS */}
        <div className="nf-table-container">
          <table className="nf-table">
            <thead>
              <tr>
                <th>Número / Série</th>
                <th>Tipo</th>
                <th>Tutor / Tomador</th>
                <th>Emissão</th>
                <th>Valor Total</th>
                <th>Pagamento</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "3rem" }}>
                    <div className="v-spinner" style={{ margin: "0 auto 1rem" }} />
                    <span style={{ color: "var(--text-muted)" }}>Consultando registros fiscais...</span>
                  </td>
                </tr>
              ) : notas.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div className="empty-state">
                      <TbFileInvoice size={48} />
                      <p>Nenhuma nota fiscal encontrada com os filtros selecionados.</p>
                      <button className="v-btn-primary-glow" onClick={() => setShowNovaNotaModal(true)}>
                        <FiPlus size={16} /> Emitir Primeira Nota
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                notas.map((n) => (
                  <tr key={n.id} className={n.status === 'cancelada' ? 'row-cancelada' : ''}>
                    <td>
                      <div className="nf-num-col">
                        <strong>Nº {n.numero}</strong>
                        <small>Série {n.serie || '1'}</small>
                      </div>
                    </td>
                    <td>
                      <span className={`badge-tipo ${n.tipo === 'NFSE' ? 'badge-nfse' : 'badge-nfce'}`}>
                        {n.tipo === 'NFSE' ? 'NFS-e Serviço' : 'NFC-e Produto'}
                      </span>
                    </td>
                    <td>
                      <div className="nf-tutor-col">
                        <strong>{n.tutor_nome || "Consumidor Final"}</strong>
                        <small>{n.tutor_cpf ? `CPF: ${n.tutor_cpf}` : "Não identificado"}</small>
                      </div>
                    </td>
                    <td>
                      <div className="nf-date-col">
                        <span>{formatarData(n.data_emissao)}</span>
                      </div>
                    </td>
                    <td>
                      <strong className="nf-valor">{formatarDinheiro(n.valor)}</strong>
                    </td>
                    <td>
                      <span className="nf-pagamento-pill">{n.forma_pagamento || "Pix"}</span>
                    </td>
                    <td>
                      <span className={`badge-status ${n.status === 'autorizada' ? 'badge-ok' : 'badge-danger'}`}>
                        <span className="pulse-dot" />
                        {n.status === 'autorizada' ? 'Autorizada' : 'Cancelada'}
                      </span>
                    </td>
                    <td>
                      <div className="nf-actions-group">
                        <button 
                          className="nf-action-btn btn-view" 
                          title="Visualizar Espelho / DANFE"
                          onClick={() => { setNotaSelecionada(n); setShowDanfeModal(true); }}
                        >
                          <FiEye size={15} />
                        </button>
                        <button 
                          className="nf-action-btn btn-zap" 
                          title="Enviar via WhatsApp"
                          onClick={() => handleEnviarWhatsApp(n)}
                        >
                          <FaWhatsapp size={15} />
                        </button>
                        {n.status !== 'cancelada' && (
                          <button 
                            className="nf-action-btn btn-cancel" 
                            title="Cancelar Nota Fiscal"
                            onClick={() => { setNotaSelecionada(n); setShowCancelarModal(true); }}
                          >
                            <FiSlash size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: NOVA EMISSÃO FISCAL */}
      {showNovaNotaModal && (
        <div className="modal-overlay" onClick={() => setShowNovaNotaModal(false)}>
          <div className="modal-content modal-emissao v-glass-heavy reveal-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <TbFileInvoice size={22} className="modal-title-icon" />
                <div>
                  <h2>Nova Emissão Fiscal</h2>
                  <p>Transmita NFS-e de serviços clínicos ou NFC-e de produtos</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowNovaNotaModal(false)}><FiX size={20} /></button>
            </div>

            <form onSubmit={handleEmitirNota} className="modal-body">
              {/* TIPO DE NOTA */}
              <div className="form-group">
                <label className="form-label">Tipo de Documento Fiscal</label>
                <div className="tipo-selector-grid">
                  <button
                    type="button"
                    className={`tipo-option-btn ${formEmissao.tipo === "NFSE" ? "selected" : ""}`}
                    onClick={() => setFormEmissao(prev => ({ ...prev, tipo: "NFSE" }))}
                  >
                    <TbFileInvoice size={20} />
                    <div>
                      <strong>NFS-e (Nota de Serviço)</strong>
                      <small>Consultas, cirurgias, exames, vacinas, banho e tosa</small>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`tipo-option-btn ${formEmissao.tipo === "NFCE" ? "selected" : ""}`}
                    onClick={() => setFormEmissao(prev => ({ ...prev, tipo: "NFCE" }))}
                  >
                    <TbReceiptTax size={20} />
                    <div>
                      <strong>NFC-e (Nota de Consumidor)</strong>
                      <small>Rações, medicamentos, coleiras e produtos de balcão</small>
                    </div>
                  </button>
                </div>
              </div>

              {/* TOMADOR / TUTOR */}
              <div className="form-row">
                <div className="form-group flex-1">
                  <label className="form-label">Tutor / Tomador Cadastrado</label>
                  <select className="form-input" value={formEmissao.tutor_id} onChange={handleTutorChange}>
                    <option value="">Consumidor Final (Não Cadastrado)</option>
                    {tutores.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.nome} {t.cpf ? `(CPF: ${t.cpf})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Nome Completo do Tomador</label>
                  <input 
                    className="form-input"
                    value={formEmissao.tutor_nome}
                    onChange={(e) => setFormEmissao(prev => ({ ...prev, tutor_nome: e.target.value }))}
                    placeholder="Nome na nota fiscal"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label className="form-label">CPF / CNPJ do Tomador</label>
                  <input 
                    className="form-input"
                    value={formEmissao.tutor_cpf}
                    onChange={(e) => setFormEmissao(prev => ({ ...prev, tutor_cpf: e.target.value }))}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">WhatsApp / Celular</label>
                  <input 
                    className="form-input"
                    value={formEmissao.tutor_telefone}
                    onChange={(e) => setFormEmissao(prev => ({ ...prev, tutor_telefone: e.target.value }))}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">E-mail para Envio do XML</label>
                  <input 
                    type="email"
                    className="form-input"
                    value={formEmissao.tutor_email}
                    onChange={(e) => setFormEmissao(prev => ({ ...prev, tutor_email: e.target.value }))}
                    placeholder="tutor@exemplo.com"
                  />
                </div>
              </div>

              {/* ITENS DA NOTA */}
              <div className="nf-items-section">
                <div className="nf-items-header">
                  <label className="form-label" style={{ marginBottom: 0 }}>Itens & Discriminação</label>
                  <button type="button" className="btn-add-item" onClick={handleAddItem}>
                    <FiPlus size={14} /> Adicionar Item
                  </button>
                </div>

                <div className="nf-items-list">
                  {formEmissao.itens.map((item, idx) => (
                    <div key={idx} className="nf-item-row">
                      <div className="nf-item-desc">
                        <input 
                          className="form-input"
                          placeholder="Descrição do serviço ou produto..."
                          value={item.descricao}
                          onChange={(e) => handleItemChange(idx, "descricao", e.target.value)}
                          required
                        />
                      </div>
                      <div className="nf-item-qtd">
                        <input 
                          type="number"
                          min="1"
                          className="form-input"
                          placeholder="Qtd"
                          value={item.quantidade}
                          onChange={(e) => handleItemChange(idx, "quantidade", e.target.value)}
                          required
                        />
                      </div>
                      <div className="nf-item-valor">
                        <input 
                          type="number"
                          step="0.01"
                          min="0.01"
                          className="form-input"
                          placeholder="Valor (R$)"
                          value={item.valor_unitario}
                          onChange={(e) => handleItemChange(idx, "valor_unitario", e.target.value)}
                          required
                        />
                      </div>
                      {formEmissao.itens.length > 1 && (
                        <button type="button" className="nf-item-remove" onClick={() => handleRemoveItem(idx)}>
                          <FiTrash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* FORMA DE PAGAMENTO E TOTAL */}
              <div className="form-row" style={{ marginTop: "1rem" }}>
                <div className="form-group flex-1">
                  <label className="form-label">Forma de Pagamento</label>
                  <select 
                    className="form-input"
                    value={formEmissao.forma_pagamento}
                    onChange={(e) => setFormEmissao(prev => ({ ...prev, forma_pagamento: e.target.value }))}
                  >
                    <option value="Pix">Pix</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Boleto">Boleto</option>
                  </select>
                </div>

                {formEmissao.tipo === "NFSE" && (
                  <div className="form-group" style={{ width: "140px" }}>
                    <label className="form-label">Alíquota ISS (%)</label>
                    <input 
                      type="number"
                      step="0.1"
                      className="form-input"
                      value={formEmissao.aliquota_iss}
                      onChange={(e) => setFormEmissao(prev => ({ ...prev, aliquota_iss: e.target.value }))}
                    />
                  </div>
                )}

                <div className="form-group flex-1 nf-total-box">
                  <span className="nf-total-label">Total da Nota</span>
                  <strong className="nf-total-value">
                    {formatarDinheiro(totalItensCalculado)}
                  </strong>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-outline" onClick={() => setShowNovaNotaModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="v-btn-primary-glow" disabled={loading}>
                  {loading ? "Transmitindo à Prefeitura/SEFAZ..." : "Emitir e Transmitir Nota"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURAÇÕES FISCAIS */}
      {showConfigModal && (
        <div className="modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div className="modal-content modal-config v-glass-heavy reveal-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <FiSettings size={22} className="modal-title-icon" />
                <div>
                  <h2>Configurações Fiscais da Clínica</h2>
                  <p>Parâmetros tributários e integração para emissão em tempo real</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowConfigModal(false)}><FiX size={20} /></button>
            </div>

            <form onSubmit={handleSalvarConfig} className="modal-body">
              <div className="form-row">
                <div className="form-group flex-1">
                  <label className="form-label">CNPJ da Clínica</label>
                  <input 
                    className="form-input" 
                    value={configFiscal.cnpj} 
                    onChange={(e) => setConfigFiscal(prev => ({ ...prev, cnpj: e.target.value }))}
                    placeholder="00.000.000/0001-00"
                    required
                  />
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Razão Social</label>
                  <input 
                    className="form-input" 
                    value={configFiscal.razao_social} 
                    onChange={(e) => setConfigFiscal(prev => ({ ...prev, razao_social: e.target.value }))}
                    placeholder="Nome empresarial registrado"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label className="form-label">Inscrição Municipal (IM)</label>
                  <input 
                    className="form-input" 
                    value={configFiscal.inscricao_municipal} 
                    onChange={(e) => setConfigFiscal(prev => ({ ...prev, inscricao_municipal: e.target.value }))}
                    placeholder="Exigido para NFS-e"
                  />
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Inscrição Estadual (IE)</label>
                  <input 
                    className="form-input" 
                    value={configFiscal.inscricao_estadual} 
                    onChange={(e) => setConfigFiscal(prev => ({ ...prev, inscricao_estadual: e.target.value }))}
                    placeholder="Exigido para NFC-e"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label className="form-label">Regime Tributário</label>
                  <select 
                    className="form-input"
                    value={configFiscal.regime_tributario}
                    onChange={(e) => setConfigFiscal(prev => ({ ...prev, regime_tributario: e.target.value }))}
                  >
                    <option value="simples_nacional">Simples Nacional (ME / EPP)</option>
                    <option value="mei">Microempreendedor Individual (MEI)</option>
                    <option value="lucro_presumido">Lucro Presumido</option>
                    <option value="lucro_real">Lucro Real</option>
                  </select>
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">CNAE Principal</label>
                  <input 
                    className="form-input" 
                    value={configFiscal.cnae} 
                    onChange={(e) => setConfigFiscal(prev => ({ ...prev, cnae: e.target.value }))}
                    placeholder="7500-1/00"
                  />
                </div>
                <div className="form-group" style={{ width: "130px" }}>
                  <label className="form-label">Alíquota ISS (%)</label>
                  <input 
                    type="number"
                    step="0.1"
                    className="form-input" 
                    value={configFiscal.aliquota_iss} 
                    onChange={(e) => setConfigFiscal(prev => ({ ...prev, aliquota_iss: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label className="form-label">Provedor de Emissão Fiscal</label>
                  <select 
                    className="form-input"
                    value={configFiscal.provedor}
                    onChange={(e) => setConfigFiscal(prev => ({ ...prev, provedor: e.target.value }))}
                  >
                    <option value="focus_nfe">Focus NFe (NFS-e & NFC-e Nacional)</option>
                    <option value="nuvem_fiscal">Nuvem Fiscal</option>
                    <option value="asaas_fiscal">Asaas Fiscal Integrado</option>
                    <option value="simulador">Simulador VetCare (Homologação)</option>
                  </select>
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Ambiente de Operação</label>
                  <select 
                    className="form-input"
                    value={configFiscal.ambiente}
                    onChange={(e) => setConfigFiscal(prev => ({ ...prev, ambiente: e.target.value }))}
                  >
                    <option value="homologacao">Homologação / Testes (Sem valor fiscal)</option>
                    <option value="producao">Produção (Validade Jurídica Real)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Token de Acesso / API Key da Emissora</label>
                <input 
                  type="password"
                  className="form-input" 
                  value={configFiscal.api_token} 
                  onChange={(e) => setConfigFiscal(prev => ({ ...prev, api_token: e.target.value }))}
                  placeholder="Chave de API gerada no provedor fiscal"
                />
                <small style={{ color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                  Em ambiente de homologação, o sistema gera chaves e protocolos SEFAZ para validação da sua equipe.
                </small>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-outline" onClick={() => setShowConfigModal(false)}>
                  Fechar
                </button>
                <button type="submit" className="v-btn-primary-glow" disabled={loading}>
                  Salvar Parâmetros Fiscais
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VISUALIZAR ESPELHO / DANFE / NFS-E */}
      {showDanfeModal && notaSelecionada && (
        <div className="modal-overlay" onClick={() => setShowDanfeModal(false)}>
          <div className="modal-content modal-danfe v-glass-heavy reveal-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header no-print">
              <div className="modal-title-group">
                <FiFileText size={22} className="modal-title-icon" />
                <div>
                  <h2>Espelho do Documento Fiscal</h2>
                  <p>{notaSelecionada.tipo === 'NFSE' ? 'Nota Fiscal de Serviços Eletrônica' : 'Documento Auxiliar da NFC-e'}</p>
                </div>
              </div>
              <div className="modal-actions-right">
                <button className="btn-outline" onClick={() => window.print()}>
                  <FiPrinter size={16} /> Imprimir / Salvar PDF
                </button>
                <button className="modal-close" onClick={() => setShowDanfeModal(false)}><FiX size={20} /></button>
              </div>
            </div>

            <div className="danfe-paper" id="printable-danfe">
              {/* TOPO DANFE */}
              <div className="danfe-header-grid">
                <div className="danfe-brand">
                  <h2>{configFiscal.nome_fantasia || "VET CARE CLÍNICA VETERINÁRIA"}</h2>
                  <p><strong>{configFiscal.razao_social || "Vet Care Serviços Médicos Veterinários LTDA"}</strong></p>
                  <p>CNPJ: {configFiscal.cnpj || "00.000.000/0001-00"} • IM: {configFiscal.inscricao_municipal || "Isento"}</p>
                  <p>Medicina Veterinária, Cirurgias, Diagnósticos e Saúde Animal</p>
                </div>
                <div className="danfe-badge-box">
                  <span className="danfe-doc-title">
                    {notaSelecionada.tipo === 'NFSE' ? 'NFS-e PREFEITURA' : 'DANFE NFC-e SEFAZ'}
                  </span>
                  <strong className="danfe-num">Nº {notaSelecionada.numero}</strong>
                  <span>Série: {notaSelecionada.serie || '1'}</span>
                  <span>Emissão: {formatarData(notaSelecionada.data_emissao)}</span>
                  <span className={`danfe-status-stamp ${notaSelecionada.status}`}>
                    {notaSelecionada.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* CHAVE DE ACESSO */}
              <div className="danfe-chave-box">
                <span className="chave-title">CHAVE DE ACESSO FISCAL</span>
                <span className="chave-code">{notaSelecionada.chave_acesso}</span>
                <div className="chave-barcode-mock" />
              </div>

              {/* DADOS DO TOMADOR */}
              <div className="danfe-section-block">
                <div className="danfe-block-title">DADOS DO TOMADOR / CLIENTE</div>
                <div className="danfe-info-row">
                  <div><strong>Nome:</strong> {notaSelecionada.tutor_nome || "Consumidor Final"}</div>
                  <div><strong>CPF/CNPJ:</strong> {notaSelecionada.tutor_cpf || "Não Informado"}</div>
                  <div><strong>Telefone:</strong> {notaSelecionada.tutor_telefone || "-"}</div>
                </div>
              </div>

              {/* DISCRIMINAÇÃO DOS SERVIÇOS OU ITENS */}
              <div className="danfe-section-block">
                <div className="danfe-block-title">DISCRIMINAÇÃO DOS SERVIÇOS E MERCADORIAS</div>
                <div className="danfe-desc-content">
                  {notaSelecionada.descricao}
                </div>
              </div>

              {/* TOTAIS E RETENÇÕES */}
              <div className="danfe-totais-grid">
                <div className="total-cell">
                  <small>Forma de Pagamento</small>
                  <strong>{notaSelecionada.forma_pagamento || 'Pix'}</strong>
                </div>
                <div className="total-cell">
                  <small>Ambiente</small>
                  <strong>Homologação Autorizada</strong>
                </div>
                <div className="total-cell highlight">
                  <small>VALOR TOTAL DA NOTA</small>
                  <strong>{formatarDinheiro(notaSelecionada.valor)}</strong>
                </div>
              </div>

              {/* PROTOCOLO SEFAZ / PREFEITURA */}
              <div className="danfe-footer-legal">
                <p><strong>Mensagem do Sistema:</strong> {notaSelecionada.mensagem_retorno}</p>
                {notaSelecionada.motivo_cancelamento && (
                  <p style={{ color: "#ef4444", marginTop: "4px" }}>
                    <strong>Motivo de Cancelamento:</strong> {notaSelecionada.motivo_cancelamento}
                  </p>
                )}
                <p style={{ marginTop: "6px", fontSize: "0.75rem", color: "#64748b" }}>
                  Documento emitido via VetCare Cloud • Plataforma de Gestão Veterinária e Integração Fiscal
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR CANCELAMENTO */}
      {showCancelarModal && notaSelecionada && (
        <div className="modal-overlay" onClick={() => setShowCancelarModal(false)}>
          <div className="modal-content modal-cancelar v-glass-heavy reveal-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <FiSlash size={22} className="modal-title-icon text-danger" />
                <div>
                  <h2>Cancelar Nota Fiscal Nº {notaSelecionada.numero}</h2>
                  <p>Esta ação estornará o documento perante a Prefeitura / SEFAZ</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowCancelarModal(false)}><FiX size={20} /></button>
            </div>

            <div className="modal-body">
              <div className="cancel-alert-box">
                <FiAlertCircle size={20} />
                <span>
                  Atenção: O cancelamento é irreversível. O tomador (<strong>{notaSelecionada.tutor_nome}</strong>) será notificado e o valor de <strong>{formatarDinheiro(notaSelecionada.valor)}</strong> será estornado do faturamento fiscal.
                </span>
              </div>

              <div className="form-group" style={{ marginTop: "1rem" }}>
                <label className="form-label">Justificativa do Cancelamento (Mínimo 10 caracteres)</label>
                <textarea
                  className="form-input"
                  rows="3"
                  placeholder="Ex: Erro no preenchimento dos dados do cliente ou desistência do serviço..."
                  value={motivoCancelamento}
                  onChange={(e) => setMotivoCancelamento(e.target.value)}
                  required
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-outline" onClick={() => setShowCancelarModal(false)}>
                  Voltar
                </button>
                <button 
                  type="button" 
                  className="btn-danger-action" 
                  onClick={handleConfirmarCancelamento}
                  disabled={loading}
                >
                  {loading ? "Processando..." : "Confirmar Cancelamento Fiscal"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
