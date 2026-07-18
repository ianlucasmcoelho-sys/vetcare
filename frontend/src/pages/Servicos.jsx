import React, { useState, useEffect } from "react";
import { 
  FiPlus, FiSearch, FiX, FiBox, FiAlertTriangle, FiTag, 
  FiShoppingBag, FiEdit2, FiTrash2, FiPackage, FiDollarSign,
  FiCalendar, FiInfo, FiRefreshCw
} from "react-icons/fi";
import { apiGet, apiPost, apiPut, apiDelete } from "../services/api";
import "./Servicos.css";

export default function Servicos() {
  const [showModal, setShowModal] = useState(false);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [estoque, setEstoque] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState("todas");

  const [form, setForm] = useState({
    nome: "", categoria: "Medicamento", quantidade: "", unidad: "",
    precoVenda: "", fornecedor: "", dataExpiracao: "", observacoes: ""
  });

  const categorias = ["Medicamento", "Vacina", "Consulta", "Exames", "Procedimentos", "Especialidades", "Internação", "Outros"];

  const carregarDados = async () => {
    try {
      setLoading(true);
      const response = await apiGet("/servicos");
      if (response && response.ok) {
        const dados = await response.json();
        setEstoque(Array.isArray(dados) ? dados : []);
      }
    } catch (error) {
      console.error("Erro ao carregar estoque:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
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
      } else if (response) {
        const error = await response.json();
        alert(error.error || "Erro ao salvar item.");
      }
    } catch (err) { 
      alert("Erro ao conectar com o servidor."); 
    } finally { 
      setLoading(false); 
    }
  };

  const deletarItem = async (id) => {
    if (window.confirm("Deseja excluir este item do estoque?")) {
      try {
        const response = await apiDelete(`/servicos/${id}`);
        if (response && response.ok) carregarDados();
      } catch (error) { console.error("Erro ao deletar:", error); }
    }
  };

  const resetForm = () => {
    setForm({
      nome: "", categoria: "Medicamento", quantidade: "", unidade: "",
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

  const isExpirado = (dataExpiracao) => {
    if (!dataExpiracao) return false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const data = new Date(dataExpiracao);
    return data < hoje;
  };

  const isBaixoEstoque = (quantidade) => quantidade <= 5;

  const itensFiltrados = estoque.filter(item => {
    const matchBusca = item.nome?.toLowerCase().includes(busca.toLowerCase()) || 
                       item.categoria?.toLowerCase().includes(busca.toLowerCase());
    const matchCategoria = filtroCategoria === "todas" || item.categoria === filtroCategoria;
    return matchBusca && matchCategoria;
  });

  const totalItens = estoque.length;
  const itensBaixo = estoque.filter(i => isBaixoEstoque(i.quantidade)).length;
  const itensExpirados = estoque.filter(i => isExpirado(i.dataExpiracao)).length;

  return (
    <div className="servicos-container">
      <div className="servicos-header">
        <div className="header-info">
          <h1 className="page-title">Serviços & Estoque</h1>
          <p className="page-subtitle">Gerencie produtos, medicamentos e insumos</p>
        </div>
        <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <FiPlus size={18} />
          <span>Adicionar Item</span>
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><FiPackage size={24} /></div>
          <div className="stat-info">
            <span className="stat-value">{totalItens}</span>
            <span className="stat-label">Total Itens</span>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon"><FiAlertTriangle size={24} /></div>
          <div className="stat-info">
            <span className="stat-value">{itensBaixo}</span>
            <span className="stat-label">Baixo Estoque</span>
          </div>
        </div>
        <div className="stat-card danger">
          <div className="stat-icon"><FiCalendar size={24} /></div>
          <div className="stat-info">
            <span className="stat-value">{itensExpirados}</span>
            <span className="stat-label">Expirados</span>
          </div>
        </div>
      </div>

      <div className="servicos-card">
        <div className="filters-section v-glass-panel reveal-up" style={{animationDelay: "0.1s"}}>
          <div className="search-wrapper">
            <FiSearch className="search-icon" />
            <input
              className="search-input"
              placeholder="Buscar item..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="category-filters">
            <button className={`filter-btn ${filtroCategoria === "todas" ? "active" : ""}`} onClick={() => setFiltroCategoria("todas")}>Todas</button>
            {categorias.map(cat => (
              <button key={cat} className={`filter-btn ${filtroCategoria === cat ? "active" : ""}`} onClick={() => setFiltroCategoria(cat)}>{cat}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="servicos-grid">
             {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton-card" style={{ height: '200px', background: '#f1f5f9', borderRadius: '14px', animation: 'shimmer 1.5s infinite' }} />
            ))}
          </div>
        ) : itensFiltrados.length === 0 ? (
          <div className="empty-state">
            <FiPackage size={48} />
            <p>Nenhum item encontrado</p>
          </div>
        ) : (
          <div className="servicos-grid">
            {itensFiltrados.map((item) => {
              const expirado = isExpirado(item.dataExpiracao);
              const baixo = isBaixoEstoque(item.quantidade);
              return (
                <div key={item.id} className="servicos-card-item">
                  <div className="servicos-card-header">
                    <div className="servicos-avatar"><FiBox size={24} /></div>
                    <div className="servicos-info">
                      <h3 className="servicos-nome">{item.nome}</h3>
                      <span className="servicos-categoria">{item.categoria}</span>
                    </div>
                    {(baixo || expirado) && (
                      <div className={`status-badge ${baixo ? "status-low" : "status-expired"}`}>
                        {baixo ? "Baixo" : "Expirado"}
                      </div>
                    )}
                  </div>
                  <div className="servicos-card-body">
                    <div className="info-row">
                      <FiPackage className="info-icon" size={14} />
                      <span className="info-label">Qtd:</span>
                      <span className={baixo ? "warning" : ""}>{item.quantidade} {item.unidade}</span>
                    </div>
                    <div className="info-row">
                      <FiDollarSign className="info-icon" size={14} />
                      <span className="info-label">Preço:</span>
                      <span>R$ {item.precoVenda}</span>
                    </div>
                  </div>
                  <div className="servicos-card-footer">
                    <button onClick={() => abrirEdicao(item)} className="action-btn">
                      <FiEdit2 size={14} /> Editar
                    </button>
                    <button onClick={() => deletarItem(item.id)} className="action-btn delete-btn">
                      <FiTrash2 size={14} /> Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                <FiPackage size={22} />
                {editId ? "Editar Item" : "Novo Item"}
              </h2>
              <button onClick={() => setShowModal(false)} className="modal-close">
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-scroll">
                <div className="form-grid">
                  <div className="input-group full-width">
                    <label className="input-label">NOME *</label>
                    <input type="text" name="nome" className="form-input" value={form.nome} onChange={handleChange} required />
                  </div>
                  <div className="input-group">
                    <label className="input-label">CATEGORIA</label>
                    <select name="categoria" className="form-input" value={form.categoria} onChange={handleChange}>
                      {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">QUANTIDADE *</label>
                    <input type="number" name="quantidade" className="form-input" value={form.quantidade} onChange={handleChange} required />
                  </div>
                  <div className="input-group">
                    <label className="input-label">UNIDADE *</label>
                    <input type="text" name="unidade" className="form-input" value={form.unidade} onChange={handleChange} required placeholder="ex: un, dose" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">PREÇO VENDA *</label>
                    <input type="text" name="precoVenda" className="form-input" value={form.precoVenda} onChange={handleChange} required />
                  </div>
                  <div className="input-group">
                    <label className="input-label">DATA EXPIRAÇÃO</label>
                    <input type="date" name="dataExpiracao" className="form-input" value={form.dataExpiracao} onChange={handleChange} />
                  </div>
                  <div className="input-group full-width">
                    <label className="input-label">OBSERVAÇÕES</label>
                    <textarea name="observacoes" className="form-textarea" rows="2" value={form.observacoes} onChange={handleChange} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}