import React, { useState, useEffect, useMemo } from "react";
import {
  FiPlus, FiSearch, FiX, FiBox, FiAlertTriangle, FiTag,
  FiShoppingBag, FiEdit2, FiTrash2, FiPackage, FiDollarSign,
  FiCalendar, FiInfo, FiRefreshCw, FiArrowUpRight, FiArrowDownLeft,
  FiClock, FiList, FiTrendingUp, FiTool, FiUser, FiActivity
} from "react-icons/fi";
import { MdOutlineMedicalServices } from "react-icons/md";
import { apiGet, apiPost, apiPut, apiDelete } from "../services/api";
import Pagination from "../components/Pagination";
import "./TabelaPrecos.css";

const normalizarItemServico = (item) => ({
  ...item,
  precoVenda: item.precoVenda ?? item.precovenda ?? item.preco_venda ?? ""
});

const formatarPrecoVenda = (preco) => {
  if (preco === null || preco === undefined || String(preco).trim() === "") return "Não informado";

  const texto = String(preco).trim();
  const valor = Number(texto.includes(",") ? texto.replace(/\./g, "").replace(",", ".") : texto);
  if (!Number.isFinite(valor)) return "Não informado";

  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
};

export default function TabelaPrecos() {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState({
    nome: "", categoria: "Consulta", quantidade: 0, unidade: "sessão",
    precoVenda: "", precoCusto: "", margemLucro: "", estoqueMinimo: 0,
    fornecedor: "", fabricante: "", lote: "", dataExpiracao: "",
    codigoBarras: "", observacoes: ""
  });

  const categoriasServicos = ["Consulta", "Vacina", "Exames", "Procedimentos", "Especialidades", "Internação", "Medicamento", "Higiene", "Alimento", "Acessório"];

  // Estados de Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const carregarDados = async () => {
    try {
      setLoading(true);
      const response = await apiGet("/servicos");
      if (response && response.ok) {
        const dados = await response.json();
        setItens(Array.isArray(dados) ? dados.map(normalizarItemServico) : []);
      }
    } catch (error) {
      console.error("Erro ao carregar tabela de preços:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  // Resetar para a primeira página ao buscar ou filtrar
  useEffect(() => {
    setCurrentPage(1);
  }, [busca, filtroCategoria]);

  const categoriasExistentes = useMemo(() => [...new Set(itens.map(item => item.categoria))], [itens]);

  const itensFiltrados = useMemo(() => itens.filter(item => {
    const matchBusca = (item.nome?.toLowerCase().includes(busca.toLowerCase())) ||
                       (item.categoria?.toLowerCase().includes(busca.toLowerCase()));
    const matchCategoria = filtroCategoria === "todas" || item.categoria === filtroCategoria;
    return matchBusca && matchCategoria;
  }), [itens, busca, filtroCategoria]);

  // Lógica de Paginação
  const totalPages = Math.ceil(itensFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const itensExibidos = itensFiltrados.slice(startIndex, endIndex);

  const getCategoryIcon = (categoria) => {
    switch (categoria) {
      case "Medicamento": return <FiShoppingBag />;
      case "Vacina": return <FiTag />;
      case "Consulta": return <MdOutlineMedicalServices />;
      case "Exames": return <FiSearch />;
      case "Procedimentos": return <FiTool />;
      case "Especialidades": return <FiUser />;
      case "Internação": return <FiActivity />;
      default: return <FiDollarSign />;
    }
  };

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
      } else {
        const error = await response.json();
        alert(error.error || "Erro ao salvar item.");
      }
    } catch (err) {
      alert("Erro ao salvar item.");
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
      nome: "", categoria: "Consulta", quantidade: 0, unidade: "sessão",
      precoVenda: "", precoCusto: "", margemLucro: "", estoqueMinimo: 0,
      fornecedor: "", fabricante: "", lote: "", dataExpiracao: "",
      codigoBarras: "", observacoes: ""
    });
    setEditId(null);
  };

  const abrirEdicao = (item) => {
    setForm({
      nome: item.nome, categoria: item.categoria, quantidade: item.quantidade || 0,
      unidade: item.unidade || "sessão", precoVenda: item.precoVenda,
      precoCusto: item.precoCusto || "",
      margemLucro: item.margemLucro || "",
      estoqueMinimo: item.estoqueMinimo || 0,
      fornecedor: item.fornecedor || "",
      fabricante: item.fabricante || "",
      lote: item.lote || "",
      dataExpiracao: item.dataExpiracao || "",
      codigoBarras: item.codigoBarras || "",
      observacoes: item.observacoes || ""
    });
    setEditId(item.id);
    setShowModal(true);
  };

  return (
    <div className="precos-container fade-in">
      <div className="page-header">
        <div className="header-info">
          <h1 className="page-title">Tabela de Preços</h1>
          <p className="page-subtitle">Consulte valores de serviços, consultas e produtos</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            <FiPlus /> Novo Item / Serviço
          </button>
        </div>
      </div>

      <div className="precos-card">
        <div className="filters-section v-glass-panel reveal-up" style={{animationDelay: "0.1s"}}>
          <div className="search-wrapper">
            <FiSearch className="search-icon" />
            <input
              className="search-input"
              placeholder="Pesquisar por nome ou categoria..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="category-filters">
            <button
              className={`filter-btn ${filtroCategoria === "todas" ? "active" : ""}`}
              onClick={() => setFiltroCategoria("todas")}
            >
              Todas
            </button>
            {categoriasExistentes.map(cat => (
              <button
                key={cat}
                className={`filter-btn ${filtroCategoria === cat ? "active" : ""}`}
                onClick={() => setFiltroCategoria(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading && !showModal ? (
          <div className="loading-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton-row" style={{ height: '60px', marginBottom: '10px', background: 'var(--bg-hover)', borderRadius: '8px' }} />
            ))}
          </div>
        ) : itensFiltrados.length === 0 ? (
          <div className="empty-state">
            <FiDollarSign size={48} />
            <p>Nenhum item ou serviço encontrado</p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="precos-table">
                <colgroup>
                  <col className="col-item" />
                  <col className="col-category" />
                  <col className="col-unit" />
                  <col className="col-stock" />
                  <col className="col-price" />
                  <col className="col-actions" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Item / Serviço</th>
                    <th>Categoria</th>
                    <th>Unidade</th>
                    <th className="text-center">Estoque</th>
                    <th className="text-right">Preço Venda</th>
                    <th className="text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {itensExibidos.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="item-name-cell">
                          <span className="item-icon">{getCategoryIcon(item.categoria)}</span>
                          <span>{item.nome}</span>
                        </div>
                      </td>
                      <td><span className="badge-categoria">{item.categoria}</span></td>
                      <td>{item.unidade || "-"}</td>
                      <td className="text-center">
                        <span className="stock-value">{item.quantidade ?? 0}</span>
                      </td>
                      <td className="text-right price-cell">
                        <span className="price-badge">{formatarPrecoVenda(item.precoVenda)}</span>
                      </td>
                      <td className="text-center actions-cell">
                        <button onClick={() => abrirEdicao(item)} className="action-icon" title="Editar"><FiEdit2 /></button>
                        <button onClick={() => deletarItem(item.id)} className="action-icon delete-btn" title="Excluir"><FiTrash2 /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={itensFiltrados.length}
              itemsPerPage={itemsPerPage}
            />
          </>
        )}
      </div>

      {/* Modal Cadastro/Edição */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content large-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editId ? <><FiEdit2 /> Editar Item</> : <><FiPlus /> Novo Item / Serviço</>}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-scroll">
                {/* Seção 1: Identificação */}
                <div className="form-section">
                  <h3 className="section-title"><FiTag /> Identificação Geral</h3>
                  <div className="form-grid">
                    <div className="input-group full-width">
                      <label className="input-label">NOME DO ITEM / SERVIÇO *</label>
                      <input name="nome" value={form.nome} onChange={handleChange} className="form-input" required placeholder="Ex: Consulta Geral, Vacina V10..." />
                    </div>
                    <div className="input-group">
                      <label className="input-label">CATEGORIA</label>
                      <select name="categoria" value={form.categoria} onChange={handleChange} className="form-input">
                        {categoriasServicos.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="input-group">
                      <label className="input-label">UNIDADE</label>
                      <input name="unidade" list="unidades-list" value={form.unidade} onChange={handleChange} className="form-input" placeholder="Ex: sessão, un, dose..." />
                      <datalist id="unidades-list">
                        <option value="sessão" />
                        <option value="un" />
                        <option value="dose" />
                        <option value="kg" />
                        <option value="ml" />
                      </datalist>
                    </div>
                  </div>
                </div>

                {/* Seção 2: Financeiro */}
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
                      <input name="precoVenda" value={form.precoVenda} onChange={handleChange} className="form-input highlight-success" placeholder="0.00" required />
                    </div>
                    <div className="profit-indicator">
                      <span>Lucro Estimado:</span>
                      <strong>R$ {(parseFloat(form.precoVenda) - parseFloat(form.precoCusto || 0)).toFixed(2)}</strong>
                    </div>
                  </div>
                </div>

                {/* Seção 3: Outros Detalhes (Opcional para serviços) */}
                <div className="form-section">
                  <h3 className="section-title"><FiInfo /> Detalhes Adicionais</h3>
                  <div className="form-grid">
                    <div className="input-group">
                      <label className="input-label">CÓDIGO DE BARRAS / SKU</label>
                      <input name="codigoBarras" value={form.codigoBarras} onChange={handleChange} className="form-input" placeholder="Opcional..." />
                    </div>
                    <div className="input-group">
                      <label className="input-label">QUANTIDADE INICIAL</label>
                      <input type="number" name="quantidade" value={form.quantidade} onChange={handleChange} className="form-input" />
                    </div>
                    <div className="input-group full-width">
                      <label className="input-label">OBSERVAÇÕES ADICIONAIS</label>
                      <textarea name="observacoes" value={form.observacoes} onChange={handleChange} className="form-textarea" rows="2" placeholder="Informações extras..." />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Processando..." : editId ? "Atualizar" : "Cadastrar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

