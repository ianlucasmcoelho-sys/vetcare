import React, { useState, useEffect } from "react";
import { 
  FiUsers, FiCalendar, FiDollarSign, FiRefreshCw,
  FiFileText, FiActivity, FiTrendingUp, FiArrowRight
} from "react-icons/fi";
import { TbFlask, TbVaccine } from "react-icons/tb";
import { MdOutlinePets } from "react-icons/md";
import { apiGet } from "../services/api";
import { usePermission } from "../hooks/usePermission";
import { 
  Chart as ChartJS, CategoryScale, LinearScale, 
  BarElement, Title, Tooltip, Legend, PointElement, LineElement, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import "./Dashboard.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Title, Tooltip, Legend);

const formatCurrency = (value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function Dashboard() {
  const { can } = usePermission();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const carregarDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet("/dashboard/stats");
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        setError("Não foi possível carregar os dados.");
      }
    } catch (err) {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    carregarDashboard(); 
    const interval = setInterval(carregarDashboard, 300000); // Auto-refresh 5 min
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) return (
    <div className="v-dash-loading">
      <div className="v-dash-spinner"></div>
      <p>Sincronizando clínica...</p>
    </div>
  );

  if (error && !data) return (
    <div className="v-dash-error">
      <p>{error}</p>
      <button onClick={carregarDashboard} className="v-btn-primary-glow">Tentar novamente</button>
    </div>
  );

  const { stats, consultasHoje, atividadesRecentes, chartFinanceiro } = data;
  const podeVerFinanceiro = can("verFinanceiro");

  // Modern Line Chart Setup
  const chartData = {
    labels: chartFinanceiro.meses,
    datasets: [
      {
        label: 'Receita',
        data: chartFinanceiro.entradas,
        borderColor: '#14b8a6',
        backgroundColor: 'rgba(20, 184, 166, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#14b8a6',
        pointBorderColor: '#fff',
        pointHoverRadius: 6,
      },
      {
        label: 'Despesas',
        data: chartFinanceiro.saidas,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#ef4444',
        pointBorderColor: '#fff',
        pointHoverRadius: 6,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748b', font: { family: 'Plus Jakarta Sans' } } },
      y: { border: { display: false }, grid: { color: 'rgba(100, 116, 139, 0.1)' }, ticks: { color: '#64748b', callback: (val) => `R$ ${val / 1000}k` } }
    }
  };

  return (
    <div className="v-dash-layout">
      
      <div className="v-dash-header reveal-fade">
        <div>
          <h1 className="v-dash-title">Visão Geral</h1>
          <p className="v-dash-subtitle">Acompanhe o pulso da sua clínica em tempo real.</p>
        </div>
        <div className="v-dash-actions">
          <button className="v-btn-icon-glass" onClick={carregarDashboard} title="Atualizar">
            <FiRefreshCw className={loading ? "spin" : ""} />
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="v-dash-kpi-grid">
        <div className="v-kpi-card reveal-up" style={{animationDelay: '0.1s'}}>
          <div className="v-kpi-icon blue"><FiUsers /></div>
          <div className="v-kpi-info">
            <span className="v-kpi-label">Tutores Ativos</span>
            <span className="v-kpi-value">{stats.tutores}</span>
          </div>
        </div>

        <div className="v-kpi-card reveal-up" style={{animationDelay: '0.2s'}}>
          <div className="v-kpi-icon purple"><MdOutlinePets /></div>
          <div className="v-kpi-info">
            <span className="v-kpi-label">Pacientes</span>
            <span className="v-kpi-value">{stats.pets}</span>
          </div>
        </div>

        <div className="v-kpi-card reveal-up" style={{animationDelay: '0.3s'}}>
          <div className="v-kpi-icon orange"><FiCalendar /></div>
          <div className="v-kpi-info">
            <span className="v-kpi-label">Agenda Hoje</span>
            <span className="v-kpi-value">{stats.consultas}</span>
          </div>
        </div>

        {podeVerFinanceiro && (
          <div className="v-kpi-card v-kpi-highlight reveal-up" style={{animationDelay: '0.4s'}}>
            <div className="v-kpi-icon teal"><FiDollarSign /></div>
            <div className="v-kpi-info">
              <span className="v-kpi-label">Faturamento Mensal</span>
              <span className="v-kpi-value">{formatCurrency(stats.receita)}</span>
            </div>
            <div className="v-kpi-trend"><FiTrendingUp /> Em alta</div>
          </div>
        )}
      </div>

      {/* Main Content Split */}
      <div className="v-dash-main-split">
        
        {/* Left Column: Chart & Activities */}
        <div className="v-dash-col-left">
          
          {podeVerFinanceiro && (
            <div className="v-dash-panel v-panel-chart reveal-up" style={{animationDelay: '0.5s'}}>
              <div className="v-panel-header">
                <h2>Performance Financeira</h2>
                <div className="v-chart-legend">
                  <span className="v-legend-item"><div className="dot teal"></div> Receita</span>
                  <span className="v-legend-item"><div className="dot red"></div> Despesas</span>
                </div>
              </div>
              <div className="v-chart-wrapper">
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>
          )}

          <div className="v-dash-panel reveal-up" style={{animationDelay: '0.6s'}}>
            <div className="v-panel-header">
              <h2>Evoluções Recentes</h2>
              <button className="v-btn-text">Ver todos <FiArrowRight/></button>
            </div>
            <div className="v-activity-list">
              {atividadesRecentes.length === 0 ? (
                <div className="v-empty-state"><FiActivity size={32} /><p>Nenhum registro recente.</p></div>
              ) : (
                atividadesRecentes.map((a, index) => (
                  <div key={a.id} className="v-activity-row" style={{animationDelay: `${0.7 + (index*0.1)}s`}}>
                    <div className="v-activity-icon"><FiFileText /></div>
                    <div className="v-activity-details">
                      <strong>{a.tipo}</strong>
                      <span>{a.desc}</span>
                    </div>
                    <div className="v-activity-time">{new Date(a.data).toLocaleDateString('pt-BR')}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Schedule & Alerts */}
        <div className="v-dash-col-right">
          
          {/* Alerts Box */}
          {(stats.examesPendentes > 0 || stats.estoqueBaixo > 0) && (
            <div className="v-dash-panel v-panel-alerts reveal-left" style={{animationDelay: '0.4s'}}>
              <div className="v-panel-header"><h2>Atenção Necessária</h2></div>
              <div className="v-alerts-stack">
                {stats.examesPendentes > 0 && (
                  <div className="v-alert-item warning">
                    <TbFlask className="v-alert-icon" />
                    <div>
                      <strong>{stats.examesPendentes} Laudos Pendentes</strong>
                      <span>Resultados aguardando análise clínica.</span>
                    </div>
                  </div>
                )}
                {stats.estoqueBaixo > 0 && (
                  <div className="v-alert-item danger">
                    <TbVaccine className="v-alert-icon" />
                    <div>
                      <strong>{stats.estoqueBaixo} Itens em Falta</strong>
                      <span>Estoque atingiu o nível crítico.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Agenda Timeline */}
          <div className="v-dash-panel v-panel-timeline reveal-left" style={{animationDelay: '0.5s'}}>
            <div className="v-panel-header">
              <h2>Agenda de Hoje</h2>
              <span className="v-badge-count">{consultasHoje.length}</span>
            </div>
            
            <div className="v-timeline">
              {consultasHoje.length === 0 ? (
                <div className="v-empty-state"><FiCalendar size={32} /><p>Dia livre! Nenhuma consulta marcada.</p></div>
              ) : (
                consultasHoje.map((c, index) => (
                  <div key={c.id} className="v-timeline-item" style={{animationDelay: `${0.6 + (index*0.1)}s`}}>
                    <div className="v-time-marker">{c.hora}</div>
                    <div className="v-timeline-content">
                      <div className="v-t-header">
                        <strong>{c.pet}</strong>
                        <span className={`v-status-dot ${c.status === 'Concluído' ? 'done' : 'pending'}`}></span>
                      </div>
                      <span className="v-t-tutor">{c.tutor}</span>
                      <span className="v-t-type">{c.tipo}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
