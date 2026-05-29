import React, { useState, useEffect } from "react";
import { FiSearch, FiDollarSign, FiTag, FiShoppingBag, FiTool, FiUser, FiActivity } from "react-icons/fi";
import { MdOutlineMedicalServices } from "react-icons/md";
import { apiGet } from "../services/api";
import Pagination from "../components/Pagination";
import "./TabelaPrecos.css";

export default function TabelaPrecos() {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  
  // Estados de Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const carregarDados = async () => {
    try {
      setLoading(true);
      const response = await apiGet("/servicos");
      if (response && response.ok) {
        const dados = await response.json();
        setItens(Array.isArray(dados) ? dados : []);
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

  const categorias = [...new Set(itens.map(item => item.categoria))];

  const itensFiltrados = itens.filter(item => {
    const matchBusca = item.nome?.toLowerCase().includes(busca.toLowerCase()) || 
                       item.categoria?.toLowerCase().includes(busca.toLowerCase());
    const matchCategoria = filtroCategoria === "todas" || item.categoria === filtroCategoria;
    return matchBusca && matchCategoria;
  });

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

  return (
    <div className="precos-container fade-in">
      <div className="page-header">
        <div className="header-info">
          <h1 className="page-title">Tabela de Preços</h1>
          <p className="page-subtitle">Consulte valores de serviços, consultas e produtos</p>
        </div>
      </div>

      <div className="precos-card">
        <div className="filters-section">
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
            {categorias.map(cat => (
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

        {loading ? (
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
                <thead>
                  <tr>
                    <th>Item / Serviço</th>
                    <th>Categoria</th>
                    <th>Unidade</th>
                    <th className="text-right">Preço Venda</th>
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
                      <td className="text-right price-cell">R$ {item.precoVenda}</td>
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
    </div>
  );
}

