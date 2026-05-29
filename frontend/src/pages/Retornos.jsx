import React, { useState, useEffect } from "react";
import { 
  FiSearch, FiCalendar, FiUser, FiClock, FiCheckCircle, 
  FiPlus, FiX, FiAlertCircle, FiEdit2, FiInfo, FiCheck,
  FiXCircle
} from "react-icons/fi";
import { MdOutlinePets } from "react-icons/md";
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from "../services/api";
import "./Retornos.css";

export default function Retornos() {
  const [filtro, setFiltro] = useState("Pendentes");
  const [busca, setBusca] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [retornos, setRetornos] = useState([]);
  const [animaisExistentes, setAnimaisExistentes] = useState([]);
  const [editId, setEditId] = useState(null);

  const opcoesFiltro = ["Pendentes", "Atrasados", "Concluídos", "Cancelados"];

  const [form, setForm] = useState({
    consulta_id: "",
    pet_nome: "",
    tutor_nome: "",
    data_retorno: "",
    horario: "",
    motivo: "",
    observacoes: ""
  });

  useEffect(() => {
    fetchRetornos();
    fetchAnimais();
  }, []);

  const fetchRetornos = async () => {
    try {
      setLoading(true);
      const response = await apiGet('/retornos');
      if (response && response.ok) {
        const dados = await response.json();
        setRetornos(dados);
      }
    } catch (error) {
      console.error("Erro ao buscar retornos:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnimais = async () => {
    try {
      const response = await apiGet('/animais');
      if (response && response.ok) {
        const dados = await response.json();
        setAnimaisExistentes(dados);
      }
    } catch (error) {
      console.error("Erro ao buscar animais:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePetSelect = async (petNome) => {
    setForm(prev => ({ ...prev, pet_nome: petNome }));
    
    if (petNome) {
      const animal = animaisExistentes.find(a => a.nome === petNome);
      
      if (animal && animal.responsavel_id) {
        try {
          const response = await apiGet(`/responsaveis/${animal.responsavel_id}`);
          if (response && response.ok) {
            const tutor = await response.json();
            setForm(prev => ({ ...prev, tutor_nome: tutor.nome }));
          }
        } catch (error) {
          console.error("Erro ao buscar tutor:", error);
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = editId 
        ? await apiPut(`/retornos/${editId}`, form)
        : await apiPost("/retornos", form);

      if (response && response.ok) {
        fetchRetornos();
        fecharModal();
      } else if (response) {
        const error = await response.json();
        alert(error.error || "Erro ao salvar retorno");
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const atualizarStatus = async (id, novoStatus) => {
    try {
      const response = await apiPatch(`/retornos/${id}/status`, { status: novoStatus });
      
      if (response && response.ok) {
        fetchRetornos();
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  const deletarRetorno = async (id) => {
    if (window.confirm("Deseja excluir este retorno?")) {
      try {
        const response = await apiDelete(`/retornos/${id}`);
        
        if (response && response.ok) {
          fetchRetornos();
        }
      } catch (error) {
        console.error("Erro ao deletar:", error);
      }
    }
  };

  const fecharModal = () => {
    setForm({
      consulta_id: "",
      pet_nome: "",
      tutor_nome: "",
      data_retorno: "",
      horario: "",
      motivo: "",
      observacoes: ""
    });
    setEditId(null);
    setShowModal(false);
  };

  const abrirEdicao = (retorno) => {
    setForm({
      consulta_id: retorno.consulta_id || "",
      pet_nome: retorno.pet_nome,
      tutor_nome: retorno.tutor_nome,
      data_retorno: retorno.data_retorno,
      horario: retorno.horario,
      motivo: retorno.motivo || "",
      observacoes: retorno.observacoes || ""
    });
    setEditId(retorno.id);
    setShowModal(true);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "Pendentes": { label: "Pendente", className: "status-pendentes", icon: <FiClock size={11} /> },
      "Atrasados": { label: "Atrasado", className: "status-atrasados", icon: <FiAlertCircle size={11} /> },
      "Concluídos": { label: "Concluído", className: "status-concluídos", icon: <FiCheck size={11} /> },
      "Cancelados": { label: "Cancelado", className: "status-cancelados", icon: <FiXCircle size={11} /> }
    };
    const s = statusMap[status] || statusMap["Pendentes"];
    return (
      <span className={`status-badge ${s.className}`}>
        {s.icon}
        {s.label}
      </span>
    );
  };

  const isAtrasado = (dataRetorno) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const data = new Date(dataRetorno);
    return data < hoje;
  };

  const retornosComStatus = retornos.map(retorno => ({
    ...retorno,
    statusExibicao: isAtrasado(retorno.data_retorno) && retorno.status === "Pendentes" 
      ? "Atrasados" 
      : retorno.status
  }));

  const retornosFiltrados = retornosComStatus.filter(r => 
    r.statusExibicao === filtro &&
    (r.pet_nome?.toLowerCase().includes(busca.toLowerCase()) || 
     r.tutor_nome?.toLowerCase().includes(busca.toLowerCase()) ||
     r.motivo?.toLowerCase().includes(busca.toLowerCase()))
  );

  return (
    <div className="retornos-container fade-in">
      <div className="page-header">
        <div className="header-info">
          <h1 className="page-title">Retornos Médicos</h1>
          <p className="page-subtitle">Gerencie consultas de acompanhamento e revisões</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <FiPlus size={18} />
            <span>Novo Retorno</span>
          </button>
        </div>
      </div>

      <div className="retornos-card">
        <div className="filters-section">
          <div className="tabs-container">
            {opcoesFiltro.map((opcao) => (
              <button
                key={opcao}
                onClick={() => setFiltro(opcao)}
                className={`tab-btn ${filtro === opcao ? "active" : ""}`}
              >
                {opcao}
                {opcao === "Pendentes" && retornos.filter(r => r.status === "Pendentes" && !isAtrasado(r.data_retorno)).length > 0 && (
                  <span className="tab-count">{retornos.filter(r => r.status === "Pendentes" && !isAtrasado(r.data_retorno)).length}</span>
                )}
                {opcao === "Atrasados" && retornos.filter(r => r.status === "Pendentes" && isAtrasado(r.data_retorno)).length > 0 && (
                  <span className="tab-count danger">{retornos.filter(r => r.status === "Pendentes" && isAtrasado(r.data_retorno)).length}</span>
                )}
              </button>
            ))}
          </div>

          <div className="search-wrapper">
            <FiSearch className="search-icon" />
            <input
              className="search-input"
              placeholder="Buscar por pet, tutor ou motivo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            {busca && (
              <button className="search-clear" onClick={() => setBusca("")}>
                <FiX size={16} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="loading-skeleton">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
        ) : retornosFiltrados.length === 0 ? (
          <div className="empty-state">
            <FiCalendar size={48} />
            <p>Nenhum retorno {filtro.toLowerCase()} encontrado</p>
            <button className="btn-outline" onClick={() => setShowModal(true)}>
              <FiPlus size={16} />
              Agendar novo retorno
            </button>
          </div>
        ) : (
          <div className="retornos-list">
            {retornosFiltrados.map((retorno) => (
              <div key={retorno.id} className="retorno-card">
                <div className="retorno-card-header">
                  <div className="retorno-avatar">
                    <MdOutlinePets size={28} />
                  </div>
                  <div className="retorno-info">
                    <h3 className="retorno-nome">{retorno.pet_nome}</h3>
                    <p className="retorno-tutor">
                      <FiUser size={12} />
                      <span>{retorno.tutor_nome}</span>
                    </p>
                  </div>
                  {getStatusBadge(retorno.statusExibicao)}
                </div>

                <div className="retorno-card-body">
                  <div className="info-row">
                    <FiCalendar className="info-icon" />
                    <span className="info-label">Data:</span>
                    <span className={`info-value ${isAtrasado(retorno.data_retorno) && retorno.status === "Pendentes" ? "atrasado" : ""}`}>
                      {retorno.data_retorno}
                    </span>
                  </div>
                  
                  <div className="info-row">
                    <FiClock className="info-icon" />
                    <span className="info-label">Horário:</span>
                    <span className="info-value">{retorno.horario}</span>
                  </div>

                  {retorno.motivo && (
                    <div className="info-row">
                      <FiInfo className="info-icon" />
                      <span className="info-label">Motivo:</span>
                      <span className="info-value">{retorno.motivo}</span>
                    </div>
                  )}

                  {retorno.observacoes && (
                    <div className="info-row">
                      <FiAlertCircle className="info-icon" />
                      <span className="info-label">Observações:</span>
                      <span className="info-value">{retorno.observacoes}</span>
                    </div>
                  )}
                </div>

                <div className="retorno-card-footer">
                  {retorno.statusExibicao === "Pendentes" || retorno.statusExibicao === "Atrasados" ? (
                    <>
                      <button 
                        onClick={() => atualizarStatus(retorno.id, "Concluídos")}
                        className="action-btn success-btn"
                      >
                        <FiCheckCircle size={14} />
                        Confirmar Retorno
                      </button>
                      <button 
                        onClick={() => atualizarStatus(retorno.id, "Cancelados")}
                        className="action-btn danger-btn"
                      >
                        <FiX size={14} />
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <div className="info-message">
                      {retorno.statusExibicao === "Concluídos" && (
                        <>
                          <FiCheckCircle size={14} />
                          Retorno realizado com sucesso
                        </>
                      )}
                      {retorno.statusExibicao === "Cancelados" && (
                        <>
                          <FiXCircle size={14} />
                          Retorno cancelado
                        </>
                      )}
                    </div>
                  )}
                  <button 
                    onClick={() => abrirEdicao(retorno)}
                    className="action-btn edit-btn"
                    title="Editar"
                  >
                    <FiEdit2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE CADASTRO/EDIÇÃO */}
      {showModal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                <FiCalendar size={22} />
                {editId ? "Editar Retorno" : "Novo Retorno"}
              </h2>
              <button onClick={fecharModal} className="modal-close">
                <FiX size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-scroll">
                <div className="form-grid">
                  <div className="input-group full-width">
                    <label className="input-label">NOME DO PET *</label>
                    <input
                      list="pets-list"
                      name="pet_nome"
                      className="form-input"
                      placeholder="Digite ou selecione o nome do animal"
                      value={form.pet_nome}
                      onChange={(e) => handlePetSelect(e.target.value)}
                      autoComplete="off"
                      required
                    />
                    <datalist id="pets-list">
                      {animaisExistentes.map(animal => (
                        <option key={animal.id} value={animal.nome}>
                          {animal.nome} - {animal.especie} {animal.raca && `(${animal.raca})`}
                        </option>
                      ))}
                    </datalist>
                    {animaisExistentes.length === 0 && (
                      <small style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>
                        <FiAlertCircle size={11} />
                        Nenhum animal cadastrado. Cadastre um animal primeiro.
                      </small>
                    )}
                  </div>

                  <div className="input-group">
                    <label className="input-label">TUTOR *</label>
                    <input
                      type="text"
                      name="tutor_nome"
                      className="form-input"
                      value={form.tutor_nome}
                      onChange={handleChange}
                      placeholder="Nome do responsável"
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">DATA DO RETORNO *</label>
                    <input
                      type="date"
                      name="data_retorno"
                      className="form-input"
                      value={form.data_retorno}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">HORÁRIO *</label>
                    <input
                      type="time"
                      name="horario"
                      className="form-input"
                      value={form.horario}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="input-group full-width">
                    <label className="input-label">MOTIVO DO RETORNO</label>
                    <textarea
                      name="motivo"
                      className="form-textarea"
                      rows="2"
                      placeholder="Ex: Revisão pós-cirurgia, Resultado de exames, etc."
                      value={form.motivo}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="input-group full-width">
                    <label className="input-label">OBSERVAÇÕES</label>
                    <textarea
                      name="observacoes"
                      className="form-textarea"
                      rows="2"
                      placeholder="Informações adicionais..."
                      value={form.observacoes}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="info-alert">
                  <FiInfo size={18} />
                  <span>
                    Retornos são consultas de acompanhamento. Mantenha o calendário atualizado para não perder prazos.
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={fecharModal} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "Salvando..." : (editId ? "Atualizar" : "Agendar Retorno")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}