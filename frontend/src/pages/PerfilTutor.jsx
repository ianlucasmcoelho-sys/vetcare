import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  FiArrowLeft, FiUser, FiMail, FiPhone, FiMapPin, 
  FiCalendar, FiPackage, FiEdit2, FiTrash2, FiPlus,
  FiClock, FiAlertCircle, FiInfo, FiX, FiMessageSquare,
  FiPrinter, FiDownload
} from "react-icons/fi";
import { MdOutlinePets, MdOutlineVaccines, MdOutlineMedicalServices } from "react-icons/md";
import { apiGet, apiPost, apiPut, apiDelete } from "../services/api";
import "./PerfilTutor.css";

export default function PerfilTutor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tutor, setTutor] = useState(null);
  const [animais, setAnimais] = useState([]);
  const [consultas, setConsultas] = useState([]);
  const [vacinas, setVacinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("animais");
  const [showAnimalModal, setShowAnimalModal] = useState(false);
  const [editAnimalId, setEditAnimalId] = useState(null);

  const initialAnimalForm = {
    nome: "",
    especie: "",
    raca: "",
    sexo: "",
    nascimento: "",
    microchip: "",
    cor: "",
    peso: ""
  };

  const [animalForm, setAnimalForm] = useState(initialAnimalForm);

  const carregarTutor = async () => {
    try {
      const res = await apiGet(`/responsaveis/${id}`);
      if (res && res.ok) {
        const data = await res.json();
        setTutor(data);
      }
    } catch (err) {
      console.error("Erro ao carregar tutor:", err);
    }
  };

  const carregarAnimais = async () => {
    try {
      const res = await apiGet(`/animais?responsavel_id=${id}`);
      if (res && res.ok) {
        const data = await res.json();
        const lista = Array.isArray(data) ? data : [];
        const filtrados = lista.filter(a => String(a.responsavel_id) === String(id));
        setAnimais(filtrados);
      }
    } catch (err) {
      console.error("Erro ao carregar animais:", err);
    }
  };

  const carregarConsultas = async () => {
    try {
      const animaisRes = await apiGet(`/animais?responsavel_id=${id}`);
      if (animaisRes && animaisRes.ok) {
        const animaisData = await animaisRes.json();
        const lista = Array.isArray(animaisData) ? animaisData : [];
        const animaisDoTutor = lista.filter(a => String(a.responsavel_id) === String(id));
        let todasConsultas = [];
        for (const animal of animaisDoTutor) {
          const consultasRes = await apiGet(`/agendamentos/animal/${animal.id}`);
          if (consultasRes && consultasRes.ok) {
            const consultasData = await consultasRes.json();
            todasConsultas = [...todasConsultas, ...(Array.isArray(consultasData) ? consultasData.map(c => ({ ...c, pet_nome: animal.nome })) : [])];
          }
        }
        setConsultas(todasConsultas.sort((a, b) => b.data?.localeCompare(a.data)));
      }
    } catch (err) {
      console.error("Erro ao carregar consultas:", err);
    }
  };

  const carregarVacinas = async () => {
    try {
      const animaisRes = await apiGet(`/animais?responsavel_id=${id}`);
      if (animaisRes && animaisRes.ok) {
        const animaisData = await animaisRes.json();
        const lista = Array.isArray(animaisData) ? animaisData : [];
        const animaisDoTutor = lista.filter(a => String(a.responsavel_id) === String(id));
        let todasVacinas = [];
        for (const animal of animaisDoTutor) {
          const vacinasRes = await apiGet(`/vacinas/animal/${animal.id}`);
          if (vacinasRes && vacinasRes.ok) {
            const vacinasData = await vacinasRes.json();
            todasVacinas = [...todasVacinas, ...(Array.isArray(vacinasData) ? vacinasData.map(v => ({ ...v, pet_nome: animal.nome })) : [])];
          }
        }
        setVacinas(todasVacinas.sort((a, b) => b.data_aplicacao?.localeCompare(a.data_aplicacao)));
      }
    } catch (err) {
      console.error("Erro ao carregar vacinas:", err);
    }
  };

  useEffect(() => {
    const carregarTudo = async () => {
      setLoading(true);
      await Promise.all([
        carregarTutor(),
        carregarAnimais(),
        carregarConsultas(),
        carregarVacinas()
      ]);
      setLoading(false);
    };
    carregarTudo();
  }, [id]);

  const handleAnimalChange = (e) => {
    const { name, value } = e.target;
    setAnimalForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAnimalSubmit = async (e) => {
    e.preventDefault();
    try {
      const dados = { ...animalForm, responsavel_id: parseInt(id) };
      const res = editAnimalId 
        ? await apiPut(`/animais/${editAnimalId}`, dados)
        : await apiPost("/animais", dados);

      if (res && res.ok) {
        fecharAnimalModal();
        carregarAnimais();
        carregarConsultas();
        carregarVacinas();
      } else {
        const error = await res.json();
        alert(error.error || "Erro ao salvar animal.");
      }
    } catch (err) {
      console.error("Erro:", err);
      alert("Erro ao conectar com o servidor.");
    }
  };

  const fecharAnimalModal = () => {
    setShowAnimalModal(false);
    setAnimalForm(initialAnimalForm);
    setEditAnimalId(null);
  };

  const abrirAnimalModal = (animal = null) => {
    if (animal) {
      setAnimalForm({
        nome: animal.nome || "",
        especie: animal.especie || "",
        raca: animal.raca || "",
        sexo: animal.sexo || "",
        nascimento: animal.nascimento || "",
        microchip: animal.microchip || "",
        cor: animal.cor || "",
        peso: animal.peso || ""
      });
      setEditAnimalId(animal.id);
    } else {
      setAnimalForm(initialAnimalForm);
      setEditAnimalId(null);
    }
    setShowAnimalModal(true);
  };

  const deletarAnimal = async (animalId) => {
    if (window.confirm("Deseja excluir este animal?")) {
      try {
        const res = await apiDelete(`/animais/${animalId}`);
        if (res && res.ok) {
          carregarAnimais();
          carregarConsultas();
          carregarVacinas();
        }
      } catch (err) {
        alert("Erro ao excluir animal.");
      }
    }
  };

  const getSexoIcon = (sexo) => {
    if (sexo === "M") return "♂";
    if (sexo === "F") return "♀";
    return "";
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "Agendado": { label: "Agendado", className: "status-agendado" },
      "Confirmado": { label: "Confirmado", className: "status-confirmado" },
      "Concluído": { label: "Concluído", className: "status-concluido" },
      "Cancelado": { label: "Cancelado", className: "status-cancelado" }
    };
    const s = statusMap[status] || statusMap["Agendado"];
    return <span className={`status-badge ${s.className}`}>{s.label}</span>;
  };

  const isVencida = (dataProximaDose) => {
    if (!dataProximaDose) return false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const data = new Date(dataProximaDose);
    return data < hoje;
  };

  const enviarWhatsApp = () => {
    const numero = tutor?.celular?.replace(/\D/g, '');
    if (numero && numero.length >= 10) {
      window.open(`https://wa.me/55${numero}`, '_blank');
    } else {
      alert("Número de telefone não informado ou inválido");
    }
  };

  const enviarEmail = () => {
    if (tutor?.email && tutor.email.includes('@')) {
      window.location.href = `mailto:${tutor.email}`;
    } else {
      alert("E-mail não informado ou inválido");
    }
  };

  const totalAnimais = animais.length;
  const totalConsultas = consultas.length;
  const vacinasProximas = vacinas.filter(v => !isVencida(v.proxima_dose) && v.proxima_dose).length;
  const vacinasVencidas = vacinas.filter(v => isVencida(v.proxima_dose)).length;

  if (loading) {
    return (
      <div className="perfil-container">
        <div className="loading-skeleton">
          <div className="skeleton-header"></div>
          <div className="skeleton-card"></div>
        </div>
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="perfil-container">
        <div className="empty-state">
          <FiUser size={48} />
          <p>Tutor não encontrado</p>
          <button className="btn-primary" onClick={() => navigate("/responsaveis")}>
            Voltar para lista
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="perfil-container">
      <div className="perfil-header">
        <button className="btn-back" onClick={() => navigate("/responsaveis")}>
          <FiArrowLeft size={20} />
          <span>Voltar</span>
        </button>
        <div className="header-actions">
          <button className="btn-outline" onClick={enviarWhatsApp}>
            <FiMessageSquare size={16} />
            WhatsApp
          </button>
          <button className="btn-outline" onClick={enviarEmail}>
            <FiMail size={16} />
            E-mail
          </button>
        </div>
      </div>

      <div className="tutor-card">
        <div className="tutor-avatar">
          <FiUser size={48} />
        </div>
        <div className="tutor-info">
          <h1 className="tutor-nome">{tutor.nome}</h1>
          <div className="tutor-detalhes-grid">
            {tutor.celular && (
              <div className="detalhe-item">
                <FiPhone className="detalhe-icon" />
                <span>{tutor.celular}</span>
              </div>
            )}
            {tutor.email && (
              <div className="detalhe-item">
                <FiMail className="detalhe-icon" />
                <span>{tutor.email}</span>
              </div>
            )}
            {tutor.cpf && (
              <div className="detalhe-item">
                <FiPackage className="detalhe-icon" />
                <span>CPF: {tutor.cpf}</span>
              </div>
            )}
            {(tutor.endereco || tutor.cidade) && (
              <div className="detalhe-item">
                <FiMapPin className="detalhe-icon" />
                <span>{[tutor.endereco, tutor.cidade, tutor.estado].filter(Boolean).join(", ")}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="tutor-stats">
        <div className="stat-item">
          <MdOutlinePets size={24} />
          <div>
            <span className="stat-number">{totalAnimais}</span>
            <span className="stat-label">Animais</span>
          </div>
        </div>
        <div className="stat-item">
          <FiCalendar size={24} />
          <div>
            <span className="stat-number">{totalConsultas}</span>
            <span className="stat-label">Consultas</span>
          </div>
        </div>
        <div className="stat-item">
          <MdOutlineVaccines size={24} />
          <div>
            <span className="stat-number">{vacinasProximas}</span>
            <span className="stat-label">Vacinas (próximas)</span>
          </div>
        </div>
        <div className="stat-item warning">
          <FiAlertCircle size={24} />
          <div>
            <span className="stat-number">{vacinasVencidas}</span>
            <span className="stat-label">Vacinas vencidas</span>
          </div>
        </div>
      </div>

      <div className="perfil-tabs">
        <button className={`tab-btn ${activeTab === "animais" ? "active" : ""}`} onClick={() => setActiveTab("animais")}>
          <MdOutlinePets size={18} /> Animais ({totalAnimais})
        </button>
        <button className={`tab-btn ${activeTab === "consultas" ? "active" : ""}`} onClick={() => setActiveTab("consultas")}>
          <FiCalendar size={18} /> Consultas ({totalConsultas})
        </button>
        <button className={`tab-btn ${activeTab === "vacinas" ? "active" : ""}`} onClick={() => setActiveTab("vacinas")}>
          <MdOutlineVaccines size={18} /> Vacinas ({vacinas.length})
        </button>
      </div>

      <div className="tab-content">
        {activeTab === "animais" && (
          <div className="animais-section">
            <div className="section-header">
              <h3>Todos os Animais</h3>
              <button className="btn-primary btn-sm" onClick={() => abrirAnimalModal()}><FiPlus size={16} /> Novo Animal</button>
            </div>

            {animais.length === 0 ? (
              <div className="empty-animais">
                <MdOutlinePets size={48} />
                <p>Nenhum animal cadastrado</p>
              </div>
            ) : (
              <div className="animais-grid-perfil">
                {animais.map((animal) => (
                  <div key={animal.id} className="animal-card-perfil">
                    <div className="animal-card-header">
                      <div className="animal-avatar"><MdOutlinePets size={28} /></div>
                      <div className="animal-info">
                        <h4 className="animal-nome">{animal.nome} <span className={`animal-sexo ${animal.sexo === "M" ? "sexo-m" : "sexo-f"}`}>{getSexoIcon(animal.sexo)}</span></h4>
                        <p className="animal-raca">{animal.especie} {animal.raca && `• ${animal.raca}`}</p>
                      </div>
                      <div className="animal-actions">
                        <button onClick={() => abrirAnimalModal(animal)} className="icon-btn edit"><FiEdit2 size={14} /></button>
                        <button onClick={() => deletarAnimal(animal.id)} className="icon-btn delete"><FiTrash2 size={14} /></button>
                      </div>
                    </div>
                    <div className="animal-card-body">
                      {animal.microchip && <div className="animal-microchip"><FiPackage size={12} /><span>Microchip: {animal.microchip}</span></div>}
                      {animal.nascimento && <div className="animal-nascimento"><FiCalendar size={12} /><span>Nascimento: {animal.nascimento}</span></div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "consultas" && (
          <div className="consultas-section">
            <h3>Histórico de Consultas</h3>
            {consultas.length === 0 ? (
              <div className="empty-consultas"><FiCalendar size={48} /><p>Nenhuma consulta registrada</p></div>
            ) : (
              <div className="consultas-list-perfil">
                {consultas.map((consulta) => (
                  <div key={consulta.id} className="consulta-card">
                    <div className="consulta-header">
                      <div className="consulta-pet"><MdOutlinePets size={16} /><strong>{consulta.pet_nome}</strong></div>
                      {getStatusBadge(consulta.status)}
                    </div>
                    <div className="consulta-body">
                      <div className="consulta-info"><FiCalendar size={14} /><span>{consulta.data}</span></div>
                      <div className="consulta-info"><FiClock size={14} /><span>{consulta.horario}</span></div>
                      <div className="consulta-info"><MdOutlineMedicalServices size={14} /><span>{consulta.tipo_servico || "Consulta"}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "vacinas" && (
          <div className="vacinas-section">
            <h3>Histórico de Vacinas</h3>
            {vacinas.length === 0 ? (
              <div className="empty-vacinas"><MdOutlineVaccines size={48} /><p>Nenhuma vacina registrada</p></div>
            ) : (
              <div className="vacinas-list-perfil">
                {vacinas.map((vacina) => {
                  const vencida = isVencida(vacina.proxima_dose);
                  return (
                    <div key={vacina.id} className={`vacina-card ${vencida ? "vencida" : ""}`}>
                      <div className="vacina-header">
                        <div className="vacina-pet"><MdOutlinePets size={16} /><strong>{vacina.pet_nome}</strong></div>
                        {vencida && <span className="vacina-status-vencida">Vencida</span>}
                      </div>
                      <div className="vacina-body">
                        <div className="vacina-info"><MdOutlineVaccines size={14} /><span>{vacina.nome_vacina}</span></div>
                        <div className="vacina-info"><FiCalendar size={14} /><span>Aplicação: {vacina.data_aplicacao}</span></div>
                        {vacina.proxima_dose && <div className={`vacina-info ${vencida ? "warning" : ""}`}><FiAlertCircle size={14} /><span>Próxima dose: {vacina.proxima_dose}</span></div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {showAnimalModal && (
        <div className="modal-overlay" onClick={fecharAnimalModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title"><MdOutlinePets size={22} /> {editAnimalId ? "Editar Animal" : "Novo Animal"}</h2>
              <button onClick={fecharAnimalModal} className="modal-close"><FiX size={24} /></button>
            </div>
            <form onSubmit={handleAnimalSubmit} className="modal-form">
              <div className="form-scroll">
                <div className="form-grid">
                  <div className="input-group full-width"><label className="input-label">NOME *</label><input type="text" name="nome" value={animalForm.nome} onChange={handleAnimalChange} className="form-input" required /></div>
                  <div className="input-group"><label className="input-label">ESPÉCIE *</label><select name="especie" value={animalForm.especie} onChange={handleAnimalChange} className="form-input" required><option value="">Selecione</option><option value="Cão">Cão</option><option value="Gato">Gato</option><option value="Ave">Ave</option><option value="Roedor">Roedor</option><option value="Réptil">Réptil</option><option value="Outro">Outro</option></select></div>
                  <div className="input-group"><label className="input-label">RAÇA</label><input type="text" name="raca" value={animalForm.raca} onChange={handleAnimalChange} className="form-input" /></div>
                  <div className="input-group"><label className="input-label">SEXO</label><select name="sexo" value={animalForm.sexo} onChange={handleAnimalChange} className="form-input"><option value="">Selecione</option><option value="M">Macho</option><option value="F">Fêmea</option></select></div>
                  <div className="input-group"><label className="input-label">DATA NASCIMENTO</label><input type="date" name="nascimento" value={animalForm.nascimento} onChange={handleAnimalChange} className="form-input" /></div>
                  <div className="input-group"><label className="input-label">MICROCHIP</label><input type="text" name="microchip" value={animalForm.microchip} onChange={handleAnimalChange} className="form-input" /></div>
                  <div className="input-group"><label className="input-label">COR</label><input type="text" name="cor" value={animalForm.cor} onChange={handleAnimalChange} className="form-input" /></div>
                  <div className="input-group"><label className="input-label">PESO (kg)</label><input type="number" step="0.01" name="peso" value={animalForm.peso} onChange={handleAnimalChange} className="form-input" /></div>
                </div>
              </div>
              <div className="modal-footer"><button type="button" onClick={fecharAnimalModal} className="btn-secondary">Cancelar</button><button type="submit" className="btn-primary">{editAnimalId ? "Atualizar" : "Salvar Animal"}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
