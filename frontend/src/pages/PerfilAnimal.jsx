import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  FiArrowLeft, FiUser, FiCalendar, FiPackage, FiEdit2, FiTrash2, 
  FiClock, FiAlertCircle, FiInfo, FiX, FiPrinter, FiDownload, FiActivity
} from "react-icons/fi";
import { MdOutlinePets, MdOutlineVaccines, MdOutlineMedicalServices } from "react-icons/md";
import { TbFlask } from "react-icons/tb";
import { apiGet, apiDelete } from "../services/api";
import "./PerfilAnimal.css";
import MedicalRecordPreview from "../components/MedicalRecordPreview";

export default function PerfilAnimal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [animal, setAnimal] = useState(null);
  const [tutor, setTutor] = useState(null);
  const [prontuarios, setProntuarios] = useState([]);
  const [vacinas, setVacinas] = useState([]);
  const [exames, setExames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [printOpen, setPrintOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("linha_do_tempo");

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      try {
        const [animalRes, prontuariosRes, vacinasRes, examesRes] = await Promise.all([
          apiGet(`/animais/${id}`),
          apiGet(`/prontuarios/animal/${id}`),
          apiGet(`/vacinas/animal/${id}`),
          apiGet(`/exames/animal/${id}`)
        ]);

        if (animalRes.ok) {
          const animalData = await animalRes.json();
          setAnimal(animalData);
          
          // Carregar tutor do animal
          if (animalData.responsavel_id) {
            const tutorRes = await apiGet(`/responsaveis/${animalData.responsavel_id}`);
            if (tutorRes.ok) setTutor(await tutorRes.json());
          }
        }
        
        if (prontuariosRes.ok) setProntuarios(await prontuariosRes.json());
        if (vacinasRes.ok) setVacinas(await vacinasRes.json());
        if (examesRes.ok) setExames(await examesRes.json());

      } catch (err) {
        console.error("Erro ao carregar perfil do animal:", err);
      } finally {
        setLoading(false);
      }
    };
    carregarDados();
  }, [id]);

  // Criar Linha do Tempo Unificada
  const getHistoricoUnificado = () => {
    const historico = [];
    
    prontuarios.forEach(p => {
      historico.push({
        id: `pront_${p.id}`,
        tipo: 'prontuario',
        data: p.data_visita,
        titulo: 'Consulta / Prontuário',
        subtitulo: `Vet: ${p.veterinario || "Clínica"}`,
        conteudo: `Sintomas: ${p.sintomas} | Diagnóstico: ${p.diagnostico}`,
        icone: <FiInfo />
      });
    });

    vacinas.forEach(v => {
      historico.push({
        id: `vac_${v.id}`,
        tipo: 'vacina',
        data: v.data_aplicacao,
        titulo: `Vacina: ${v.nome_vacina}`,
        subtitulo: `Próxima Dose: ${v.proxima_dose || 'N/A'}`,
        conteudo: 'Aplicação de imunizante.',
        icone: <MdOutlineVaccines />
      });
    });

    exames.forEach(e => {
      historico.push({
        id: `exa_${e.id}`,
        tipo: 'exame',
        data: e.data_solicitacao,
        titulo: `Exame: ${e.tipo_exame}`,
        subtitulo: `Status: ${e.status}`,
        conteudo: `Laboratório: ${e.laboratorio || "Interno"}`,
        icone: <TbFlask />
      });
    });

    // Ordenar por data (mais recente primeiro)
    return historico.sort((a, b) => new Date(b.data) - new Date(a.data));
  };

  const historicoUnificado = getHistoricoUnificado();

  const deletarAnimal = async () => {
    if (window.confirm("Deseja realmente excluir este animal e todo seu histórico?")) {
      const res = await apiDelete(`/animais/${id}`);
      if (res.ok) navigate("/animais");
    }
  };

  if (loading) return <div className="loading-screen">Carregando prontuário...</div>;
  if (!animal) return <div className="error-screen">Animal não encontrado.</div>;

  return (
    <div className="perfil-animal-container fade-in">
      {printOpen && <MedicalRecordPreview records={prontuarios} patient={{...animal, tutor_nome: tutor?.nome}} onClose={() => setPrintOpen(false)} />}
      <div className="perfil-header">
        <button className="btn-back" onClick={() => navigate("/animais")}>
          <FiArrowLeft /> Voltar
        </button>
        <div className="header-actions">
          <button className="btn-outline" onClick={() => setPrintOpen(true)}>
            <FiPrinter /> Imprimir Prontuário
          </button>
          <button className="btn-danger-outline" onClick={deletarAnimal}>
            <FiTrash2 /> Excluir Registro
          </button>
        </div>
      </div>

      <div className="perfil-top-grid">
        <div className="animal-main-card">
          <div className="animal-avatar-large">
            <MdOutlinePets size={40} />
          </div>
          <div className="animal-basic-info">
            <div className="name-row">
              <h1>{animal.nome}</h1>
              <span className={`sex-badge ${animal.sexo === 'M' ? 'male' : 'female'}`}>
                {animal.sexo === 'M' ? '♂ Macho' : '♀ Fêmea'}
              </span>
            </div>
            <p className="species-race">{animal.especie} • {animal.raca || "SRD"}</p>
            <div className="tags-row">
              {animal.obito === 1 && <span className="tag" style={{ background: '#fee2e2', color: '#ef4444', borderColor: '#fca5a5' }}>Óbito</span>}
              {animal.castrado === 1 && <span className="tag">Castrado</span>}
              {animal.porte && <span className="tag">{animal.porte}</span>}
              {animal.microchip && <span className="tag-microchip"><FiPackage /> {animal.microchip}</span>}
            </div>
          </div>
        </div>

        <div className="tutor-mini-card" onClick={() => navigate(`/perfil-tutor/${animal.responsavel_id}`)}>
          <div className="tutor-avatar-mini">
            <FiUser />
          </div>
          <div className="tutor-info-mini">
            <label>Tutor Responsável</label>
            <strong>{tutor?.nome || "Não vinculado"}</strong>
            <span>{tutor?.celular || "Sem contato"}</span>
          </div>
        </div>
      </div>

      <div className="perfil-stats-row">
        <div className="stat-card">
          <div className="stat-icon"><FiActivity /></div>
          <div className="stat-data">
            <label>{animal.nascimento ? "Nascimento" : "Idade"}</label>
            <strong>
              {animal.nascimento
                ? animal.nascimento
                : animal.idade !== null && animal.idade !== undefined
                  ? `${animal.idade} ${animal.idade_unidade || "anos"}`
                  : "Não informada"}
            </strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FiAlertCircle color="#ef4444" /></div>
          <div className="stat-data">
            <label>Alergias / Crônicas</label>
            <strong className="text-danger">{animal.alergias || "Nenhuma registrada"}</strong>
          </div>
        </div>
        {animal.obito === 1 && (
          <div className="stat-card" style={{ borderColor: '#fca5a5', background: '#fef2f2' }}>
            <div className="stat-icon" style={{ background: '#fee2e2', color: '#ef4444' }}><FiAlertCircle /></div>
            <div className="stat-data">
              <label style={{ color: '#ef4444' }}>Data do Óbito</label>
              <strong style={{ color: '#ef4444' }}>
                {animal.data_obito ? new Date(animal.data_obito + "T00:00:00").toLocaleDateString() : "Não informada"}
              </strong>
            </div>
          </div>
        )}
      </div>

      <div className="perfil-tabs">
        <button className={`tab-btn ${activeTab === 'linha_do_tempo' ? 'active' : ''}`} onClick={() => setActiveTab('linha_do_tempo')}>
          <FiClock /> Linha do Tempo
        </button>
        <button className={`tab-btn ${activeTab === 'prontuario' ? 'active' : ''}`} onClick={() => setActiveTab('prontuario')}>
          <FiInfo /> Prontuário
        </button>
        <button className={`tab-btn ${activeTab === 'vacinas' ? 'active' : ''}`} onClick={() => setActiveTab('vacinas')}>
          <MdOutlineVaccines /> Vacinas
        </button>
        <button className={`tab-btn ${activeTab === 'exames' ? 'active' : ''}`} onClick={() => setActiveTab('exames')}>
          <TbFlask /> Exames
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'linha_do_tempo' && (
          <div className="timeline-container">
            {historicoUnificado.length === 0 ? (
              <div className="empty-tab">Nenhum evento registrado na história do animal.</div>
            ) : (
              historicoUnificado.map(evento => (
                <div key={evento.id} className={`timeline-item ${evento.tipo}`}>
                  <div className="timeline-date">
                    <span>{new Date(evento.data).toLocaleDateString()}</span>
                  </div>
                  <div className="timeline-badge">{evento.icone}</div>
                  <div className="timeline-content">
                    <div className="visit-header">
                      <h3>{evento.titulo}</h3>
                      <span className="vet-name">{evento.subtitulo}</span>
                    </div>
                    <div className="visit-body">
                      <p>{evento.conteudo}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'prontuario' && (
          <div className="timeline-container">
            {prontuarios.length === 0 ? (
              <div className="empty-tab">Nenhum histórico médico registrado ainda.</div>
            ) : (
              prontuarios.map(p => (
                <div key={p.id} className="timeline-item">
                  <div className="timeline-date">
                    <span>{new Date(p.data_visita).toLocaleDateString()}</span>
                  </div>
                  <div className="timeline-content">
                    <div className="visit-header">
                      <h3>Consulta / Procedimento</h3>
                      <span className="vet-name">Vet: {p.veterinario || "Clínica"}</span>
                    </div>
                    <div className="visit-body">
                      <p><strong>Sintomas:</strong> {p.sintomas}</p>
                      <p><strong>Diagnóstico:</strong> {p.diagnostico}</p>
                      <p><strong>Tratamento:</strong> {p.tratamento}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'vacinas' && (
          <div className="vacinas-grid-perfil">
            {vacinas.length === 0 ? (
              <div className="empty-tab">Nenhuma vacina aplicada.</div>
            ) : (
              vacinas.map(v => (
                <div key={v.id} className="vacina-card-mini">
                  <div className="vacina-icon"><MdOutlineVaccines /></div>
                  <div className="vacina-info-mini">
                    <strong>{v.nome_vacina}</strong>
                    <span>Aplicada em: {v.data_aplicacao}</span>
                    {v.proxima_dose && <span className="next-dose">Próxima: {v.proxima_dose}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'exames' && (
          <div className="exames-list-perfil">
            {exames.length === 0 ? (
              <div className="empty-tab">Nenhum exame solicitado.</div>
            ) : (
              exames.map(e => (
                <div key={e.id} className={`exame-row-perfil ${e.status}`}>
                  <div className="exame-info-main">
                    <TbFlask />
                    <div>
                      <strong>{e.tipo_exame}</strong>
                      <span>{e.laboratorio || "Laboratório Interno"}</span>
                    </div>
                  </div>
                  <div className="exame-status-tag">{e.status}</div>
                  <div className="exame-date">{new Date(e.data_solicitacao).toLocaleDateString()}</div>
                  <button className="btn-view-exame"><FiDownload /></button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
