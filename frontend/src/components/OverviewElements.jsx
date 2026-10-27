import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import '../styles/overview.css';

export const formatOverviewDate = value => {
  if (!value) return 'Não informado';
  const date = String(value).slice(0, 10).split('-');
  return date.length === 3 ? date.reverse().join('/') : 'Não informado';
};
export const overviewMoney = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function OverviewHeader({ eyebrow, title, description, loading, refresh, children }) {
  return <header className="ov-page-header"><div><span className="ov-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
    <div className="ov-header-actions">{children}<button className="ov-icon-button" type="button" onClick={refresh} disabled={loading} aria-label="Atualizar informações" title="Atualizar informações"><FiRefreshCw className={loading ? 'ov-refreshing' : ''} /></button></div>
  </header>;
}
export function OverviewStatus({ loading, error, hasData, refresh }) {
  if (error) return <div className="ov-load-error" role="alert"><FiAlertCircle /><span>{error}{hasData && ' Exibindo a última atualização disponível.'}</span><button type="button" onClick={refresh}>Tentar novamente</button></div>;
  if (loading && !hasData) return <div className="ov-loading" role="status"><span>Carregando informações da clínica...</span><div className="ov-skeleton-grid">{[0,1,2,3].map(key => <div className="ov-skeleton" key={key} />)}</div></div>;
  return null;
}
export function OverviewPanel({ title, icon: Icon, href, linkText = 'Ver todos', children, className = '' }) {
  return <section className={`ov-panel ${className}`}><div className="ov-panel-heading"><h2>{Icon && <Icon aria-hidden="true" />}{title}</h2>{href && <Link to={href}>{linkText}<FiArrowRight aria-hidden="true" /></Link>}</div>{children}</section>;
}
export function OverviewEmpty({ children }) { return <p className="ov-empty">{children}</p>; }
export function ClinicalRecords({ records }) {
  return records.length ? <ul className="ov-list">{records.map(record => <li key={record.id}><Link className="ov-row-link" to={record.animal_id ? `/perfil-animal/${record.animal_id}` : '/historico'}><div><strong>{record.pet_nome || 'Paciente não informado'}</strong><span>{record.diagnostico || 'Atendimento registrado'}{record.veterinario ? ` · ${record.veterinario}` : ''}</span></div><time dateTime={record.data_visita}>{formatOverviewDate(record.data_visita)}</time></Link></li>)}</ul> : <OverviewEmpty>Nenhum atendimento clínico registrado ainda.</OverviewEmpty>;
}
