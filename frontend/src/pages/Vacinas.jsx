import React, { useState, useEffect } from "react";
import { 
  FiPlus, FiCalendar, FiShield, FiX, FiSearch, FiEdit2, 
  FiTrash2, FiAlertCircle, FiInfo, FiClock, FiCheckCircle
} from "react-icons/fi";
import { MdOutlineVaccines, MdOutlinePets } from "react-icons/md";
import { apiGet, apiPost, apiPut, apiDelete } from "../services/api";
import "./Vacinas.css";

export default function Vacinas() {
  const [showModal, setShowModal] = useState(false);
  const [vacinas, setVacinas] = useState([]);
  const [animais, setAnimais] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [editId, setEditId] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState("todas");

  const [form, setForm] = useState({
    nome_vacina: "", data_aplicacao: "", proxima_dose: "",
    lote: "", fabricante: "", animal_id: "", observacoes: ""
  });

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [resV, resA] = await Promise.all([apiGet("/vacinas"), apiGet("/animais")]);
      if (resV && resV.ok && resA && resA.ok) {
        const dataV = await resV.json();
        const dataA = await resA.json();
        setVacinas(Array.isArray(dataV) ? dataV : []);
        setAnimais(Array.isArray(dataA) ? dataA : []);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
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
        ? await apiPut(`/vacinas/${editId}`, form)
        : await apiPost("/vacinas", form);
      
      if (response && response.ok) {
        setShowModal(false);
        resetForm();
        carregarDados();
      } else if (response) {
        const error = await response.json();
        alert(error.error || "Erro ao registrar vacina.");
      }
    } catch (err) { 
      alert("Erro ao conectar com o servidor."); 
    } finally { 
      setLoading(false); 
    }
  };

  const deletarVacina = async (id) => {
    if (window.confirm("Deseja excluir este registro de vacina?")) {
      try {
        const response = await apiDelete(`/vacinas/${id}`);
        if (response && response.ok) carregarDados();
      } catch (error) { console.error("Erro ao deletar:", error); }
    }
  };

  const resetForm = () => {
    setForm({
      nome_vacina: "", data_aplicacao: "", proxima_dose: "",
      lote: "", fabricante: "", animal_id: "", observacoes: ""
    });
    setEditId(null);
  };

  const abrirEdicao = (vacina) => {
    setForm({
      nome_vacina: vacina.nome_vacina,
      data_aplicacao: vacina.data_aplicacao,
      proxima_dose: vacina.proxima_dose || "",
      lote: vacina.lote || "",
      fabricante: vacina.fabricante || "",
      animal_id: vacina.animal_id,
      observacoes: vacina.observacoes || ""
    });
    setEditId(vacina.id);
    setShowModal(true);
  };

  const getNomeAnimal = (animalId) => {
    const animal = animais.find(a => a.id === animalId);
    return animal ? animal.nome : "Pet não identificado";
  };

  const isVencida = (dataProximaDose) => {
    if (!dataProximaDose) return false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const data = new Date(dataProximaDose);
    return data < hoje;
  };

  const isProxima = (dataProximaDose) => {
    if (!dataProximaDose) return false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const data = new Date(dataProximaDose);
    const diffTime = data - hoje;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  const vacinasFiltradas = vacinas.filter(v => {
    const animalNome = getNomeAnimal(v.animal_id).toLowerCase();
    const vacinaNome = v.nome_vacina?.toLowerCase();
    const matchBusca = animalNome.includes(busca.toLowerCase()) || vacinaNome?.includes(busca.toLowerCase());
    if (filtroStatus === "vencidas") return matchBusca && isVencida(v.proxima_dose);
    if (filtroStatus === "proximas") return matchBusca && isProxima(v.proxima_dose);
    return matchBusca;
  });

  return (
    <div className="vacinas-container fade-in">
      <div className="page-header">
        <div className="header-info">
          <h1 className="page-title">Cartão de Vacina</h1>
          <p className="page-subtitle">Controle de imunização e prevenção para os pacientes</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            <FiPlus size={18} />
            <span>Registrar Vacina</span>
          </button>
        </div>
      </div>

      <div className="vacinas-card">
        <div className="filters-section">
          <div className="search-wrapper">
            <FiSearch className="search-icon" />
            <input
              className="search-input"
              placeholder="Buscar por pet ou vacina..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="status-filters">
            <button className={`filter-btn ${filtroStatus === "todas" ? "active" : ""}`} onClick={() => setFiltroStatus("todas")}>Todas</button>
            <button className={`filter-btn ${filtroStatus === "proximas" ? "active" : ""}`} onClick={() => setFiltroStatus("proximas")}>Próximas</button>
            <button className={`filter-btn ${filtroStatus === "vencidas" ? "active" : ""}`} onClick={() => setFiltroStatus("vencidas")}>Vencidas</button>
          </div>
        </div>

        {loading ? (
          <div className="vacinas-list">
             {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton-card" style={{ height: '200px', background: '#f1f5f9', borderRadius: '14px', animation: 'shimmer 1.5s infinite', marginBottom: '12px' }} />
            ))}
          </div>
        ) : vacinasFiltradas.length === 0 ? (
          <div className="empty-state">
            <MdOutlineVaccines size={48} />
            <p>Nenhuma vacina encontrada</p>
          </div>
        ) : (
          <div className="vacinas-list">
            {vacinasFiltradas.map((v) => {
              const vencida = isVencida(v.proxima_dose);
              const proxima = isProxima(v.proxima_dose);
              return (
                <div key={v.id} className="vacina-card-item">
                  <div className="vacina-card-header">
                    <div className="vacina-avatar"><MdOutlineVaccines size={28} /></div>
                    <div className="vacina-info">
                      <h3 className="vacina-nome">{v.nome_vacina}</h3>
                      <p className="vacina-pet"><MdOutlinePets size={12} /> {getNomeAnimal(v.animal_id)}</p>
                    </div>
                    {(vencida || proxima) && (
                      <div className={`status-badge ${vencida ? "status-vencida" : "status-proxima"}`}>
                        {vencida ? "Vencida" : "Próxima"}
                      </div>
                    )}
                  </div>
                  <div className="vacina-card-body">
                    <div className="info-row">
                      <FiCalendar className="info-icon" size={14} />
                      <span className="info-label">Aplicação:</span>
                      <span>{v.data_aplicacao}</span>
                    </div>
                    <div className="info-row">
                      <FiCalendar className="info-icon" size={14} />
                      <span className="info-label">Próxima dose:</span>
                      <span className={vencida ? "vencida" : proxima ? "proxima" : ""}>{v.proxima_dose || "Não informada"}</span>
                    </div>
                  </div>
                  <div className="vacina-card-footer">
                    <button onClick={() => abrirEdicao(v)} className="action-btn">
                      <FiEdit2 size={14} /> Editar
                    </button>
                    <button onClick={() => deletarVacina(v.id)} className="action-btn delete-btn">
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
                <MdOutlineVaccines size={22} />
                {editId ? "Editar Vacina" : "Registrar Vacina"}
              </h2>
              <button onClick={() => setShowModal(false)} className="modal-close">
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-scroll">
                <div className="form-grid">
                  <div className="input-group full-width">
                    <label className="input-label">ANIMAL *</label>
                    <select name="animal_id" className="form-input" required value={form.animal_id} onChange={handleChange}>
                      <option value="">Selecione...</option>
                      {animais.map(a => <option key={a.id} value={a.id}>{a.nome} ({a.especie})</option>)}
                    </select>
                  </div>
                  <div className="input-group full-width">
                    <label className="input-label">NOME DA VACINA *</label>
                    <input type="text" name="nome_vacina" className="form-input" value={form.nome_vacina} onChange={handleChange} required />
                  </div>
                  <div className="input-group">
                    <label className="input-label">DATA APLICAÇÃO *</label>
                    <input type="date" name="data_aplicacao" className="form-input" value={form.data_aplicacao} onChange={handleChange} required />
                  </div>
                  <div className="input-group">
                    <label className="input-label">PRÓXIMA DOSE</label>
                    <input type="date" name="proxima_dose" className="form-input" value={form.proxima_dose} onChange={handleChange} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">LOTE</label>
                    <input type="text" name="lote" className="form-input" value={form.lote} onChange={handleChange} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">FABRICANTE</label>
                    <input type="text" name="fabricante" className="form-input" value={form.fabricante} onChange={handleChange} />
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