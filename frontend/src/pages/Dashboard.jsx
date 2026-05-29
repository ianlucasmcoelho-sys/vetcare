import React, { useState, useEffect } from "react";
import { 
  FiUsers, FiCalendar, FiDollarSign, FiRefreshCw,
  FiFileText, FiActivity
} from "react-icons/fi";
import { TbFlask } from "react-icons/tb";
import { MdOutlinePets } from "react-icons/md";
import { apiGet } from "../services/api";
import { usePermission } from "../hooks/usePermission";
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import "./Dashboard.css";

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend
);

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
        setError("Não foi possível carregar os dados do dashboard");
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDashboard(); }, []);

  if (loading) return <div className="loading-container"><div className="spinner"></div><p>Gerando insights para sua clínica...</p></div>;
  if (error) return <div className="error-state"><p>{error}</p><button onClick={carregarDashboard} className="btn-primary">Tentar novamente</button></div>;
  if (!data) return null;

  const { stats, consultasHoje, atividadesRecentes, chartFinanceiro } = data;
  const podeVerFinanceiro = can("verFinanceiro");

  const dadosBarFinanceiro = { 
    labels: chartFinanceiro.meses, 
    datasets: [
      { label: 'Entradas', data: chartFinanceiro.entradas, backgroundColor: '#10b981', borderRadius: 6 }, 
      { label: 'Saídas', data: chartFinanceiro.saidas, backgroundColor: '#ef4444', borderRadius: 6 }
    ] 
  };

  return (
    <div className="dashboard-container fade-in">
      <div className="page-header">
        <div className="header-info">
          <h1 className="page-title">Painel de Controle</h1>
          <p className="page-subtitle">Bem-vindo ao Sistema Ouro Pet. Aqui está o resumo da sua clínica.</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={carregarDashboard}>
            <FiRefreshCw />
            <span>Atualizar Dados</span>
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header"><FiUsers className="stat-icon" /><span className="stat-label">Total Clientes</span></div>
          <h2 className="stat-value">{stats.tutores}</h2>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><MdOutlinePets className="stat-icon" /><span className="stat-label">Total Animais</span></div>
          <h2 className="stat-value">{stats.pets}</h2>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><FiActivity className="stat-icon" /><span className="stat-label">Internados</span></div>
          <h2 className="stat-value">{stats.internados}</h2>
        </div>
        <div className={`stat-card ${stats.examesPendentes > 0 ? 'warning' : ''}`}>
          <div className="stat-card-header"><TbFlask className="stat-icon" /><span className="stat-label">Laudos Pendentes</span></div>
          <h2 className="stat-value">{stats.examesPendentes}</h2>
        </div>
        <div className={`stat-card ${stats.estoqueBaixo > 0 ? 'danger' : ''}`}>
          <div className="stat-card-header"><FiRefreshCw className="stat-icon" /><span className="stat-label">Itens Críticos</span></div>
          <h2 className="stat-value">{stats.estoqueBaixo}</h2>
        </div>
        <div className="stat-card">
          <div className="stat-card-header"><FiCalendar className="stat-icon" /><span className="stat-label">Agenda de Hoje</span></div>
          <h2 className="stat-value">{stats.consultas}</h2>
        </div>
        <div className="stat-card highlight">
          <div className="stat-card-header"><FiDollarSign className="stat-icon" /><span className="stat-label">Faturamento Mês</span></div>
          <h2 className="stat-value">{formatCurrency(stats.receita)}</h2>
        </div>
      </div>

      <div className="charts-grid-main">
        {podeVerFinanceiro && (
          <div className="chart-card large">
            <h3><FiActivity /> Fluxo de Caixa (Semestre)</h3>
            <div className="chart-container"><Bar data={dadosBarFinanceiro} options={{ responsive: true, maintainAspectRatio: false }} /></div>
          </div>
        )}
      </div>

      <div className="dashboard-main-grid">
        <div className="dashboard-card">
          <div className="card-header"><h3 className="card-title">Consultas de Hoje</h3><span className="count-badge">{consultasHoje.length}</span></div>
          <div className="consultas-list">
            {consultasHoje.length === 0 ? (
              <div className="empty-consultas"><FiCalendar size={32} /><p>Agenda vazia para hoje</p></div>
            ) : (
              consultasHoje.map(c => (
                <div key={c.id} className="consulta-item">
                  <div className="consulta-info">
                    <div className="consulta-hora">{c.hora}</div>
                    <div className="consulta-dados"><span className="pet-nome">{c.pet}</span><span className="tutor-nome">{c.tutor}</span></div>
                    <div className="consulta-tipo">{c.tipo}</div>
                  </div>
                  <span className={`status-badge ${c.status === 'Concluído' ? 'status-concluido' : 'status-agendado'}`}>{c.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="dashboard-card">
          <h3 className="card-title">Evoluções Recentes</h3>
          <div className="atividades-list">
            {atividadesRecentes.length === 0 ? (
              <div className="empty-atividades"><FiActivity size={32} /><p>Nenhum prontuário registrado</p></div>
            ) : (
              atividadesRecentes.map(a => (
                <div key={a.id} className="atividade-item">
                  <div className="atividade-icone"><FiFileText size={20} color="#14b8a6" /></div>
                  <div className="atividade-conteudo">
                    <div className="atividade-titulo"><span className="atividade-tipo">{a.tipo}</span><span className="atividade-desc">{a.desc}</span></div>
                    <div className="atividade-data">{new Date(a.data).toLocaleDateString('pt-BR')}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
