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
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [form, setForm] = useState({
    nome: "", categoria: "Medicamento", quantidade: 0, unidade: "un",
    precoVenda: "", fornecedor: "", dataExpiracao: "", observacoes: ""
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
    setForm(prev => ({ ...prev, [name]: value }));
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
      precoVenda: "", fornecedor: "", dataExpiracao: "", observacoes: ""
    });
    setEditId(null);
  };

  const abrirEdicao = (item) => {
    setForm({
      nome: item.nome, categoria: item.categoria, quantidade: item.quantidade,
      unidade: item.unidade, precoVenda: item.precoVenda, fornecedor: item.fornecedor || "",
      dataExpiracao: item.dataExpiracao || "", observacoes: item.observacoes || ""
    });
    setEditId(item.id);
    setShowModal(true);
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

  const itensFiltrados = estoque.filter(item => {
    const matchBusca = item.nome?.toLowerCase().includes(busca.toLowerCase());
    const matchCategoria = filtroCategoria === "todas" || item.categoria === filtroCategoria;
    return matchBusca && matchCategoria;
  });

  const stats = {
    total: estoque.length,
    baixo: estoque.filter(i => i.quantidade <= 5).length,
    vencidos: estoque.filter(i => isExpirado(i.dataExpiracao)).length,
    valorTotal: estoque.reduce((acc, curr) => {
      const preco = parseFloat(String(curr.precoVenda).replace(',', '.')) || 0;
      return acc + (preco * curr.quantidade);
    }, 0)
  };

  return (
    <div className="estoque-container fade-in">
      <div className="page-header">
        <div className="header-info">
          <h1 className="page-title">Gestão de Inventário</h1>
          <p className="page-subtitle">Controle de insumos, medicamentos e auditoria de estoque</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            <FiPlus /> Novo Produto
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><FiBox /></div>
          <div className="stat-info">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Produtos Ativos</span>
          </div>
        </div>
        <div className={`stat-card ${stats.baixo > 0 ? 'warning' : ''}`}>
          <div className="stat-icon"><FiAlertTriangle /></div>
          <div className="stat-info">
            <span className="stat-value">{stats.baixo}</span>
            <span className="stat-label">Estoque Baixo</span>
          </div>
        </div>
        <div className={`stat-card ${stats.vencidos > 0 ? 'danger' : ''}`}>
          <div className="stat-icon"><FiCalendar /></div>
          <div className="stat-info">
            <span className="stat-value">{stats.vencidos}</span>
            <span className="stat-label">Itens Vencidos</span>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon"><FiTrendingUp /></div>
          <div className="stat-info">
            <span className="stat-value">R$ {stats.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span className="stat-label">Valor em Estoque</span>
          </div>
        </div>
      </div>

      <div className="estoque-card">
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
            <div className="search-wrapper">
              <FiSearch className="search-icon" />
              <input className="search-input" placeholder="Buscar produto..." value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
          )}
        </div>

        <div className="tab-content">
          {activeTab === "produtos" ? (
            <div className="produtos-grid">
              {itensFiltrados.map(item => (
                <div key={item.id} className="estoque-card-item fade-in">
                  <div className="card-header">
                    <div className="product-avatar">
                      {item.categoria === "Medicamento" ? <FiPackage /> : <FiBox />}
                    </div>
                    <div className="product-info" style={{ flex: 1 }}>
                      <h3>{item.nome}</h3>
                      <span className="badge-categoria">{item.categoria}</span>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="data-row">
                      <span className="label">SALDO ATUAL</span>
                      <span className={`value ${item.quantidade <= 5 ? "text-danger" : "text-success"}`}>
                        {item.quantidade} {item.unidade}
                      </span>
                    </div>
                    <div className="data-row">
                      <span className="label">PREÇO UNIT.</span>
                      <span className="value">R$ {item.precoVenda}</span>
                    </div>
                    {item.dataExpiracao && (
                      <div className="data-row">
                        <span className="label">VENCIMENTO</span>
                        <span className={`value ${isExpirado(item.dataExpiracao) ? "text-danger" : ""}`}>
                          {new Date(item.dataExpiracao).toLocaleDateString('pt-BR')}
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
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title"><FiPackage /> {editId ? "Editar Produto" : "Novo Produto"}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-scroll">
                <div className="form-grid">
                  <div className="input-group full-width">
                    <label className="input-label">NOME DO PRODUTO *</label>
                    <input name="nome" value={form.nome} onChange={handleChange} className="form-input" required />
                  </div>
                  <div className="input-group">
                    <label className="input-label">CATEGORIA</label>
                    <select name="categoria" value={form.categoria} onChange={handleChange} className="form-input">
                      {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">UNIDADE</label>
                    <input name="unidade" value={form.unidade} onChange={handleChange} className="form-input" placeholder="un, dose, kg" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">PREÇO DE VENDA (R$)</label>
                    <input name="precoVenda" value={form.precoVenda} onChange={handleChange} className="form-input" placeholder="0.00" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">DATA DE VALIDADE</label>
                    <input type="date" name="dataExpiracao" value={form.dataExpiracao} onChange={handleChange} className="form-input" />
                  </div>
                  <div className="input-group full-width">
                    <label className="input-label">OBSERVAÇÕES</label>
                    <textarea name="observacoes" value={form.observacoes} onChange={handleChange} className="form-textarea" rows="2" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Processando..." : "Salvar Produto"}</button>
              </div>
            </form>
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
                <button type="submit" className="btn-primary" disabled={loading}>Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
