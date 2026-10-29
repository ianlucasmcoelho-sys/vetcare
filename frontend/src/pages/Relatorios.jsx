import { localDateInput } from "../utils/date";
import React, { useState, useEffect } from "react";
import { 
  FiDollarSign, FiActivity, FiTrendingUp, FiTrendingDown, 
  FiPrinter, FiDownload, FiRefreshCw, FiCalendar, FiPieChart,
  FiBarChart2, FiList, FiArrowRight, FiCheckCircle, FiClock
} from "react-icons/fi";
import { MdOutlineVaccines } from "react-icons/md";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiGet } from "../services/api";
import { exportExcel } from "../utils/exportExcel";
import "./Relatorios.css";

export default function Relatorios() {
  const [activeTab, setActiveTab] = useState("financeiro");
  const [loading, setLoading] = useState(false);
  const [dataInicio, setDataInicio] = useState(localDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [dataFim, setDataFim] = useState(localDateInput());
  
  const [financeiro, setFinanceiro] = useState([]);
  const [vacinas, setVacinas] = useState([]);
  const [retornos, setRetornos] = useState([]);
  const [producao, setProducao] = useState([]);
  const [resumoFinanceiro, setResumoFinanceiro] = useState({ entradas: 0, saidas: 0, saldo: 0 });

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [finRes, vacRes, retRes, prodRes] = await Promise.all([
        apiGet(`/relatorios/financeiro?dataInicio=${dataInicio}&dataFim=${dataFim}`),
        apiGet("/relatorios/vacinas"),
        apiGet("/relatorios/retornos"),
        apiGet(`/relatorios/producao?dataInicio=${dataInicio}&dataFim=${dataFim}`)
      ]);

      if (finRes.ok) {
        const finData = await finRes.json();
        setFinanceiro(finData.transacoes || []);
        setResumoFinanceiro(finData.resumo || { entradas: 0, saidas: 0, saldo: 0 });
      }
      if (vacRes.ok) setVacinas((await vacRes.json()).vacinas || []);
      if (retRes.ok) setRetornos((await retRes.json()).retornos || []);
      if (prodRes.ok) setProducao((await prodRes.json()).agendamentos || []);
      
    } catch (error) {
      console.error("❌ Erro CRM:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, [dataInicio, dataFim]);

  const setPreset = (dias) => {
    const fim = new Date();
    const inicio = new Date();
    if (dias === 'mes') {
      inicio.setDate(1);
    } else {
      inicio.setDate(fim.getDate() - dias);
    }
    setDataInicio(localDateInput(inicio));
    setDataFim(localDateInput(fim));
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    // Reutilizando a lógica de geração de PDF premium que já padronizamos
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("VETCARE - RELATÓRIO EXECUTIVO", 20, 25);
    
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.text(`${activeTab.toUpperCase()} | PERÍODO: ${dataInicio} a ${dataFim}`, 20, 55);

    const columns = activeTab === "financeiro" 
      ? ["Data", "Descrição", "Categoria", "Valor", "Tipo"]
      : ["Pet", "Serviço/Vacina", "Data", "Status"];

    const body = activeTab === "financeiro"
      ? financeiro.map(t => [t.data, t.descricao, t.categoria, `R$ ${t.valor}`, t.tipo])
      : producao.map(p => [p.animal_nome, p.tipo_servico, p.data, p.status]);

    autoTable(doc, {
      startY: 65,
      head: [columns],
      body: body,
      theme: 'striped',
      headStyles: { fillColor: [20, 184, 166] }
    });

    doc.save(`relatorio_vetcare_${activeTab}.pdf`);
  };

  const exportarExcel = () => {
    const datasets = {
      financeiro: { sheetName: "Financeiro", columns: ["Data", "Descrição", "Categoria", "Valor", "Tipo"], rows: financeiro.map(t => [t.data, t.descricao, t.categoria, Number(t.valor) || 0, t.tipo]) },
      producao: { sheetName: "Produção", columns: ["Pet", "Serviço", "Data", "Tutor", "Status"], rows: producao.map(p => [p.animal_nome, p.tipo_servico, p.data, p.tutor_nome, p.status]) },
      vacinas: { sheetName: "Vacinas", columns: ["Pet", "Vacina", "Data de aplicação", "Próxima dose", "Observações"], rows: vacinas.map(v => [v.pet_nome, v.nome_vacina, v.data_aplicacao, v.proxima_dose, v.observacoes]) },
      retornos: { sheetName: "Retornos", columns: ["Pet", "Tutor", "Data do retorno", "Motivo", "Status"], rows: retornos.map(r => [r.pet_nome, r.tutor_nome, r.data_retorno, r.motivo, r.status]) }
    };
    const { sheetName, columns, rows } = datasets[activeTab];
    exportExcel({ fileName: `relatorio_vetcare_${activeTab}_${dataInicio}_${dataFim}`, sheetName, columns, rows });
  };

  return (
    <div className="relatorios-container reveal-fade">
      <div className="page-header">
        <div className="header-info">
          <h1 className="page-title">Business Intelligence</h1>
          <p className="page-subtitle">Análise estratégica e desempenho da clínica</p>
        </div>
        <div className="header-actions">
          <button className="v-btn-primary-glow" onClick={exportarPDF}>
            <FiPrinter /> Exportar PDF
          </button>
          <button className="btn-secondary" onClick={exportarExcel}>
            <FiDownload /> Exportar Excel
          </button>
        </div>
      </div>

      <div className="bi-controls-card v-glass-panel reveal-up" style={{animationDelay: '0.1s'}}>
        <div className="filter-header">
          <div className="period-inputs">
            <div className="input-group">
              <label>DATA INICIAL</label>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
            </div>
            <div className="input-group">
              <label>DATA FINAL</label>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
            </div>
          </div>
          <div className="filter-presets">
            <button onClick={() => setPreset(7)}>7 Dias</button>
            <button onClick={() => setPreset(30)}>30 Dias</button>
            <button onClick={() => setPreset('mes')}>Este Mês</button>
            <button className="btn-refresh" onClick={carregarDados}><FiRefreshCw /></button>
          </div>
        </div>
      </div>

      <div className="bi-metrics-grid">
        <div className="bi-metric-card v-glass-panel reveal-up revenue" style={{animationDelay: '0.15s'}}>
          <div className="m-icon"><FiTrendingUp /></div>
          <div className="m-data">
            <span className="label">Receita Total</span>
            <span className="value">{Number(resumoFinanceiro.entradas).toLocaleString('pt-BR', {style:'currency',currency:'BRL'})}</span>
          </div>
        </div>
        <div className="bi-metric-card v-glass-panel reveal-up expense" style={{animationDelay: '0.2s'}}>
          <div className="m-icon"><FiTrendingDown /></div>
          <div className="m-data">
            <span className="label">Despesas</span>
            <span className="value">{Number(resumoFinanceiro.saidas).toLocaleString('pt-BR', {style:'currency',currency:'BRL'})}</span>
          </div>
        </div>
        <div className="bi-metric-card v-glass-panel reveal-up profit" style={{animationDelay: '0.25s'}}>
          <div className="m-icon"><FiDollarSign /></div>
          <div className="m-data">
            <span className="label">Lucro Líquido</span>
            <span className="value">{Number(resumoFinanceiro.saldo).toLocaleString('pt-BR', {style:'currency',currency:'BRL'})}</span>
          </div>
        </div>
        <div className="bi-metric-card v-glass-panel reveal-up production" style={{animationDelay: '0.3s'}}>
          <div className="m-icon"><FiActivity /></div>
          <div className="m-data">
            <span className="label">Produtividade</span>
            <span className="value">{producao.length} Atend.</span>
          </div>
        </div>
      </div>

      <div className="bi-main-card reveal-up" style={{animationDelay: '0.35s'}}>
        <div className="bi-tabs-nav">
          <button className={`bi-tab ${activeTab === 'financeiro' ? 'active' : ''}`} onClick={() => setActiveTab('financeiro')}>
            <FiBarChart2 /> Fluxo Financeiro
          </button>
          <button className={`bi-tab ${activeTab === 'producao' ? 'active' : ''}`} onClick={() => setActiveTab('producao')}>
            <FiPieChart /> Desempenho Clínico
          </button>
          <button className={`bi-tab ${activeTab === 'vacinas' ? 'active' : ''}`} onClick={() => setActiveTab('vacinas')}>
            <FiCheckCircle /> Cobertura Vacinal
          </button>
        </div>

        <div className="bi-content">
          {loading ? (
            <div className="bi-loading-skeleton">
              <div className="skeleton-line" />
              <div className="skeleton-line" />
              <div className="skeleton-line" />
            </div>
          ) : (
            <div className="bi-table-wrapper">
              <table className="modern-bi-table">
                <thead>
                  {activeTab === "financeiro" ? (
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Categoria</th>
                      <th>Valor</th>
                      <th>Status</th>
                    </tr>
                  ) : activeTab === "vacinas" ? (
                    <tr><th>Paciente</th><th>Vacina</th><th>Aplicação</th><th>Próxima dose</th><th>Observações</th></tr>
                  ) : (
                    <tr>
                      <th>Paciente</th>
                      <th>Procedimento</th>
                      <th>Data</th>
                      <th>Tutor</th>
                      <th>Status</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {activeTab === "financeiro" ? (
                    financeiro.map(t => (
                      <tr key={t.id}>
                        <td>{t.data}</td>
                        <td><strong>{t.descricao}</strong></td>
                        <td><span className="cat-badge">{t.categoria}</span></td>
                        <td className={t.tipo === 'entrada' ? 'text-success' : 'text-danger'}>
                          {t.tipo === 'entrada' ? '+' : '-'} R$ {t.valor}
                        </td>
                        <td><span className={`badge-status ${t.tipo}`}>{t.tipo.toUpperCase()}</span></td>
                      </tr>
                    ))
                  ) : activeTab === "vacinas" ? (
                    vacinas.map(v => (
                      <tr key={v.id}>
                        <td><strong>{v.pet_nome}</strong></td>
                        <td>{v.nome_vacina}</td>
                        <td>{v.data_aplicacao}</td>
                        <td>{v.proxima_dose}</td>
                        <td>{v.observacoes}</td>
                      </tr>
                    ))
                  ) : (
                    producao.map(p => (
                      <tr key={p.id}>
                        <td><strong>{p.animal_nome}</strong></td>
                        <td>{p.tipo_servico}</td>
                        <td>{p.data}</td>
                        <td>{p.tutor_nome}</td>
                        <td><span className="status-pill active">{p.status}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
