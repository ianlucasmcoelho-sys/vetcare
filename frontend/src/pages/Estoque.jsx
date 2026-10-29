import { formatDate } from "../utils/date";
import React, { useState, useEffect } from "react";
import { 
  FiPlus, FiSearch, FiX, FiBox, FiAlertTriangle, FiTag, 
  FiShoppingBag, FiEdit2, FiTrash2, FiPackage, FiDollarSign,
  FiCalendar, FiInfo, FiRefreshCw, FiArrowUpRight, FiArrowDownLeft,
  FiClock, FiList, FiTrendingUp
} from "react-icons/fi";
import { apiGet, apiPost, apiPut, apiDelete } from "../services/api";
import "./Estoque.css";

export default function Estoque() {
  const [activeTab, setActiveTab] = useState("produtos");
  const [showModal, setShowModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [estoque, setEstoque] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroRapido, setFiltroRapido] = useState("todos");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalTab, setModalTab] = useState("dados");

  const [form, setForm] = useState({
    nome: "", categoria: "Medicamento", quantidade: 0, unidade: "un",
    precoVenda: "", precoCusto: "", margemLucro: "", estoqueMinimo: 5,
    fornecedor: "", fabricante: "", lote: "", dataExpiracao: "", 
    codigoBarras: "", observacoes: ""
  });

  const [moveForm, setMoveForm] = useState({
    produto_id: "", tipo: "entrada", quantidade: "", motivo: ""
  });

  const categorias = ["Medicamento", "Vacina", "Higiene", "Alimento", "Acessório", "Insumo"];

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [prodRes, histRes] = await Promise.all([
        apiGet("/servicos"),
        apiGet("/estoque/historico")
      ]);
      
      if (prodRes.ok) {
        const dados = await prodRes.json();
        setEstoque(Array.isArray(dados) ? dados : []);
      }
      if (histRes.ok) {
        const histDados = await histRes.json();
        setHistorico(Array.isArray(histDados) ? histDados : []);
      }
    } catch (error) {
      console.error("Erro ao carregar dados de estoque:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const newForm = { ...prev, [name]: value };
      
      // Cálculo automático de preço/margem
      if (name === "precoCusto" || name === "margemLucro") {
        const custo = parseFloat(name === "precoCusto" ? value : prev.precoCusto) || 0;
        const margem = parseFloat(name === "margemLucro" ? value : prev.margemLucro) || 0;
        if (custo > 0 && margem > 0) {
          newForm.precoVenda = (custo * (1 + margem / 100)).toFixed(2);
        }
      } else if (name === "precoVenda") {
        const venda = parseFloat(value) || 0;
        const custo = parseFloat(prev.precoCusto) || 0;
        if (venda > 0 && custo > 0) {
          newForm.margemLucro = (((venda / custo) - 1) * 100).toFixed(2);
        }
      }
      
      return newForm;
    });
  };

  const handleMoveChange = (e) => {
    const { name, value } = e.target;
    setMoveForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = editId 
        ? await apiPut(`/servicos/${editId}`, form)
        : await apiPost("/servicos", form);
      
      if (response && response.ok) {
        setShowModal(false);
        resetForm();
        carregarDados();
      }
    } catch (err) { 
      alert("Erro ao salvar item."); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleMoveSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await apiPost("/estoque/movimentar", moveForm);
      if (response.ok) {
        setShowMoveModal(false);
        setMoveForm({ produto_id: "", tipo: "entrada", quantidade: "", motivo: "" });
        carregarDados();
      } else {
        const error = await response.json();
        alert(error.error || "Erro ao movimentar estoque");
      }
    } catch (err) {
      alert("Erro na conexão");
    } finally {
      setLoading(false);
    }
  };

  const deletarItem = async (id) => {
    if (window.confirm("Deseja excluir este item permanentemente?")) {
      try {
        const response = await apiDelete(`/servicos/${id}`);
        if (response.ok) carregarDados();
      } catch (error) { console.error("Erro ao deletar:", error); }
    }
  };

  const resetForm = () => {
    setForm({
      nome: "", categoria: "Medicamento", quantidade: 0, unidade: "un",
      precoVenda: "", precoCusto: "", margemLucro: "", estoqueMinimo: 5,
      fornecedor: "", fabricante: "", lote: "", dataExpiracao: "", 
      codigoBarras: "", observacoes: ""
    });
    setEditId(null);
  };

  const abrirEdicao = (item) => {
    setForm({
      nome: item.nome, categoria: item.categoria, quantidade: item.quantidade,
      unidade: item.unidade, precoVenda: item.precoVenda, 
      precoCusto: item.precoCusto || "", 
      margemLucro: item.margemLucro || "",
      estoqueMinimo: item.estoqueMinimo || 5,
      fornecedor: item.fornecedor || "",
      fabricante: item.fabricante || "",
      lote: item.lote || "",
      dataExpiracao: item.dataExpiracao || "", 
      codigoBarras: item.codigoBarras || "",
      observacoes: item.observacoes || ""
    });
    setEditId(item.id);
    setSelectedProduct(item);
    setModalTab("dados");
    setShowModal(true);
  };

  const getProductHistory = (id) => {
    return historico.filter(h => h.produto_id === id);
  };

  const abrirMovimentacao = (item) => {
    setSelectedProduct(item);
    setMoveForm(prev => ({ ...prev, produto_id: item.id, quantidade: "" }));
    setShowMoveModal(true);
    setTimeout(() => {
      document.getElementsByName("quantidade")[0]?.focus();
    }, 100);
  };

  const isExpirado = (dataExpiracao) => {
    if (!dataExpiracao) return false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return new Date(dataExpiracao) < hoje;
  };

  const isNearExpiration = (data) => {
    if (!data) return false;
    const hoje = new Date();
    const venc = new Date(data);
    const diff = (venc - hoje) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 30;
  };

  const itensFiltrados = estoque.filter(item => {
    const matchBusca = (item.nome?.toLowerCase().includes(busca.toLowerCase())) || 
                       (item.codigoBarras?.includes(busca));
    const matchCategoria = filtroCategoria === "todas" || item.categoria === filtroCategoria;
    
    let matchRapido = true;
    if (filtroRapido === "baixo") matchRapido = item.quantidade <= (item.estoqueMinimo || 5);
    if (filtroRapido === "vencendo") matchRapido = isNearExpiration(item.dataExpiracao);
    if (filtroRapido === "vencidos") matchRapido = isExpirado(item.dataExpiracao);
    
    return matchBusca && matchCategoria && matchRapido;
  });

  const stats = {
    total: estoque.length,
    baixo: estoque.filter(i => i.quantidade <= (i.estoqueMinimo || 5)).length,
    vencidos: estoque.filter(i => isExpirado(i.dataExpiracao)).length,
    vencendo: estoque.filter(i => isNearExpiration(i.dataExpiracao)).length,
    valorTotal: estoque.reduce((acc, curr) => {
      const preco = parseFloat(String(curr.precoVenda).replace(',', '.')) || 0;
      return acc + (preco * curr.quantidade);
    }, 0)
  };

  return (
    <div className="estoque-container reveal-fade">
      <div className="page-header">
        <div className="header-info">
          <h1 className="page-title">Gestão de Inventário</h1>
          <p className="page-subtitle">Controle de insumos, medicamentos e auditoria de estoque</p>
        </div>
        <div className="header-actions">
          <button className="v-btn-primary-glow" onClick={() => { resetForm(); setShowModal(true); }}>
            <FiPlus /> Novo Produto
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card v-glass-panel reveal-up" onClick={() => setFiltroRapido("todos")} style={{animationDelay: '0.1s'}}>
          <div className="stat-icon"><FiBox /></div>
          <div className="stat-info">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Produtos Ativos</span>
          </div>
        </div>
        <div className={`stat-card v-glass-panel reveal-up ${stats.baixo > 0 ? 'warning' : ''}`} onClick={() => setFiltroRapido("baixo")} style={{animationDelay: '0.2s'}}>
          <div className="stat-icon"><FiAlertTriangle /></div>
          <div className="stat-info">
            <span className="stat-value">{stats.baixo}</span>
            <span className="stat-label">Estoque Baixo</span>
          </div>
        </div>
        <div className={`stat-card v-glass-panel reveal-up ${stats.vencendo > 0 ? 'info' : ''}`} onClick={() => setFiltroRapido("vencendo")} style={{animationDelay: '0.3s'}}>
          <div className="stat-icon"><FiClock /></div>
          <div className="stat-info">
            <span className="stat-value">{stats.vencendo}</span>
            <span className="stat-label">Vencendo (30 dias)</span>
          </div>
        </div>
        <div className={`stat-card v-glass-panel reveal-up ${stats.vencidos > 0 ? 'danger' : ''}`} onClick={() => setFiltroRapido("vencidos")} style={{animationDelay: '0.4s'}}>
          <div className="stat-icon"><FiCalendar /></div>
          <div className="stat-info">
            <span className="stat-value">{stats.vencidos}</span>
            <span className="stat-label">Itens Vencidos</span>
          </div>
        </div>
      </div>

      <div className="estoque-card reveal-up" style={{animationDelay: '0.5s'}}>
        <div className="tabs-header">
          <div className="tabs-container">
            <button className={`tab-btn ${activeTab === "produtos" ? "active" : ""}`} onClick={() => setActiveTab("produtos")}>
              <FiList /> Produtos
            </button>
            <button className={`tab-btn ${activeTab === "historico" ? "active" : ""}`} onClick={() => setActiveTab("historico")}>
              <FiClock /> Histórico
            </button>
          </div>
          {activeTab === "produtos" && (
            <div className="header-filters">
              <select className="filter-select" value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
                <option value="todas">Todas Categorias</option>
                {categorias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="search-wrapper">
                <FiSearch className="search-icon" />
                <input className="search-input" placeholder="Buscar por nome ou código..." value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {filtroRapido !== "todos" && (
          <div className="active-filter-bar">
            <span>Filtro ativo: <strong>{filtroRapido === "baixo" ? "Estoque Baixo" : filtroRapido === "vencendo" ? "Vencendo em 30 dias" : "Vencidos"}</strong></span>
            <button className="clear-filter" onClick={() => setFiltroRapido("todos")}><FiX /> Limpar</button>
          </div>
        )}

        <div className="tab-content">
          {activeTab === "produtos" ? (
            <div className="produtos-grid">
              {itensFiltrados.map(item => (
                <div key={item.id} className={`estoque-card-item v-glass-panel ${isExpirado(item.dataExpiracao) ? 'expired' : isNearExpiration(item.dataExpiracao) ? 'near-expiry' : ''}`} style={{animationDelay: `${0.1 + (0.05 * (item.id % 10))}s`}}>
                  <div className="card-header">
                    <div className="product-avatar">
                      {item.categoria === "Medicamento" ? <FiPackage /> : item.categoria === "Vacina" ? <FiRefreshCw /> : <FiBox />}
                    </div>
                    <div className="product-info" style={{ flex: 1 }}>
                      <div className="title-row">
                        <h3>{item.nome}</h3>
                        {item.quantidade <= (item.estoqueMinimo || 5) && <FiAlertTriangle className="alert-icon" title="Estoque Baixo" />}
                      </div>
                      <div className="subtitle-row">
                        <span className="badge-categoria">{item.categoria}</span>
                        {item.lote && <span className="badge-lote">Lote: {item.lote}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="data-row main-data">
                      <span className="label">SALDO ATUAL</span>
                      <span className={`value ${item.quantidade <= (item.estoqueMinimo || 5) ? "text-danger" : "text-success"}`}>
                        {item.quantidade} {item.unidade}
                      </span>
                    </div>
                    <div className="data-grid-compact">
                      <div className="data-item">
                        <span className="label">VENDA</span>
                        <span className="value">R$ {item.precoVenda}</span>
                      </div>
                      <div className="data-item">
                        <span className="label">CUSTO</span>
                        <span className="value">R$ {item.precoCusto || "0,00"}</span>
                      </div>
                    </div>
                    {item.fornecedor && (
                      <div className="data-row">
                        <span className="label">FORNECEDOR</span>
                        <span className="value truncate">{item.fornecedor}</span>
                      </div>
                    )}
                    {item.dataExpiracao && (
                      <div className="data-row">
                        <span className="label">VENCIMENTO</span>
                        <span className={`value ${isExpirado(item.dataExpiracao) ? "text-danger" : isNearExpiration(item.dataExpiracao) ? "text-warning" : ""}`}>
                          {formatDate(item.dataExpiracao)}
                        </span>
                      </div>
                    )}
                  </div>
                    <div className="card-footer">
                      <div className="action-buttons">
                        <button onClick={() => abrirMovimentacao(item)} className="action-btn confirm-btn" style={{ flex: 1 }}>
                          <FiRefreshCw size={14} /> Movimentar
                        </button>
                      </div>
                      <div className="action-icons">
                        <button onClick={() => abrirEdicao(item)} className="action-icon" title="Editar"><FiEdit2 size={14} /></button>
                        <button onClick={() => deletarItem(item.id)} className="action-icon delete-btn" title="Excluir"><FiTrash2 size={14} /></button>
                      </div>
                    </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="history-list">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Data/Hora</th>
                    <th>Produto</th>
                    <th>Tipo</th>
                    <th>Qtd</th>
                    <th>Motivo</th>
                    <th>Usuário</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map(h => (
                    <tr key={h.id}>
                      <td>{new Date(h.created_at).toLocaleString('pt-BR')}</td>
                      <td><strong>{h.produto_nome}</strong></td>
                      <td>
                        <span className={`move-badge ${h.tipo}`}>
                          {h.tipo === "entrada" ? <FiArrowDownLeft /> : <FiArrowUpRight />}
                          {h.tipo === "entrada" ? "Entrada" : "Saída"}
                        </span>
                      </td>
                      <td>{h.quantidade}</td>
                      <td>{h.motivo || "-"}</td>
                      <td>{h.usuario_nome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Cadastro/Edição */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content large-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-main">
                <h2 className="modal-title">
                  {editId ? <><FiEdit2 /> Editar: {form.nome}</> : <><FiPlus /> Novo Produto</>}
                </h2>
                <button className="modal-close" onClick={() => setShowModal(false)}><FiX /></button>
              </div>
              
              {editId && (
                <div className="modal-tabs">
                  <button className={`modal-tab ${modalTab === "dados" ? "active" : ""}`} onClick={() => setModalTab("dados")}>
                    <FiInfo /> Informações Gerais
                  </button>
                  <button className={`modal-tab ${modalTab === "historico" ? "active" : ""}`} onClick={() => setModalTab("historico")}>
                    <FiClock /> Histórico do Item
                  </button>
                </div>
              )}
            </div>

            {modalTab === "dados" ? (
              <form onSubmit={handleSubmit} className="modal-form">
                <div className="form-scroll">
                  {/* Seção 1: Identificação */}
                  <div className="form-section">
                    <h3 className="section-title"><FiTag /> Identificação Geral</h3>
                    <div className="form-grid">
                      <div className="input-group full-width">
                        <label className="input-label">NOME DO PRODUTO *</label>
                        <input name="nome" value={form.nome} onChange={handleChange} className="form-input" required placeholder="Ex: Vacina V10, Ração X 15kg..." />
                      </div>
                      <div className="input-group">
                        <label className="input-label">CATEGORIA</label>
                        <select name="categoria" value={form.categoria} onChange={handleChange} className="form-input">
                          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="input-group">
                        <label className="input-label">UNIDADE</label>
                        <input name="unidade" list="unidades-list" value={form.unidade} onChange={handleChange} className="form-input" placeholder="Ex: un, dose, kg, ml..." />
                        <datalist id="unidades-list">
                          <option value="un" />
                          <option value="dose" />
                          <option value="kg" />
                          <option value="ml" />
                          <option value="pct" />
                        </datalist>
                      </div>
                      <div className="input-group full-width">
                        <label className="input-label">CÓDIGO DE BARRAS / SKU</label>
                        <input name="codigoBarras" value={form.codigoBarras} onChange={handleChange} className="form-input" placeholder="Use o leitor ou digite o código..." />
                      </div>
                    </div>
                  </div>

                  {/* Seção 2: Controle de Estoque */}
                  <div className="form-section">
                    <h3 className="section-title"><FiBox /> Controle e Rastreabilidade</h3>
                    <div className="form-grid">
                      <div className="input-group">
                        <label className="input-label">QUANTIDADE ATUAL</label>
                        <input type="number" name="quantidade" value={form.quantidade} onChange={handleChange} className="form-input highlight" />
                      </div>
                      <div className="input-group">
                        <label className="input-label">ESTOQUE MÍNIMO</label>
                        <input type="number" name="estoqueMinimo" value={form.estoqueMinimo} onChange={handleChange} className="form-input" />
                      </div>
                      <div className="input-group">
                        <label className="input-label">LOTE</label>
                        <input name="lote" value={form.lote} onChange={handleChange} className="form-input" placeholder="Ex: ABC123" />
                      </div>
                      <div className="input-group">
                        <label className="input-label">DATA DE VALIDADE</label>
                        <input type="date" name="dataExpiracao" value={form.dataExpiracao} onChange={handleChange} className="form-input" />
                      </div>
                    </div>
                  </div>

                  {/* Seção 3: Financeiro */}
                  <div className="form-section financial-section">
                    <h3 className="section-title"><FiDollarSign /> Financeiro e Margem</h3>
                    <div className="form-grid">
                      <div className="input-group">
                        <label className="input-label">PREÇO DE CUSTO (R$)</label>
                        <input name="precoCusto" value={form.precoCusto} onChange={handleChange} className="form-input" placeholder="0.00" />
                      </div>
                      <div className="input-group">
                        <label className="input-label">MARGEM DE LUCRO (%)</label>
                        <input name="margemLucro" value={form.margemLucro} onChange={handleChange} className="form-input" placeholder="0" />
                      </div>
                      <div className="input-group">
                        <label className="input-label">PREÇO DE VENDA (R$)</label>
                        <input name="precoVenda" value={form.precoVenda} onChange={handleChange} className="form-input highlight-success" placeholder="0.00" />
                      </div>
                      <div className="profit-indicator">
                        <span>Lucro Estimado:</span>
                        <strong>R$ {(parseFloat(form.precoVenda) - parseFloat(form.precoCusto || 0)).toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Seção 4: Extras */}
                  <div className="form-section">
                    <h3 className="section-title"><FiShoppingBag /> Origem e Notas</h3>
                    <div className="form-grid">
                      <div className="input-group">
                        <label className="input-label">FORNECEDOR</label>
                        <input name="fornecedor" value={form.fornecedor} onChange={handleChange} className="form-input" />
                      </div>
                      <div className="input-group">
                        <label className="input-label">FABRICANTE</label>
                        <input name="fabricante" value={form.fabricante} onChange={handleChange} className="form-input" />
                      </div>
                      <div className="input-group full-width">
                        <label className="input-label">OBSERVAÇÕES ADICIONAIS</label>
                        <textarea name="observacoes" value={form.observacoes} onChange={handleChange} className="form-textarea" rows="2" placeholder="Informações extras sobre o produto..." />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                  <button type="submit" className="v-btn-primary-glow" disabled={loading}>{loading ? "Processando..." : editId ? "Atualizar Produto" : "Cadastrar Produto"}</button>
                </div>
              </form>
            ) : (
              <div className="modal-history-view">
                <div className="history-scroll">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Operação</th>
                        <th>Qtd</th>
                        <th>Motivo</th>
                        <th>Usuário</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getProductHistory(editId).map(h => (
                        <tr key={h.id}>
                          <td>{formatDate(h.created_at)}</td>
                          <td>
                            <span className={`move-badge ${h.tipo}`}>
                              {h.tipo === "entrada" ? <FiArrowDownLeft /> : <FiArrowUpRight />}
                              {h.tipo === "entrada" ? "Entrada" : "Saída"}
                            </span>
                          </td>
                          <td>{h.quantidade}</td>
                          <td>{h.motivo || "-"}</td>
                          <td>{h.usuario_nome}</td>
                        </tr>
                      ))}
                      {getProductHistory(editId).length === 0 && (
                        <tr>
                          <td colSpan="5" className="text-center">Nenhuma movimentação registrada para este item.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="modal-footer">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Fechar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Movimentação */}
      {showMoveModal && (
        <div className="modal-overlay" onClick={() => setShowMoveModal(false)}>
          <div className="modal-content move-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title"><FiRefreshCw /> Movimentar Estoque</h2>
              <button className="modal-close" onClick={() => setShowMoveModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleMoveSubmit} className="modal-form">
              <div className="form-scroll">
                <div className="move-summary">
                  <div className="product-tag"><FiBox /> {selectedProduct?.nome}</div>
                  <div className="current-stock">Saldo: <strong>{selectedProduct?.quantidade} {selectedProduct?.unidade}</strong></div>
                </div>
                <div className="form-grid">
                  <div className="input-group">
                    <label className="input-label">OPERAÇÃO</label>
                    <select name="tipo" value={moveForm.tipo} onChange={handleMoveChange} className="form-input">
                      <option value="entrada">Entrada (+)</option>
                      <option value="saida">Saída (-)</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">QUANTIDADE</label>
                    <input type="number" name="quantidade" value={moveForm.quantidade} onChange={handleMoveChange} className="form-input" required />
                  </div>
                  <div className="input-group full-width">
                    <label className="input-label">MOTIVO</label>
                    <input name="motivo" value={moveForm.motivo} onChange={handleMoveChange} className="form-input" placeholder="Ex: Compra, Uso em clínica..." required />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowMoveModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="v-btn-primary-glow" disabled={loading}>Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
