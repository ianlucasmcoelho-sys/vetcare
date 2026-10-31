import React, { useState, useEffect, useRef } from "react";
import { 
  FiPlus, FiCheck, FiX, FiActivity, FiClock, FiThermometer, 
  FiChevronRight, FiAlertCircle, FiInfo, FiTrash2, FiUser, FiCalendar,
  FiFileText, FiSearch, FiHeart, FiWind, FiTrendingUp, FiEdit2
} from "react-icons/fi";
import { MdOutlinePets } from "react-icons/md";
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from "../services/api";
import "./Internacao.css";

const sinaisParaGrafico = [
  { campo: "temperatura", titulo: "Temperatura", unidade: "°C", cor: "#ef6b5b", Icone: FiThermometer },
  { campo: "frequencia_cardiaca", titulo: "Frequência cardíaca", unidade: "bpm", cor: "#e05286", Icone: FiHeart },
  { campo: "frequencia_respiratoria", titulo: "Frequência respiratória", unidade: "mpm", cor: "#4587d8", Icone: FiWind },
  { campo: "peso", titulo: "Peso", unidade: "kg", cor: "#159579", Icone: MdOutlinePets }
];

function VitalTrendChart({ records, campo, titulo, unidade, cor, Icone }) {
  const [pontoAtivo, setPontoAtivo] = useState(null);
  const mostrarPonto = (evento, ponto) => {
    setPontoAtivo({
      ponto,
      x: Math.min(evento.clientX + 14, window.innerWidth - 205),
      y: Math.max(8, Math.min(evento.clientY + 14, window.innerHeight - 88))
    });
  };
  const pontosValidos = records.flatMap((registro) => {
    const bruto = registro[campo];
    if (bruto === null || bruto === undefined || bruto === "") return [];
    const valor = Number(bruto);
    return Number.isFinite(valor) ? [{ registro, valor }] : [];
  }).slice(-10);

  if (!pontosValidos.length) {
    return <article className="vital-trend-card">
      <header><span><Icone /> {titulo}</span></header>
      <div className="vital-trend-empty">Aguardando registros</div>
    </article>;
  }

  const valores = pontosValidos.map((ponto) => ponto.valor);
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const intervalo = maximo - minimo || Math.max(Math.abs(maximo) * 0.2, 1);
  const alvoPasso = intervalo / 3;
  const potencia = 10 ** Math.floor(Math.log10(alvoPasso));
  const fracao = alvoPasso / potencia;
  const passo = (fracao <= 1 ? 1 : fracao <= 2 ? 2 : fracao <= 2.5 ? 2.5 : fracao <= 5 ? 5 : 10) * potencia;
  const faixaMinima = Math.floor((minimo - passo * 0.15) / passo) * passo;
  const faixaMaxima = Math.ceil((maximo + passo * 0.15) / passo) * passo;
  const faixa = faixaMaxima - faixaMinima || passo;
  const topoGrafico = 15;
  const baseGrafico = 95;
  const precisao = passo >= 1 ? 0 : Math.min(3, Math.max(1, Math.ceil(-Math.log10(passo))));
  const marcasEscala = [];
  for (let valor = faixaMaxima; valor >= faixaMinima - passo / 100; valor -= passo) {
    const proporcao = (faixaMaxima - valor) / faixa;
    marcasEscala.push({ valor, y: topoGrafico + proporcao * (baseGrafico - topoGrafico) });
  }
  const formatarValor = (valor) => Number(valor.toFixed(precisao)).toLocaleString("pt-BR", { minimumFractionDigits: precisao, maximumFractionDigits: precisao });
  const coords = pontosValidos.map((ponto, indice) => {
    const x = 62 + (indice * 490) / Math.max(pontosValidos.length - 1, 1);
    const y = baseGrafico - ((ponto.valor - faixaMinima) / faixa) * (baseGrafico - topoGrafico);
    return { ...ponto, x, y };
  });
  const primeiroDia = new Date(coords[0].registro.created_at).toLocaleDateString("pt-BR");
  const ultimoDia = new Date(coords[coords.length - 1].registro.created_at).toLocaleDateString("pt-BR");
  const ultimoValor = coords[coords.length - 1].valor;

  return <article className="vital-trend-card">
    <header><span><Icone /> {titulo}</span><strong>{ultimoValor} {unidade}</strong></header>
    <svg className="vital-trend-chart" viewBox="0 0 560 112" role="img" aria-label={`Evolução de ${titulo}`}>
      {marcasEscala.map((marca, indice) => <g key={indice}>
        <text x="56" y={marca.y + 5} textAnchor="end">{formatarValor(marca.valor)}</text>
        <line x1="64" y1={marca.y} x2="556" y2={marca.y} />
      </g>)}
      <polyline points={coords.map((ponto) => `${ponto.x},${ponto.y}`).join(" ")} style={{ stroke: cor }} />
      {coords.map((ponto, indice) => <circle
        key={`${ponto.registro.id}-${indice}`}
        cx={ponto.x}
        cy={ponto.y}
        r="5"
        tabIndex="0"
        aria-label={`${formatarValor(ponto.valor)} ${unidade}, ${new Date(ponto.registro.created_at).toLocaleString("pt-BR")}`}
        style={{ fill: cor }}
        onMouseEnter={(evento) => mostrarPonto(evento, ponto)}
        onMouseMove={(evento) => mostrarPonto(evento, ponto)}
        onMouseLeave={() => setPontoAtivo(null)}
        onFocus={(evento) => mostrarPonto(evento, ponto)}
        onBlur={() => setPontoAtivo(null)}
      />)}
    </svg>
    {pontoAtivo && <div className="vital-point-tooltip" role="tooltip" style={{ left: pontoAtivo.x, top: pontoAtivo.y }}>
      <strong>{formatarValor(pontoAtivo.ponto.valor)} {unidade}</strong>
      <span>{new Date(pontoAtivo.ponto.registro.created_at).toLocaleString("pt-BR")}</span>
    </div>}
    <footer><span>{primeiroDia}</span><span>{coords.length} registros</span><span>{ultimoDia}</span></footer>
  </article>;
}

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
  const [editingMedId, setEditingMedId] = useState(null);
  const [editingSinalId, setEditingSinalId] = useState(null);
  const medFormRef = useRef(null);
  const vitalFormRef = useRef(null);

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
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: new Date().toISOString().split('T')[0]
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
    setDetails(null);
    setEditingMedId(null);
    setEditingSinalId(null);
    setMedData({ medicamento: "", dosagem: "", horario_agendado: "", data_inicio: new Date().toISOString().split('T')[0], data_fim: new Date().toISOString().split('T')[0] });
    setSinaisData({ temperatura: "", frequencia_cardiaca: "", frequencia_respiratoria: "", peso: "", observacao: "" });
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
    const res = editingMedId
      ? await apiPut(`/internacoes/medicacao/${editingMedId}`, { ...medData, data_agendada: medData.data_inicio, internacao_id: selectedInternacao.id })
      : await apiPost("/internacoes/medicacao", { ...medData, internacao_id: selectedInternacao.id });
    const result = res ? await res.json() : {};
    if (!res?.ok) return window.alert(result.error || (editingMedId ? 'Não foi possível corrigir a medicação.' : 'Não foi possível agendar a medicação.'));
    setMedData({ medicamento: "", dosagem: "", horario_agendado: "", data_inicio: new Date().toISOString().split('T')[0], data_fim: new Date().toISOString().split('T')[0] });
    setEditingMedId(null);
    await carregarDetalhes(selectedInternacao.id);
  };

  const editarMed = (medicacao) => {
    setMedData({ medicamento: medicacao.medicamento, dosagem: medicacao.dosagem || '', horario_agendado: medicacao.horario_agendado, data_inicio: medicacao.data_agendada, data_fim: medicacao.data_agendada });
    setEditingMedId(medicacao.id);
    requestAnimationFrame(() => medFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  };

  const cancelarEdicaoMed = () => {
    setEditingMedId(null);
    setMedData({ medicamento: "", dosagem: "", horario_agendado: "", data_inicio: new Date().toISOString().split('T')[0], data_fim: new Date().toISOString().split('T')[0] });
  };

  const handleAplicarMed = async (id) => {
    const res = await apiPatch(`/internacoes/medicacao/${id}/aplicar`);
    if (res.ok) carregarDetalhes(selectedInternacao.id);
  };

  const handleAddSinais = async (e) => {
    e.preventDefault();
    const res = editingSinalId
      ? await apiPut(`/internacoes/sinais-vitais/${editingSinalId}`, sinaisData)
      : await apiPost("/internacoes/sinais-vitais", { ...sinaisData, internacao_id: selectedInternacao.id });
    const result = res ? await res.json() : {};
    if (!res?.ok) return window.alert(result.error || (editingSinalId ? 'Não foi possível corrigir os sinais vitais.' : 'Não foi possível registrar os sinais vitais.'));
    setSinaisData({ temperatura: "", frequencia_cardiaca: "", frequencia_respiratoria: "", peso: "", observacao: "" });
    setEditingSinalId(null);
    await carregarDetalhes(selectedInternacao.id);
  };

  const editarSinal = (sinal) => {
    setSinaisData({
      temperatura: sinal.temperatura ?? '',
      frequencia_cardiaca: sinal.frequencia_cardiaca ?? '',
      frequencia_respiratoria: sinal.frequencia_respiratoria ?? '',
      peso: sinal.peso ?? '',
      observacao: sinal.observacao || ''
    });
    setEditingSinalId(sinal.id);
    setActiveTab('sinais');
    requestAnimationFrame(() => vitalFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  };

  const cancelarEdicaoSinal = () => {
    setEditingSinalId(null);
    setSinaisData({ temperatura: "", frequencia_cardiaca: "", frequencia_respiratoria: "", peso: "", observacao: "" });
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
  const medicacoesPorDia = (details?.medicacoes || []).reduce((grupos, medicacao) => {
    const dia = medicacao.data_agendada;
    (grupos[dia] ||= []).push(medicacao);
    return grupos;
  }, {});
  const sinaisCronologicos = [...(details?.sinais || [])].reverse();

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
                  <div className="quick-add-med" ref={medFormRef}>
                    <h4 className="section-mini-title">{editingMedId ? 'Corrigir medicação' : 'Agendar medicação por dia'}</h4>
                    <form onSubmit={handleAddMed} className="inline-med-form">
                      <input placeholder="Medicamento" value={medData.medicamento} onChange={e => setMedData({...medData, medicamento: e.target.value})} required />
                      <input placeholder="Dose" value={medData.dosagem} onChange={e => setMedData({...medData, dosagem: e.target.value})} />
                      <input type="time" value={medData.horario_agendado} onChange={e => setMedData({...medData, horario_agendado: e.target.value})} required />
                      <label>{editingMedId ? 'Data' : 'De'}<input type="date" value={medData.data_inicio} onChange={e => setMedData({...medData, data_inicio: e.target.value, data_fim: editingMedId || medData.data_fim < e.target.value ? e.target.value : medData.data_fim})} required /></label>
                      {!editingMedId && <label>Até<input type="date" min={medData.data_inicio} value={medData.data_fim} onChange={e => setMedData({...medData, data_fim: e.target.value})} required /></label>}
                      <button type="submit" className="btn-add-med" aria-label={editingMedId ? 'Salvar correção da medicação' : 'Agendar medicação'}>{editingMedId ? <FiCheck /> : <FiPlus />}</button>
                      {editingMedId && <button type="button" className="btn-cancel-edit" onClick={cancelarEdicaoMed} aria-label="Cancelar edição da medicação"><FiX /></button>}
                    </form>
                    <p className="med-schedule-hint">{editingMedId ? 'A correção altera somente esta dose e mantém seu status de aplicação.' : 'Cada dia do período terá uma dose própria. Marcar uma dose como aplicada não altera os outros dias.'}</p>
                  </div>

                  <div className="med-timeline">
                    {details.medicacoes.length === 0 ? (
                      <div className="no-data-hospital">Sem medicações agendadas.</div>
                    ) : (
                      Object.entries(medicacoesPorDia).sort(([diaA], [diaB]) => diaA.localeCompare(diaB)).map(([dia, medicacoes]) => (
                        <section className="med-day-group" key={dia}>
                          <header className="med-day-heading">
                            <h5><FiCalendar /> {new Date(`${dia}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</h5>
                            <span>{medicacoes.length} {medicacoes.length === 1 ? 'dose' : 'doses'}</span>
                          </header>
                          {medicacoes.map(m => <div key={m.id} className={`med-card-hospital ${m.status}`}>
                            <div className="med-time-box">
                              <span className="time">{m.horario_agendado}</span>
                              <span className="date">Horário</span>
                            </div>
                            <div className="med-detail">
                              <strong>{m.medicamento}</strong>
                              <span>Dose: {m.dosagem || "Conforme prescrição"}</span>
                              {m.aplicado_em && <small>Aplicada às {new Date(m.aplicado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small>}
                            </div>
                            <div className="med-status-action">
                              {m.status === 'pendente' ? (
                                <button className="btn-apply-now" onClick={() => handleAplicarMed(m.id)}>Aplicar agora</button>
                              ) : (
                                <span className="status-badge-applied"><FiCheck /> Aplicada</span>
                              )}
                              <button type="button" className="btn-edit-record" onClick={() => editarMed(m)} aria-label={`Editar ${m.medicamento}`} title="Editar medicação"><FiEdit2 /><span>Editar</span></button>
                            </div>
                          </div>)}
                        </section>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="hospital-view-panel">
                  <form className="vital-signs-form" onSubmit={handleAddSinais} ref={vitalFormRef}>
                    <h4 className="section-mini-title">{editingSinalId ? 'Corrigir registro clínico' : 'Novo Registro Clínico'}</h4>
                    <div className="vital-grid">
                      <div className="vital-input">
                        <label>Temperatura</label>
                        <div className="input-unit">
                          <FiThermometer />
                          <input type="number" min="0" step="0.1" placeholder="0.0" value={sinaisData.temperatura} onChange={e => setSinaisData({...sinaisData, temperatura: e.target.value})} />
                          <span>°C</span>
                        </div>
                      </div>
                      <div className="vital-input">
                        <label>Frequência Card.</label>
                        <div className="input-unit">
                          <FiActivity />
                          <input type="number" min="0" step="1" placeholder="000" value={sinaisData.frequencia_cardiaca} onChange={e => setSinaisData({...sinaisData, frequencia_cardiaca: e.target.value})} />
                          <span>bpm</span>
                        </div>
                      </div>
                      <div className="vital-input">
                        <label>Frequência Respiratória</label>
                        <div className="input-unit">
                          <FiWind />
                          <input type="number" min="0" step="1" placeholder="000" value={sinaisData.frequencia_respiratoria} onChange={e => setSinaisData({...sinaisData, frequencia_respiratoria: e.target.value})} />
                          <span>mpm</span>
                        </div>
                      </div>
                      <div className="vital-input">
                        <label>Peso Atual</label>
                        <div className="input-unit">
                          <MdOutlinePets />
                          <input type="number" min="0" step="0.01" placeholder="0.0" value={sinaisData.peso} onChange={e => setSinaisData({...sinaisData, peso: e.target.value})} />
                          <span>kg</span>
                        </div>
                      </div>
                    </div>
                    <div className="vital-textarea">
                      <label>Evolução / Observação</label>
                      <textarea placeholder="Como o paciente está reagindo?" value={sinaisData.observacao} onChange={e => setSinaisData({...sinaisData, observacao: e.target.value})} />
                    </div>
                    <div className="vital-form-actions">
                      <button type="submit" className="btn-save-vitals">{editingSinalId ? 'Salvar correção' : 'Salvar parâmetros'}</button>
                      {editingSinalId && <button type="button" className="btn-cancel-edit" onClick={cancelarEdicaoSinal}>Cancelar edição</button>}
                    </div>
                  </form>

                  <section className="vitals-trends">
                    <div className="vitals-history-title"><FiTrendingUp /><h4 className="section-mini-title">Evolução dos sinais</h4></div>
                    <div className="vital-trends-grid">
                      {sinaisParaGrafico.map((sinal) => <VitalTrendChart key={sinal.campo} records={sinaisCronologicos} {...sinal} />)}
                    </div>
                  </section>

                  <div className="vitals-history-list">
                    <h4 className="section-mini-title">Histórico de Evolução</h4>
                    {!details.sinais.length && <div className="no-data-hospital">Nenhuma medição registrada ainda.</div>}
                    {details.sinais.map(s => (
                      <div key={s.id} className="vitals-history-card">
                        <div className="vitals-header">
                          <FiCalendar /> {new Date(s.created_at).toLocaleString('pt-BR')}
                          <button type="button" className="btn-edit-record" onClick={() => editarSinal(s)} aria-label="Editar registro de sinais vitais" title="Editar registro"><FiEdit2 /><span>Editar</span></button>
                        </div>
                        <div className="vitals-body-grid">
                          {s.temperatura !== null && s.temperatura !== '' && <div className="v-tag">Temp: <strong>{s.temperatura}°C</strong></div>}
                          {s.frequencia_cardiaca !== null && s.frequencia_cardiaca !== '' && <div className="v-tag">FC: <strong>{s.frequencia_cardiaca} bpm</strong></div>}
                          {s.frequencia_respiratoria !== null && s.frequencia_respiratoria !== '' && <div className="v-tag">FR: <strong>{s.frequencia_respiratoria} mpm</strong></div>}
                          {s.peso !== null && s.peso !== '' && <div className="v-tag">Peso: <strong>{s.peso} kg</strong></div>}
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
