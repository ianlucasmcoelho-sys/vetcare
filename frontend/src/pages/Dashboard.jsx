import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiActivity, FiUsers, FiClipboard, FiCalendar, FiDollarSign, FiHome } from 'react-icons/fi';
import { TbPaw, TbVaccine, TbStethoscope, TbFlask, TbPrescription, TbBed } from 'react-icons/tb';
import { usePermission } from '../hooks/usePermission';
import useOverview from '../hooks/useOverview';
import { OverviewHeader, OverviewStatus, OverviewPanel, OverviewEmpty, ClinicalRecords, formatOverviewDate, overviewMoney } from '../components/OverviewElements';

const metrics = [
  ['tutores', 'Tutores', FiUsers, '/responsaveis', 'blue'],
  ['pacientes', 'Pacientes', TbPaw, '/animais', 'orange'],
  ['consultas', 'Consultas registradas', TbStethoscope, '/historico', 'teal'],
  ['vacinas', 'Vacinas aplicadas', TbVaccine, '/vacinas', 'green'],
  ['exames', 'Exames solicitados', TbFlask, '/exames', 'blue'],
  ['prescricoes', 'Prescrições', TbPrescription, '/receituario', 'purple']
];
const roleNames = { admin:'Administrador', veterinario:'Médico veterinário', recepcionista:'Recepção' };

export default function Dashboard() {
  const { data, loading, error, refresh } = useOverview('/dashboard/clinical');
  const { can } = usePermission();
  const totalSpecies = data?.especies.reduce((total, item) => total + item.total, 0) || 0;
  return <div className="clinic-overview ov-clinical">
    <OverviewHeader eyebrow="PAINEL DE CONTROLE" title="Dashboard clínico" description="Uma visão dos pacientes, da equipe e dos atendimentos da sua clínica." loading={loading} refresh={refresh}>
      <Link className="ov-button ov-button-secondary" to="/"><FiHome />Voltar ao início</Link>
    </OverviewHeader>
    <OverviewStatus loading={loading} error={error} hasData={Boolean(data)} refresh={refresh} />
    {data && <>
      <div className="ov-period"><FiCalendar /><span>Últimos 30 dias: <strong>{formatOverviewDate(data.inicio)} a {formatOverviewDate(data.hoje)}</strong></span><span className="ov-live-dot">Dados da sua clínica</span></div>
      <div className="ov-clinical-grid"><div className="ov-column">
        <section className="ov-clinic-card"><div className="ov-clinic-mark"><TbStethoscope /></div><span className="ov-eyebrow">SUA CLÍNICA</span><h2>{data.clinica?.nome || 'Clínica veterinária'}</h2>{data.clinica?.cnpj && <p>CNPJ {data.clinica.cnpj}</p>}{data.clinica?.endereco && <p>{data.clinica.endereco}</p>}{data.clinica?.created_at && <span className="ov-clinic-since">No VetCare desde {formatOverviewDate(data.clinica.created_at)}</span>}{can('verConfiguracoes') && <Link to="/configuracoes">Dados da clínica<FiArrowRight /></Link>}</section>
        <OverviewPanel title="Equipe da clínica" icon={FiUsers} href={can('verUsuarios') ? '/usuarios' : undefined} linkText="Gerenciar">
          {data.equipe.length ? <ul className="ov-list">{data.equipe.map(member => <li className="ov-member" key={member.id}><span className="ov-member-avatar">{member.nome?.trim().charAt(0).toLocaleUpperCase('pt-BR') || '?'}</span><div><strong>{member.nome}</strong><span>{roleNames[member.perfil] || 'Equipe'}</span></div><span className="ov-member-active">Ativo</span></li>)}</ul> : <OverviewEmpty>Nenhum profissional ativo cadastrado.</OverviewEmpty>}
        </OverviewPanel>
        <OverviewPanel title="Pacientes por espécie" icon={TbPaw} href="/animais">
          {data.especies.length ? <div className="ov-species">{data.especies.map(item => <div key={item.especie}><div><span>{item.especie}</span><strong>{item.total}</strong></div><div className="ov-bar-track"><span style={{width:`${totalSpecies ? item.total / totalSpecies * 100 : 0}%`}} /></div></div>)}<small>Pacientes vivos cadastrados. Até oito espécies mais frequentes.</small></div> : <OverviewEmpty>Cadastre seus pacientes para acompanhar as espécies atendidas.</OverviewEmpty>}
        </OverviewPanel>
      </div><div className="ov-column">
        <div className="ov-metrics-grid">{metrics.map(([key, title, Icon, href, color]) => {
          const metric = data.indicadores[key];
          return <Link className="ov-metric" to={href} key={key}><div className="ov-metric-heading"><span className={`ov-action-icon ${color}`}><Icon /></span><h2>{title}</h2><FiArrowRight className="ov-metric-arrow" /></div><strong className="ov-metric-total">{metric.total.toLocaleString('pt-BR')}</strong><div className="ov-metric-footer"><span>Total cadastrado</span><span><b>{metric.recentes.toLocaleString('pt-BR')}</b> nos últimos 30 dias</span></div></Link>;
        })}</div>
        <OverviewPanel title="Acompanhamento clínico" icon={FiActivity} className="ov-priorities-panel"><div className="ov-priorities">
          <Link to="/internacao"><TbBed /><strong>{data.prioridades.internados}</strong><span>Pacientes internados</span><FiArrowRight /></Link>
          <Link to="/exames"><TbFlask /><strong>{data.prioridades.examesPendentes}</strong><span>Exames pendentes</span><FiArrowRight /></Link>
          <Link to="/retornos?status=atrasados"><FiClipboard /><strong>{data.prioridades.retornosAtrasados}</strong><span>Retornos em atraso</span><FiArrowRight /></Link>
        </div></OverviewPanel>
        <OverviewPanel title="Atendimentos recentes" icon={TbStethoscope} href="/historico"><ClinicalRecords records={data.registros} /></OverviewPanel>
        {data.financeiro && can('verFinanceiro') && <OverviewPanel title="Resumo financeiro · últimos 30 dias" icon={FiDollarSign} href="/financeiro" linkText="Abrir financeiro"><div className="ov-finance"><div><span>Entradas registradas</span><strong>{overviewMoney(data.financeiro.entradas)}</strong></div><div><span>Saídas registradas</span><strong>{overviewMoney(data.financeiro.saidas)}</strong></div><div><span>Saldo do período</span><strong>{overviewMoney(data.financeiro.entradas - data.financeiro.saidas)}</strong></div></div></OverviewPanel>}
      </div></div>
    </>}
  </div>;
}
