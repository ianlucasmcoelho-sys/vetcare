import React, { useState, useEffect } from "react";
import { 
  FiPlus, FiCheck, FiX, FiActivity, FiClock, FiThermometer, 
  FiChevronRight, FiAlertCircle, FiInfo, FiTrash2, FiUser, FiCalendar,
  FiFileText, FiSearch
} from "react-icons/fi";
import { MdOutlinePets } from "react-icons/md";
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from "../services/api";
import "./Internacao.css";

export default function Internacao() {
  const [internacoes, setInternacoes] = useState([]);
  const [animais, setAnimais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInternacao, setSelectedInternacao] = useState(null);
  const [details, setDetails] = useState(null);
  const [activeTab, setActiveTab] = useState("agenda");
  const [busca, setBusca] = useState("");

  const [formData, setFormData] = useState({
    animal_id: "",
    data_entrada: new Date().toISOString().split('T')[0],
    motivo: "",
    observacoes: ""
  });

  const [medData, setMedData] = useState({
    medicamento: "",
    dosagem: "",
    horario_agendado: "",
    data_agendada: new Date().toISOString().split('T')[0]
  });

  const [sinaisData, setSinaisData] = useState({
    temperatura: "",
    frequencia_cardiaca: "",
    frequencia_respiratoria: "",
    peso: "",
    observacao: ""
  });

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [intRes, animaisRes] = await Promise.all([
        apiGet("/internacoes/ativas"),
        apiGet("/animais")
      ]);
      if (intRes.ok) setInternacoes(await intRes.json());
      if (animaisRes.ok) setAnimais(await animaisRes.json());
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  const carregarDetalhes = async (id) => {
    try {
      const res = await apiGet(`/internacoes/${id}`);
      if (res.ok) setDetails(await res.json());
    } catch (err) {
      console.error("Erro ao carregar detalhes:", err);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  const handleOpenDetails = (i) => {
    setSelectedInternacao(i);
    carregarDetalhes(i.id);
    setShowDetailModal(true);
  };

  const handleCreateInternacao = async (e) => {
    e.preventDefault();
    const res = await apiPost("/internacoes", formData);
    if (res.ok) {
      setShowModal(false);
      setFormData({ animal_id: "", data_entrada: new Date().toISOString().split('T')[0], motivo: "", observacoes: "" });
      carregarDados();
    }
  };

  const handleAddMed = async (e) => {
    e.preventDefault();
    const res = await apiPost("/internacoes/medicacao", { ...medData, internacao_id: selectedInternacao.id });
    if (res.ok) {
      setMedData({ medicamento: "", dosagem: "", horario_agendado: "", data_agendada: new Date().toISOString().split('T')[0] });
      carregarDetalhes(selectedInternacao.id);
    }
  };

  const handleAplicarMed = async (id) => {
    const res = await apiPatch(`/internacoes/medicacao/${id}/aplicar`);
    if (res.ok) carregarDetalhes(selectedInternacao.id);
  };

  const handleAddSinais = async (e) => {
    e.preventDefault();
    const res = await apiPost("/internacoes/sinais-vitais", { ...sinaisData, internacao_id: selectedInternacao.id });
    if (res.ok) {
      setSinaisData({ temperatura: "", frequencia_cardiaca: "", frequencia_respiratoria: "", peso: "", observacao: "" });
      carregarDetalhes(selectedInternacao.id);
    }
  };

  const handleAlta = async (id) => {
    if (window.confirm("Confirmar alta médica deste paciente?")) {
      await apiPut(`/internacoes/${id}`, { status: 'alta', data_saida: new Date().toISOString().split('T')[0] });
      setShowDetailModal(false);
      carregarDados();
    }
  };

  const internacoesFiltradas = internacoes.filter(i => 
    i.animal_nome?.toLowerCase().includes(busca.toLowerCase()) ||
    i.tutor_nome?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="internacao-container reveal-fade">
      <div className="page-header">
        <div className="header-info">
          <h1 className="page-title">Mapa de Internação</h1>
          <p className="page-subtitle">Monitoramento hospitalar e cuidados contínuos</p>
        </div>
        <div className="header-actions">
           <button className="v-btn-primary-glow" onClick={() => setShowModal(true)}>
            <FiPlus /> <span>Registrar Internação</span>
          </button>
        </div>
      </div>

      <div className="internacao-card-main reveal-up" style={{animationDelay: '0.1s'}}>
        <div className="search-section v-glass-panel reveal-up" style={{animationDelay: "0.1s"}}>
          <div className="search-wrapper">
            <FiSearch className="search-icon" />
            <input
              className="search-input"
              placeholder="Buscar por pet ou tutor internado..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            {busca && <button className="search-clear" onClick={() => setBusca("")}><FiX /></button>}
          </div>
        </div>

        {loading ? (
          <div className="pacientes-grid">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton-card-hospital" />
            ))}
          </div>
        ) : internacoesFiltradas.length === 0 ? (
          <div className="empty-state">
            <FiActivity size={48} />
            <p>Nenhum paciente internado no momento</p>
            <button className="btn-outline" onClick={() => setShowModal(true)}>Internar Animal</button>
          </div>
        ) : (
          <div className="pacientes-grid">
            {internacoesFiltradas.map(i => (
              <div key={i.id} className="paciente-card-item v-glass-panel" onClick={() => handleOpenDetails(i)} style={{animationDelay: `${0.1 + (0.05 * (i.id % 10))}s`}}>
                <div className="paciente-card-badge">Internado</div>
                
                <div className="paciente-card-header">
                  <div className="pet-avatar-hospital">
                    <MdOutlinePets size={24} />
                  </div>
                  <div className="pet-info">
                    <h3 className="pet-nome">{i.animal_nome}</h3>
                    <p className="pet-tutor">
                      <FiUser size={12} /> {i.tutor_nome}
                    </p>
                  </div>
                </div>

                <div className="paciente-card-body">
                  <div className="hospital-info-row">
                    <div className="info-item">
                      <FiInfo className="info-icon" />
                      <span className="info-label">MOTIVO</span>
                      <span className="info-value">{i.motivo}</span>
                    </div>
                    <div className="info-item">
                      <FiClock className="info-icon" />
                      <span className="info-label">ENTRADA</span>
                      <span className="info-value">{new Date(i.data_entrada).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="paciente-card-footer">
                  <span className="id-tag">PAT-#{String(i.id).padStart(4, '0')}</span>
                  <div className="card-actions-hint">
                    Ver Prontuário <FiChevronRight />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Hospitalar de Detalhes (O Mapa Dinâmico) */}
      {showDetailModal && details && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content hospital-modal-premium" onClick={e => e.stopPropagation()}>
            <div className="hospital-header-fixed">
              <div className="patient-brand">
                <div className="patient-avatar-gradient">
                  <MdOutlinePets size={30} />
                </div>
                <div>
                  <h2 className="hospital-title">{details.animal_nome}</h2>
                  <p className="hospital-subtitle">{details.animal_especie} • Admitido em {new Date(details.data_entrada).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="hospital-actions">
                <button className="btn-alta-action" onClick={() => handleAlta(details.id)}>
                  <FiCheck /> Confirmar Alta
                </button>
                <button className="btn-close-circle" onClick={() => setShowDetailModal(false)}>
                  <FiX size={20} />
                </button>
              </div>
            </div>

            <div className="hospital-tabs-nav">
              <button className={`nav-tab ${activeTab === 'agenda' ? 'active' : ''}`} onClick={() => setActiveTab('agenda')}>
                <FiClock /> Agenda Médica
              </button>
              <button className={`nav-tab ${activeTab === 'sinais' ? 'active' : ''}`} onClick={() => setActiveTab('sinais')}>
                <FiActivity /> Sinais Vitais
              </button>
            </div>

            <div className="hospital-content-scroll">
              {activeTab === 'agenda' ? (
                <div className="hospital-view-panel">
                  <div className="quick-add-med">
                    <h4 className="section-mini-title">Agendar Próxima Medicação</h4>
                    <form onSubmit={handleAddMed} className="inline-med-form">
                      <input placeholder="Medicamento" value={medData.medicamento} onChange={e => setMedData({...medData, medicamento: e.target.value})} required />
                      <input placeholder="Dose" value={medData.dosagem} onChange={e => setMedData({...medData, dosagem: e.target.value})} />
                      <input type="time" value={medData.horario_agendado} onChange={e => setMedData({...medData, horario_agendado: e.target.value})} required />
                      <button type="submit" className="btn-add-med"><FiPlus /></button>
                    </form>
                  </div>

                  <div className="med-timeline">
                    {details.medicacoes.length === 0 ? (
                      <div className="no-data-hospital">Sem medicações agendadas.</div>
                    ) : (
                      details.medicacoes.map(m => (
                        <div key={m.id} className={`med-card-hospital ${m.status}`}>
                          <div className="med-time-box">
                            <span className="time">{m.horario_agendado}</span>
                            <span className="date">{m.data_agendada}</span>
                          </div>
                          <div className="med-detail">
                            <strong>{m.medicamento}</strong>
                            <span>Dose: {m.dosagem || "Conforme bula"}</span>
                          </div>
                          <div className="med-status-action">
                            {m.status === 'pendente' ? (
                              <button className="btn-apply-now" onClick={() => handleAplicarMed(m.id)}>Aplicar Agora</button>
                            ) : (
                              <span className="status-badge-applied"><FiCheck /> Aplicado</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="hospital-view-panel">
                  <form className="vital-signs-form" onSubmit={handleAddSinais}>
                    <h4 className="section-mini-title">Novo Registro Clínico</h4>
                    <div className="vital-grid">
                      <div className="vital-input">
                        <label>Temperatura</label>
                        <div className="input-unit">
                          <FiThermometer />
                          <input placeholder="0.0" value={sinaisData.temperatura} onChange={e => setSinaisData({...sinaisData, temperatura: e.target.value})} />
                          <span>°C</span>
                        </div>
                      </div>
                      <div className="vital-input">
                        <label>Frequência Card.</label>
                        <div className="input-unit">
                          <FiActivity />
                          <input placeholder="000" value={sinaisData.frequencia_cardiaca} onChange={e => setSinaisData({...sinaisData, frequencia_cardiaca: e.target.value})} />
                          <span>bpm</span>
                        </div>
                      </div>
                      <div className="vital-input">
                        <label>Peso Atual</label>
                        <div className="input-unit">
                          <MdOutlinePets />
                          <input placeholder="0.0" value={sinaisData.peso} onChange={e => setSinaisData({...sinaisData, peso: e.target.value})} />
                          <span>kg</span>
                        </div>
                      </div>
                    </div>
                    <div className="vital-textarea">
                      <label>Evolução / Observação</label>
                      <textarea placeholder="Como o paciente está reagindo?" value={sinaisData.observacao} onChange={e => setSinaisData({...sinaisData, observacao: e.target.value})} />
                    </div>
                    <button type="submit" className="btn-save-vitals">Salvar Parâmetros</button>
                  </form>

                  <div className="vitals-history-list">
                    <h4 className="section-mini-title">Histórico de Evolução</h4>
                    {details.sinais.map(s => (
                      <div key={s.id} className="vitals-history-card">
                        <div className="vitals-header">
                          <FiCalendar /> {new Date(s.created_at).toLocaleString()}
                        </div>
                        <div className="vitals-body-grid">
                          <div className="v-tag">Temp: <strong>{s.temperatura}°C</strong></div>
                          <div className="v-tag">FC: <strong>{s.frequencia_cardiaca} bpm</strong></div>
                          <div className="v-tag">Peso: <strong>{s.peso}kg</strong></div>
                        </div>
                        {s.observacao && <p className="v-comment">{s.observacao}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Internação - 100% Padrão "Responsaveis" */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content internacao-modal-fixed" onClick={e => e.stopPropagation()}>
             <div className="modal-header">
               <h2 className="modal-title">
                 <FiActivity size={22} />
                 Nova Internação
               </h2>
               <button onClick={() => setShowModal(false)} className="modal-close"><FiX size={20} /></button>
             </div>

             <form onSubmit={handleCreateInternacao} className="modal-form">
               <div className="form-scroll">
                 <div className="form-grid">
                    <div className="input-group full-width">
                      <label className="input-label">BUSCAR ANIMAL *</label>
                      <div className="custom-input-wrapper">
                        <MdOutlinePets className="input-icon-inner" />
                        <input 
                          list="animais-list"
                          className="form-input icon-padding" 
                          placeholder="Digite o nome do pet..."
                          value={animais.find(a => String(a.id) === String(formData.animal_id))?.nome || ""}
                          onChange={e => {
                            const pet = animais.find(a => a.nome === e.target.value);
                            if (pet) setFormData({...formData, animal_id: pet.id});
                          }}
                          required
                        />
                        <datalist id="animais-list">
                          {animais.map(a => <option key={a.id} value={a.nome}>{a.especie}</option>)}
                        </datalist>
                      </div>
                    </div>
                    <div className="input-group">
                      <label className="input-label">DATA DE ENTRADA *</label>
                      <input type="date" className="form-input" value={formData.data_entrada} onChange={e => setFormData({...formData, data_entrada: e.target.value})} required />
                    </div>
                    <div className="input-group">
                      <label className="input-label">MOTIVO DA ADMISSÃO *</label>
                      <input className="form-input" placeholder="Ex: Pós-cirúrgico" value={formData.motivo} onChange={e => setFormData({...formData, motivo: e.target.value})} required />
                    </div>
                    <div className="input-group full-width">
                      <label className="input-label">PLANO DE CUIDADOS / OBSERVAÇÕES</label>
                      <textarea 
                        className="form-textarea" 
                        rows="4" 
                        placeholder="Protocolos e observações iniciais..."
                        value={formData.observacoes} 
                        onChange={e => setFormData({...formData, observacoes: e.target.value})} 
                      />
                    </div>
                 </div>

                 <div className="hospital-info-box">
                   <FiAlertCircle size={18} />
                   <span>O paciente será monitorado em tempo real no Quadro Hospitalar após a admissão.</span>
                 </div>
               </div>

               <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="v-btn-primary-glow">
                    <FiCheck /> Confirmar Internação
                  </button>
               </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
