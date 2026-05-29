import React, { useState, useEffect } from "react";
import { 
  FiPlus, FiCalendar, FiClock, FiX, FiSearch, FiEdit2, 
  FiTrash2, FiCheckCircle, FiXCircle, FiFilter, FiUser,
  FiInfo, FiAlertCircle, FiRefreshCw, FiHome
} from "react-icons/fi";
import { MdOutlinePets, MdOutlineMedicalServices, MdOutlineVaccines } from "react-icons/md";
import { FaWhatsapp } from "react-icons/fa";
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "../services/api";
import "./Agenda.css";

export default function Agenda() {
  const [showModal, setShowModal] = useState(false);
  const [agendamentos, setAgendamentos] = useState([]);
  const [animais, setAnimais] = useState([]);
  const [tutores, setTutores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [editId, setEditId] = useState(null);

  const tiposServico = ["Consulta", "Vacina", "Retorno", "Cirurgia", "Exame", "Emergência"];
  const statusOptions = ["Agendado", "Confirmado", "Concluído", "Cancelado"];

  const [form, setForm] = useState({
    animal_id: "",
    data: "",
    horario: "",
    tipo_servico: "Consulta",
    status: "Agendado",
    domiciliar: false,
    observacoes: ""
  });

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [resAgend, resAnim, resTut] = await Promise.all([
        apiGet("/agendamentos"),
        apiGet("/animais"),
        apiGet("/responsaveis")
      ]);
      
      if (resAgend.ok && resAnim.ok && resTut.ok) {
        setAgendamentos(await resAgend.json());
        setAnimais(await resAnim.json());
        setTutores(await resTut.json());
      }
    } catch (err) { 
      console.error("Erro ao carregar dados da agenda:", err); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = editId 
        ? await apiPut(`/agendamentos/${editId}`, form)
        : await apiPost("/agendamentos", form);
      
      if (response && response.ok) {
        setShowModal(false);
        resetForm();
        carregarDados();
      } else if (response) {
        const error = await response.json();
        alert(error.error || "Erro ao realizar agendamento.");
      }
    } catch (err) { 
      alert("Erro ao conectar com o servidor."); 
    } finally { 
      setLoading(false); 
    }
  };

  const atualizarStatus = async (id, novoStatus) => {
    try {
      const response = await apiPatch(`/agendamentos/${id}/status`, { status: novoStatus });
      if (response && response.ok) carregarDados();
    } catch (error) { console.error("Erro ao atualizar status:", error); }
  };

  const deletarAgendamento = async (id) => {
    if (window.confirm("Deseja excluir este agendamento?")) {
      try {
        const response = await apiDelete(`/agendamentos/${id}`);
        if (response && response.ok) carregarDados();
      } catch (error) { console.error("Erro ao deletar:", error); }
    }
  };

  const enviarWhatsApp = (ag) => {
    const animal = animais.find(a => a.id === ag.animal_id);
    const tutor = tutores.find(t => t.id === animal?.responsavel_id);
    
    if (!tutor?.telefone) {
      alert("Tutor não possui telefone cadastrado.");
      return;
    }

    const mensagem = `Olá ${tutor.nome}! 🐾 Lembrete da consulta do(a) ${animal.nome} amanhã (${ag.data}) às ${ag.horario}. Confirmamos sua presença?`;
    const fone = tutor.telefone.replace(/\D/g, "");
    window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(mensagem)}`, "_blank");
  };

  const resetForm = () => {
    setForm({
      animal_id: "", data: "", horario: "",
      tipo_servico: "Consulta", status: "Agendado", domiciliar: false, observacoes: ""
    });
    setEditId(null);
  };

  const abrirEdicao = (agendamento) => {
    setForm({
      animal_id: agendamento.animal_id,
      data: agendamento.data,
      horario: agendamento.horario,
      tipo_servico: agendamento.tipo_servico,
      status: agendamento.status,
      domiciliar: agendamento.domiciliar === 1 || agendamento.domiciliar === true,
      observacoes: agendamento.observacoes || ""
    });
    setEditId(agendamento.id);
    setShowModal(true);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "Agendado": { label: "Agendado", className: "status-agendado", icon: <FiCalendar size={11} /> },
      "Confirmado": { label: "Confirmado", className: "status-confirmado", icon: <FiCheckCircle size={11} /> },
      "Concluído": { label: "Concluído", className: "status-concluido", icon: <FiCheckCircle size={11} /> },
      "Cancelado": { label: "Cancelado", className: "status-cancelado", icon: <FiXCircle size={11} /> }
    };
    const s = statusMap[status] || statusMap["Agendado"];
    return (
      <span className={`status-badge ${s.className}`}>
        {s.icon}
        {s.label}
      </span>
    );
  };

  const getServicoIcon = (tipo) => {
    const icons = {
      "Consulta": <MdOutlineMedicalServices size={14} />,
      "Vacina": <MdOutlineVaccines size={14} />,
      "Retorno": <FiRefreshCw size={14} />,
      "Cirurgia": <FiInfo size={14} />,
      "Exame": <FiSearch size={14} />,
      "Emergência": <FiAlertCircle size={14} />
    };
    return icons[tipo] || <MdOutlineMedicalServices size={14} />;
  };

  const getNomeAnimal = (animalId) => {
    const animal = animais.find(a => a.id === animalId);
    return animal ? animal.nome : "Pet não identificado";
  };

  const agendamentosFiltrados = agendamentos.filter(ag => {
    const animalNome = getNomeAnimal(ag.animal_id).toLowerCase();
    const matchBusca = animalNome.includes(busca.toLowerCase()) || 
                       ag.tipo_servico?.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === "todos" || ag.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const agendamentosOrdenados = [...agendamentosFiltrados].sort((a, b) => {
    if (a.data === b.data) return a.horario.localeCompare(b.horario);
    return a.data.localeCompare(b.data);
  });

  return (
    <div className="agenda-container">
      <div className="page-header">
        <div className="header-info">
          <h1 className="page-title">Agenda Clínica</h1>
          <p className="page-subtitle">Gerencie os horários e atendimentos</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            <FiPlus size={18} />
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      <div className="agenda-card">
        <div className="filters-section">
          <div className="search-wrapper">
            <FiSearch className="search-icon" />
            <input
              className="search-input"
              placeholder="Buscar por pet ou serviço..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div className="status-filters">
            <button className={`filter-btn ${filtroStatus === "todos" ? "active" : ""}`} onClick={() => setFiltroStatus("todos")}>Todos</button>
            {statusOptions.map(status => (
              <button key={status} className={`filter-btn ${filtroStatus === status ? "active" : ""}`} onClick={() => setFiltroStatus(status)}>{status}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="agendamentos-list">
             {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton-card" style={{ height: '180px', background: '#f1f5f9', borderRadius: '14px', animation: 'shimmer 1.5s infinite', marginBottom: '12px' }} />
            ))}
          </div>
        ) : agendamentosOrdenados.length === 0 ? (
          <div className="empty-state">
            <FiCalendar size={48} />
            <p>Nenhum agendamento encontrado</p>
          </div>
        ) : (
          <div className="agendamentos-list">
            {agendamentosOrdenados.map((ag) => (
              <div key={ag.id} className={`agendamento-card-item ${ag.domiciliar ? 'domiciliar' : ''}`}>
                <div className="agendamento-card-header">
                  <div className="agendamento-avatar">
                    <MdOutlinePets size={28} />
                  </div>
                  <div className="agendamento-info">
                    <h3 className="agendamento-nome">
                      {getNomeAnimal(ag.animal_id)}
                      {ag.domiciliar === 1 && <span className="domiciliar-tag"><FiHome size={10} /> Domiciliar</span>}
                    </h3>
                    <p className="agendamento-servico">
                      {getServicoIcon(ag.tipo_servico)}
                      <span>{ag.tipo_servico}</span>
                    </p>
                  </div>
                  {getStatusBadge(ag.status)}
                </div>

                <div className="agendamento-card-body">
                  <div className="info-row">
                    <FiCalendar className="info-icon" size={14} />
                    <span>{ag.data}</span>
                  </div>
                  <div className="info-row">
                    <FiClock className="info-icon" size={14} />
                    <span>{ag.horario}</span>
                  </div>
                </div>

                <div className="agendamento-card-footer">
                  <div className="action-buttons">
                    {ag.status !== "Concluído" && ag.status !== "Cancelado" && (
                      <>
                        <button onClick={() => atualizarStatus(ag.id, "Confirmado")} className="action-btn confirm-btn">
                          <FiCheckCircle size={14} /> Confirmar
                        </button>
                        <button onClick={() => atualizarStatus(ag.id, "Concluído")} className="action-btn success-btn">
                          <FiCheckCircle size={14} /> Concluir
                        </button>
                      </>
                    )}
                  </div>
                  <div className="action-icons">
                    <button onClick={() => enviarWhatsApp(ag)} className="action-icon whatsapp-icon" title="Enviar WhatsApp"><FaWhatsapp size={16} /></button>
                    <button onClick={() => abrirEdicao(ag)} className="action-icon" title="Editar"><FiEdit2 size={14} /></button>
                    <button onClick={() => deletarAgendamento(ag.id)} className="action-icon" title="Excluir"><FiTrash2 size={14} /></button>
                  </div>
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
              <h2 className="modal-title"><FiCalendar size={22} /> {editId ? "Editar Agendamento" : "Novo Agendamento"}</h2>
              <button onClick={() => setShowModal(false)} className="modal-close"><FiX size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-scroll">
                <div className="form-grid">
                  <div className="input-group full-width">
                    <label className="input-label">PACIENTE (PET) *</label>
                    <select name="animal_id" className="form-input" required value={form.animal_id} onChange={handleChange}>
                      <option value="">Selecione um animal...</option>
                      {animais.map(pet => (
                        <option key={pet.id} value={pet.id}>{pet.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">DATA *</label>
                    <input type="date" name="data" className="form-input" required value={form.data} onChange={handleChange} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">HORÁRIO *</label>
                    <input type="time" name="horario" className="form-input" required value={form.horario} onChange={handleChange} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">TIPO</label>
                    <select name="tipo_servico" className="form-input" value={form.tipo_servico} onChange={handleChange}>
                      {tiposServico.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
                    </select>
                  </div>
                  {editId && (
                    <div className="input-group">
                      <label className="input-label">STATUS</label>
                      <select name="status" className="form-input" value={form.status} onChange={handleChange}>
                        {statusOptions.map(status => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="input-group full-width checkbox-group">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        name="domiciliar" 
                        checked={form.domiciliar} 
                        onChange={handleChange} 
                      />
                      <span>Consulta Domiciliar (Home Visit)</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Salvando..." : (editId ? "Atualizar" : "Agendar")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

