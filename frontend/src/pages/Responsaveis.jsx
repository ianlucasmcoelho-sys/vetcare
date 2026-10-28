import useQuickCreate from '../hooks/useQuickCreate';
import React, { useState, useEffect, useMemo } from "react";
import {
  FiPlus, FiSearch, FiTrash2, FiEdit3, FiX, FiUser,
  FiMail, FiPhone, FiMapPin, FiDownload, FiInfo
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost, apiPut, apiDelete } from "../services/api";
import Pagination from "../components/Pagination";
import { exportExcel } from "../utils/exportExcel";
import "./Responsaveis.css";

export default function Responsaveis() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  useQuickCreate(() => setShowModal(true));
  const [savedTutor, setSavedTutor] = useState(null);
  const [tutores, setTutores] = useState([]);
  const [busca, setBusca] = useState("");
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Estados de Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const initialForm = {
    nome: "", cpf: "", rg: "", nascimento: "",
    telefone: "", celular: "", email: "", cep: "",
    endereco: "", cidade: "", estado: "", observacoes: ""
  };

  const [form, setForm] = useState(initialForm);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const res = await apiGet("/responsaveis");
      if (res && res.ok) {
        const data = await res.json();
        setTutores(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Erro ao carregar tutores:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  // Resetar página ao buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [busca]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = editId
        ? await apiPut(`/responsaveis/${editId}`, form)
        : await apiPost("/responsaveis", form);

      if (res && res.ok) {
        const saved = await res.json();
        if (!editId && saved.id) setSavedTutor({ id: saved.id, nome: form.nome });
        fecharModal();
        carregarDados();
      } else if (res) {
        const error = await res.json();
        alert(error.error || "Erro ao salvar tutor.");
      }
    } catch (err) {
      console.error("Erro:", err);
      alert("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const fecharModal = () => {
    setForm(initialForm);
    setEditId(null);
    setShowModal(false);
  };

  const abrirEdicao = (tutor, event) => {
    if (event) event.stopPropagation();
    setForm({
      nome: tutor.nome || "",
      cpf: tutor.cpf || "",
      rg: tutor.rg || "",
      nascimento: tutor.nascimento || "",
      telefone: tutor.telefone || "",
      celular: tutor.celular || "",
      email: tutor.email || "",
      cep: tutor.cep || "",
      endereco: tutor.endereco || "",
      cidade: tutor.cidade || "",
      estado: tutor.estado || "",
      observacoes: tutor.observacoes || ""
    });
    setEditId(tutor.id);
    setShowModal(true);
  };

  const deletarTutor = async (id, event) => {
    if (event) event.stopPropagation();
    if (window.confirm("Deseja excluir este tutor? Esta ação não poderá ser desfeita.")) {
      try {
        const res = await apiDelete(`/responsaveis/${id}`);
        if (res && res.ok) {
          carregarDados();
        }
      } catch (err) {
        alert("Erro ao excluir tutor.");
      }
    }
  };

  const abrirPerfil = (id) => {
    navigate(`/perfil-tutor/${id}`);
  };

  const exportarCSV = () => {
    const cabecalho = ["ID", "Nome", "CPF", "Celular", "E-mail", "Cidade", "Estado"];
    const linhas = tutores.map(t => [
      t.id,
      t.nome,
      t.cpf || "",
      t.celular || "",
      t.email || "",
      t.cidade || "",
      t.estado || ""
    ]);

    const csvContent = [cabecalho, ...linhas].map(row => row.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute("download", `tutores_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  const exportarExcel = () => {
    const columns = ["ID", "Nome", "CPF", "RG", "Nascimento", "Telefone", "Celular", "E-mail", "CEP", "Endereço", "Cidade", "Estado", "Observações"];
    const rows = tutores.map(t => [
      t.id, t.nome, t.cpf, t.rg, t.nascimento, t.telefone, t.celular,
      t.email, t.cep, t.endereco, t.cidade, t.estado, t.observacoes
    ]);
    exportExcel({ fileName: `tutores_${new Date().toISOString().split("T")[0]}`, sheetName: "Tutores", columns, rows });
    setShowExportModal(false);
  };

  const tutoresFiltrados = useMemo(() => tutores.filter(t =>
    t.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    t.email?.toLowerCase().includes(busca.toLowerCase()) ||
    t.celular?.includes(busca)
  ), [tutores, busca]);

  // Lógica de Paginação
  const totalPages = Math.ceil(tutoresFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const tutoresExibidos = tutoresFiltrados.slice(startIndex, endIndex);

  return (
    <div className="responsaveis-container reveal-fade">
      {savedTutor && <div className="modal-overlay"><section className="modal-content tutor-next-step" role="dialog" aria-modal="true" aria-labelledby="tutor-next-title"><div className="modal-header"><h2 id="tutor-next-title">Tutor cadastrado!</h2><button className="modal-close" aria-label="Fechar sugestão" onClick={() => setSavedTutor(null)}><FiX /></button></div><div className="tutor-next-body"><FiUser /><p><strong>{savedTutor.nome}</strong> já está cadastrado. Deseja cadastrar o animal dele agora?</p><span>O tutor já virá selecionado no próximo formulário.</span></div><div className="modal-footer"><button className="btn-secondary" onClick={() => setSavedTutor(null)}>Agora não</button><button className="btn-primary" autoFocus onClick={() => navigate(`/animais?novo=1&tutor_id=${savedTutor.id}`)}>Cadastrar animal</button></div></section></div>}

      <div className="page-header">
        <div className="header-info">
          <h1 className="page-title">Gestão de Tutores</h1>
          <p className="page-subtitle">Administre os clientes e responsáveis pelos pacientes</p>
        </div>
        <div className="header-actions">
          <button className="btn-outline" onClick={() => setShowExportModal(true)}>
            <FiDownload size={16} />
            <span>Exportar</span>
          </button>
          <button className="v-btn-primary-glow" onClick={() => setShowModal(true)}>
            <FiPlus size={18} />
            <span>Novo Tutor</span>
          </button>
        </div>
      </div>

      <div className="responsaveis-card reveal-up" style={{animationDelay: '0.1s'}}>
        <div className="search-section v-glass-panel reveal-up" style={{animationDelay: "0.1s"}}>
          <div className="search-wrapper">
            <FiSearch className="search-icon" />
            <input
              className="search-input"
              placeholder="Pesquisar por nome, e-mail ou celular..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            {busca && (
              <button className="search-clear" onClick={() => setBusca("")} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#94a3b8' }}>
                <FiX size={16} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="tutores-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton-card" style={{ height: '180px', background: '#f1f5f9', borderRadius: '14px', animation: 'shimmer 1.5s infinite' }} />
            ))}
          </div>
        ) : tutoresFiltrados.length === 0 ? (
          <div className="empty-state">
            <FiUser size={48} />
            <p>Nenhum tutor encontrado</p>
            <button className="v-btn-primary-glow" onClick={() => setShowModal(true)}>
              <FiPlus size={16} />
              Cadastrar primeiro tutor
            </button>
          </div>
        ) : (
          <>
            <div className="tutores-grid">
              {tutoresExibidos.map((tutor) => (
                <div
                  key={tutor.id}
                  className="tutor-card-item v-glass-panel"
                  onClick={() => abrirPerfil(tutor.id)}
                  style={{animationDelay: `${0.1 + (0.05 * (tutor.id % 10))}s`}}
                >
                  <div className="tutor-card-badge">Tutor Ativo</div>
                  <div className="tutor-card-header">
                    <div className="tutor-avatar">
                      <FiUser size={24} />
                    </div>
                    <div className="tutor-info">
                      <h3 className="tutor-nome">{tutor.nome}</h3>
                      <p className="tutor-email">
                        <FiMail size={12} /> {tutor.email || "E-mail não informado"}
                      </p>
                    </div>
                  </div>

                  <div className="tutor-card-body">
                    <div className="contact-row">
                      <div className="contact-item">
                        <FiPhone className="contact-icon" />
                        <span>{tutor.celular || "Sem celular"}</span>
                      </div>
                      {tutor.cpf && (
                        <div className="contact-item">
                          <FiInfo className="contact-icon" />
                          <span>CPF: {tutor.cpf}</span>
                        </div>
                      )}
                    </div>

                    <div className="location-info">
                      <FiMapPin className="location-icon" />
                      <span>
                        {[tutor.cidade, tutor.estado].filter(Boolean).join(" - ") || "Localização pendente"}
                      </span>
                    </div>
                  </div>

                  <div className="tutor-card-footer">
                    <span className="id-tag">#{String(tutor.id).padStart(4, '0')}</span>
                    <div className="tutor-actions">
                      <button
                        onClick={(e) => abrirEdicao(tutor, e)}
                        className="action-btn edit"
                        title="Editar Perfil"
                      >
                        <FiEdit3 size={14} />
                      </button>
                      <button
                        onClick={(e) => deletarTutor(tutor.id, e)}
                        className="action-btn delete"
                        title="Excluir Registro"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={tutoresFiltrados.length}
              itemsPerPage={itemsPerPage}
            />
          </>
        )}
      </div>


      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal-content" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                <FiDownload size={22} />
                Exportar Dados
              </h2>
              <button onClick={() => setShowExportModal(false)} className="modal-close">
                <FiX size={20} />
              </button>
            </div>
            <div className="form-scroll">
              <p style={{ color: '#475569', fontSize: '14px', marginBottom: '16px' }}>Escolha o formato para exportar a lista completa de tutores.</p>
              <div style={{ background: '#f0fdfa', padding: '12px', borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <FiInfo size={18} color="#0d9488" />
                <span style={{ fontSize: '12px', color: '#0d9488' }}>O arquivo será compatível com Excel e outros editores de planilha.</span>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowExportModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={exportarCSV} className="btn-secondary">Exportar CSV</button>
              <button onClick={exportarExcel} className="v-btn-primary-glow">Exportar Excel</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                <FiUser size={22} />
                {editId ? "Editar Tutor" : "Novo Tutor"}
              </h2>
              <button onClick={fecharModal} className="modal-close">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-scroll">
                <div className="form-grid">
                  <div className="input-group full-width">
                    <label className="input-label">NOME COMPLETO *</label>
                    <input
                      type="text"
                      name="nome"
                      className="form-input"
                      value={form.nome}
                      onChange={handleChange}
                      placeholder="Digite o nome completo"
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">CPF</label>
                    <input
                      type="text"
                      name="cpf"
                      className="form-input"
                      value={form.cpf}
                      onChange={handleChange}
                      placeholder="000.000.000-00"
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">CELULAR *</label>
                    <input
                      type="text"
                      name="celular"
                      className="form-input"
                      value={form.celular}
                      onChange={handleChange}
                      placeholder="(00) 00000-0000"
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">E-MAIL</label>
                    <input
                      type="email"
                      name="email"
                      className="form-input"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="email@exemplo.com"
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">RG</label>
                    <input
                      type="text"
                      name="rg"
                      className="form-input"
                      value={form.rg}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">DATA NASCIMENTO</label>
                    <input
                      type="date"
                      name="nascimento"
                      className="form-input"
                      value={form.nascimento}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="input-group full-width">
                    <label className="input-label">ENDEREÇO</label>
                    <input
                      type="text"
                      name="endereco"
                      className="form-input"
                      value={form.endereco}
                      onChange={handleChange}
                      placeholder="Rua, número, bairro..."
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">CIDADE</label>
                    <input
                      type="text"
                      name="cidade"
                      className="form-input"
                      value={form.cidade}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">ESTADO</label>
                    <input
                      type="text"
                      name="estado"
                      className="form-input"
                      value={form.estado}
                      onChange={handleChange}
                      maxLength="2"
                      placeholder="UF"
                    />
                  </div>

                  <div className="input-group full-width">
                    <label className="input-label">OBSERVAÇÕES</label>
                    <textarea
                      name="observacoes"
                      className="form-textarea"
                      rows="3"
                      value={form.observacoes}
                      onChange={handleChange}
                      placeholder="Alguma observação importante sobre este tutor?"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={fecharModal} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="v-btn-primary-glow" disabled={loading}>
                  {loading ? "Salvando..." : (editId ? "Atualizar Tutor" : "Salvar Tutor")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
