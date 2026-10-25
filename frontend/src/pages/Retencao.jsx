import React, { useState, useEffect } from "react";
import { 
  FiUsers, FiUser, FiAlertCircle, FiTrendingUp, FiCheckCircle, FiClock
} from "react-icons/fi";
import { MdOutlinePets } from "react-icons/md";
import { apiGet } from "../services/api";
import { useToast } from "../context/ToastContext";
import "./Retencao.css";

export default function Retencao() {
  const { showToast } = useToast();
  const [metrics, setMetrics] = useState({ totalTutores: 0, ativosRecentes: 0, taxaRetencao: 0 });
  const [sumidos, setSumidos] = useState([]);
  const [vacinas, setVacinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("sumidos");
  const [busca, setBusca] = useState("");

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [metricsRes, sumidosRes, vacinasRes] = await Promise.all([
        apiGet("/crm/metrics"),
        apiGet("/crm/sumidos"),
        apiGet("/crm/vacinas")
      ]);
      
      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (sumidosRes.ok) setSumidos(await sumidosRes.json());
      if (vacinasRes.ok) setVacinas(await vacinasRes.json());
    } catch (err) {
      console.error("Erro CRM:", err);
      showToast("Erro ao carregar dados do CRM", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  return (
    <div className="retencao-container fade-in">
      <div className="page-header">
        <div className="header-info">
          <h1 className="page-title">Painel de Retenção & CRM</h1>
          <p className="page-subtitle">Inteligência de negócio para fidelização de tutores</p>
        </div>
      </div>

      <div className="crm-metrics-grid">
        <div className="metric-card-premium">
          <div className="metric-icon blue"><FiUsers /></div>
          <div className="metric-details">
            <span className="label">Base de Tutores</span>
            <span className="value">{metrics.totalTutores}</span>
          </div>
        </div>
        <div className="metric-card-premium">
          <div className="metric-icon green"><FiCheckCircle /></div>
          <div className="metric-details">
            <span className="label">Ativos (30 dias)</span>
            <span className="value">{metrics.ativosRecentes}</span>
          </div>
        </div>
        <div className="metric-card-premium">
          <div className="metric-icon teal"><FiTrendingUp /></div>
          <div className="metric-details">
            <span className="label">Taxa de Retenção</span>
            <span className="value">{metrics.taxaRetencao}%</span>
          </div>
        </div>
      </div>

      <div className="crm-main-card">
        <div className="crm-tabs-header">
          <div className="tabs-nav">
            <button className={`crm-tab ${activeTab === 'sumidos' ? 'active' : ''}`} onClick={() => setActiveTab('sumidos')}>
              <FiClock /> Clientes Sumidos
            </button>
            <button className={`crm-tab ${activeTab === 'vacinas' ? 'active' : ''}`} onClick={() => setActiveTab('vacinas')}>
              <FiAlertCircle /> Próximas Vacinas
            </button>
          </div>
        </div>

        <div className="crm-content">
          {loading ? (
            <div className="crm-loading">Analisando base de dados...</div>
          ) : activeTab === 'sumidos' ? (
            <div className="sumidos-list">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Tutor</th>
                    <th>Última Visita</th>
                    <th>Total Pets</th>
                    <th>Contato</th>
                  </tr>
                </thead>
                <tbody>
                  {sumidos.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div className="tutor-cell">
                          <div className="avatar-mini"><FiUsers /></div>
                          <strong>{s.nome}</strong>
                        </div>
                      </td>
                      <td>
                        <span className="date-tag danger">
                          {s.ultima_visita ? new Date(s.ultima_visita).toLocaleDateString() : "Nunca veio"}
                        </span>
                      </td>
                      <td>{s.total_pets} pet(s)</td>
                      <td>{s.celular || s.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="vacinas-list">
              <div className="campanha-grid">
                {vacinas.map(v => (
                  <div key={v.vacina_id || v.id} className="campanha-card">
                    <div className="pet-tag"><MdOutlinePets /> {v.pet_nome}</div>
                    <div className="vacina-info">
                      <strong>{v.nome_vacina}</strong>
                      <span>Vence em: {new Date(v.proxima_dose).toLocaleDateString()}</span>
                    </div>
                    <div className="tutor-info">
                      <FiUser /> {v.tutor_nome}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
