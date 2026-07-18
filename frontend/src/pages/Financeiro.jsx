import React, { useState, useEffect } from "react";
import { 
  FiPlus, FiSearch, FiX, FiTrendingUp, FiTrendingDown, 
  FiDollarSign, FiCalendar, FiEdit2, FiTrash2, FiInfo
} from "react-icons/fi";
import { apiGet, apiPost, apiPut, apiDelete } from "../services/api";
import "./Financeiro.css";

export default function Financeiro() {
  const [showModal, setShowModal] = useState(false);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [transacoes, setTransacoes] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState("todas");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [usuarios, setUsuarios] = useState([]);

  const [form, setForm] = useState({
    descricao: "",
    categoria: "Serviços",
    valor: "",
    tipo: "entrada",
    data: new Date().toISOString().split('T')[0],
    metodo_pagamento: "Dinheiro",
    observacoes: "",
    veterinario_id: ""
  });

  const categorias = ["Serviços", "Produtos", "Estoque", "Aluguel/Contas", "Salários", "Impostos", "Outros"];
  const metodosPagamento = ["Dinheiro", "Cartão de Crédito", "Cartão de Débito", "Pix", "Transferência", "Cheque"];

  const carregarDados = async () => {
    try {
      setLoading(true);
      const response = await apiGet("/financeiro");
      if (response && response.ok) {
        const dados = await response.json();
        setTransacoes(Array.isArray(dados) ? dados : []);
      }
    } catch (error) {
      console.error("Erro ao carregar transações:", error);
    } finally {
      setLoading(false);
    }
  };

  const carregarUsuarios = async () => {
    try {
      const response = await apiGet("/auth/usuarios");
      if (response && response.ok) {
        const dados = await response.json();
        setUsuarios(dados.filter(u => u.perfil === 'veterinario' && u.ativo));
      }
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    }
  };

  useEffect(() => { 
    carregarDados(); 
    carregarUsuarios(); 
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = editId 
        ? await apiPut(`/financeiro/${editId}`, form)
        : await apiPost("/financeiro", form);
      
      if (response && response.ok) {
        setShowModal(false);
        resetForm();
        carregarDados();
      } else if (response) {
        const error = await response.json();
        alert(error.error || "Erro ao salvar transação.");
      }
    } catch (err) { 
      alert("Erro ao conectar com o servidor."); 
    } finally { 
      setLoading(false); 
    }
  };

  const deletarTransacao = async (id) => {
    if (window.confirm("Deseja excluir esta transação?")) {
      try {
        const response = await apiDelete(`/financeiro/${id}`);
        if (response && response.ok) carregarDados();
      } catch (error) { console.error("Erro ao deletar:", error); }
    }
  };

  const resetForm = () => {
    setForm({
      descricao: "", categoria: "Serviços", valor: "", tipo: "entrada",
      data: new Date().toISOString().split('T')[0], metodo_pagamento: "Dinheiro", observacoes: "", veterinario_id: ""
    });
    setEditId(null);
  };

  const abrirEdicao = (transacao) => {
    setForm({
      descricao: transacao.descricao,
      categoria: transacao.categoria,
      valor: transacao.valor,
      tipo: transacao.tipo,
      data: transacao.data,
      metodo_pagamento: transacao.metodo_pagamento || "Dinheiro",
      observacoes: transacao.observacoes || "",
      veterinario_id: transacao.veterinario_id || ""
    });
    setEditId(transacao.id);
    setShowModal(true);
  };

  const formatarValor = (valor) => {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(valor) || 0);
  };

  const totalEntradas = transacoes
    .filter(t => t.tipo === "entrada")
    .reduce((acc, t) => acc + (parseFloat(t.valor) || 0), 0);
  
  const totalSaidas = transacoes
    .filter(t => t.tipo === "saida")
    .reduce((acc, t) => acc + (parseFloat(t.valor) || 0), 0);
  
  const saldoAtual = totalEntradas - totalSaidas;

  const transacoesFiltradas = transacoes.filter(t => {
    const matchBusca = t.descricao?.toLowerCase().includes(busca.toLowerCase()) || 
                       t.categoria?.toLowerCase().includes(busca.toLowerCase());
    const matchTipo = filtroTipo === "todas" || t.tipo === filtroTipo;
    const matchCategoria = filtroCategoria === "todas" || t.categoria === filtroCategoria;
    const matchData = (!dataInicio || t.data >= dataInicio) && (!dataFim || t.data <= dataFim);
    return matchBusca && matchTipo && matchCategoria && matchData;
  });

  const transacoesOrdenadas = [...transacoesFiltradas].sort((a, b) => b.data.localeCompare(a.data));

  return (
    <div className="financeiro-container reveal-fade">
      <div className="page-header">
        <div className="header-info">
          <h1 className="page-title">Fluxo de Caixa</h1>
          <p className="page-subtitle">Gestão financeira, receitas e despesas da clínica</p>
        </div>
        <div className="header-actions">
          <button className="v-btn-primary-glow" onClick={() => { resetForm(); setShowModal(true); }}>
            <FiPlus size={18} />
            <span>Nova Transação</span>
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card v-glass-panel reveal-up entrada" style={{animationDelay: '0.1s'}}>
          <div className="stat-icon"><FiTrendingUp size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Entradas</span>
            <span className="stat-value">R$ {formatarValor(totalEntradas)}</span>
          </div>
        </div>
        <div className="stat-card v-glass-panel reveal-up saida" style={{animationDelay: '0.2s'}}>
          <div className="stat-icon"><FiTrendingDown size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Saídas</span>
            <span className="stat-value">R$ {formatarValor(totalSaidas)}</span>
          </div>
        </div>
        <div className="stat-card v-glass-panel reveal-up saldo" style={{animationDelay: '0.3s'}}>
          <div className="stat-icon"><FiDollarSign size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Saldo</span>
            <span className={`stat-value ${saldoAtual >= 0 ? "positive" : "negative"}`}>R$ {formatarValor(saldoAtual)}</span>
          </div>
        </div>
      </div>

      <div className="financeiro-card v-glass-panel reveal-up" style={{animationDelay: '0.4s'}}>
        <div className="filters-section v-glass-panel reveal-up" style={{animationDelay: "0.1s"}}>
          <div className="search-wrapper">
            <FiSearch className="search-icon" />
            <input
              className="search-input"
              placeholder="Buscar por descrição..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="type-filters">
            <button className={`filter-btn ${filtroTipo === "todas" ? "active" : ""}`} onClick={() => setFiltroTipo("todas")}>Todas</button>
            <button className={`filter-btn ${filtroTipo === "entrada" ? "active" : ""}`} onClick={() => setFiltroTipo("entrada")}>Entradas</button>
            <button className={`filter-btn ${filtroTipo === "saida" ? "active" : ""}`} onClick={() => setFiltroTipo("saida")}>Saídas</button>
          </div>
        </div>

        <div className="advanced-filters">
           <select className="categoria-filter" value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
            <option value="todas">Todas Categorias</option>
            {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input type="date" className="date-input" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            <span style={{ fontSize: '12px', color: '#64748b' }}>até</span>
            <input type="date" className="date-input" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="transacoes-list">
             {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton-card" style={{ height: '100px', background: '#f1f5f9', borderRadius: '14px', animation: 'shimmer 1.5s infinite', marginBottom: '12px' }} />
            ))}
          </div>
        ) : transacoesOrdenadas.length === 0 ? (
          <div className="empty-state">
            <FiDollarSign size={48} />
            <p>Nenhuma transação encontrada</p>
          </div>
        ) : (
          <div className="transacoes-list">
            {transacoesOrdenadas.map((t) => (
              <div key={t.id} className="transacao-card-item v-glass-panel" style={{ animationDelay: `${0.1 + (0.05 * (t.id % 10))}s` }}>
                <div className="transacao-card-header">
                  <div className={`transacao-avatar ${t.tipo}`}>
                    {t.tipo === "entrada" ? <FiTrendingUp size={20} /> : <FiTrendingDown size={20} />}
                  </div>
                  <div className="transacao-info">
                    <h3 className="transacao-descricao">{t.descricao}</h3>
                    <p className="transacao-meta">{t.categoria} • {t.data}</p>
                  </div>
                  <div className="transacao-valor">
                    <span className={`valor ${t.tipo}`}>
                      {t.tipo === "entrada" ? "+" : "-"} R$ {formatarValor(t.valor)}
                    </span>
                  </div>
                </div>
                {t.observacoes && (
                  <div className="transacao-card-body">
                    <div className="info-row">
                      <FiInfo className="info-icon" size={14} />
                      <span>{t.observacoes}</span>
                    </div>
                  </div>
                )}
                <div className="transacao-card-footer">
                  <button onClick={() => abrirEdicao(t)} className="action-btn">
                    <FiEdit2 size={14} /> Editar
                  </button>
                  <button onClick={() => deletarTransacao(t.id)} className="action-btn delete-btn">
                    <FiTrash2 size={14} /> Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                <FiDollarSign size={22} />
                {editId ? "Editar Transação" : "Nova Transação"}
              </h2>
              <button onClick={() => setShowModal(false)} className="modal-close">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-scroll">
                <div className="form-grid">
                  <div className="input-group full-width">
                    <label className="input-label">DESCRIÇÃO *</label>
                    <input type="text" name="descricao" className="form-input" value={form.descricao} onChange={handleChange} required />
                  </div>
                  <div className="input-group">
                    <label className="input-label">TIPO *</label>
                    <select name="tipo" className="form-input" value={form.tipo} onChange={handleChange} required>
                      <option value="entrada">Entrada</option>
                      <option value="saida">Saída</option>
                    </select>
                  </div>
                  {form.tipo === 'entrada' && (
                    <div className="input-group">
                      <label className="input-label">VETERINÁRIO (COMISSÃO)</label>
                      <select name="veterinario_id" className="form-input" value={form.veterinario_id} onChange={handleChange}>
                        <option value="">Nenhum</option>
                        {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="input-group">
                    <label className="input-label">VALOR *</label>
                    <input type="number" step="0.01" name="valor" className="form-input" value={form.valor} onChange={handleChange} required />
                  </div>
                  <div className="input-group">
                    <label className="input-label">CATEGORIA</label>
                    <select name="categoria" className="form-input" value={form.categoria} onChange={handleChange}>
                      {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">DATA *</label>
                    <input type="date" name="data" className="form-input" value={form.data} onChange={handleChange} required />
                  </div>
                  <div className="input-group full-width">
                    <label className="input-label">OBSERVAÇÕES</label>
                    <textarea name="observacoes" className="form-textarea" rows="2" value={form.observacoes} onChange={handleChange} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="v-btn-primary-glow" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}