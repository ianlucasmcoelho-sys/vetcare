import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiBell, FiCalendar, FiChevronDown, FiClipboard, FiGift, FiPlus, FiUsers, FiActivity } from 'react-icons/fi';
import { TbPaw, TbPrescription, TbVaccine, TbStethoscope, TbLayoutDashboard } from 'react-icons/tb';
import { usePermission } from '../hooks/usePermission';
import useOverview from '../hooks/useOverview';
import { OverviewHeader, OverviewStatus, OverviewEmpty, ClinicalRecords, formatOverviewDate } from '../components/OverviewElements';

const panelIds = ['cadastros', 'registros', 'aniversarios', 'vencidas', 'programadas', 'retornos', 'agenda'];
function NoticePanel({ id, title, icon: Icon, count, tone = '', expanded, onToggle, href, children }) {
  return <details className={`ov-notice ${tone}`} open={expanded} onToggle={event => onToggle(id, event.currentTarget.open)}>
    <summary><span className="ov-notice-title">{Icon && <Icon aria-hidden="true" />}{title}</span><span className="ov-notice-end">{count !== undefined && <span className="ov-count">{count}</span>}<FiChevronDown className="ov-chevron" aria-hidden="true" /></span></summary>
    <div className="ov-notice-content">{children}{href && <Link className="ov-see-all" to={href}>Ver todos<FiArrowRight aria-hidden="true" /></Link>}</div>
  </details>;
}
function VaccineList({ items }) {
  return items.length ? <ul className="ov-list">{items.map(item => <li key={item.id}><Link className="ov-row-link" to={`/perfil-animal/${item.animal_id}`}><div><strong>{item.animal_nome}</strong><span>{item.nome_vacina}</span></div><time dateTime={item.proxima_dose}>{formatOverviewDate(item.proxima_dose)}</time></Link></li>)}</ul> : <OverviewEmpty>Nenhuma dose nesta situação. Tudo em dia por aqui.</OverviewEmpty>;
}
export default function Inicio() {
  const { data, loading, error, refresh } = useOverview('/dashboard/home');
  const { can } = usePermission();
  // Keep the overview compact on first load; counts still surface urgent items.
  const [expanded, setExpanded] = useState(() => new Set());
  const toggle = (id, open) => setExpanded(previous => {
    if (previous.has(id) === open) return previous;
    const next = new Set(previous); if (open) next.add(id); else next.delete(id); return next;
  });
  const allExpanded = panelIds.every(id => expanded.has(id));
  const panel = (id, props, content) => <NoticePanel key={id} id={id} expanded={expanded.has(id)} onToggle={toggle} {...props}>{content}</NoticePanel>;
  let user = {}; try { user = JSON.parse(localStorage.getItem('usuario') || '{}'); } catch { /* Login manages expired storage. */ }
  const firstName = user.nome?.replace(/^dra?\.?\s+/i, '').trim().split(' ')[0] || 'bem-vindo';
  const actions = [
    ['Novo tutor', '/responsaveis?novo=1', FiUsers, 'editarResponsaveis', 'blue'],
    ['Novo animal', '/animais?novo=1', TbPaw, 'editarAnimais', 'orange'],
    ['Nova prescrição', '/receituario?novo=1', TbPrescription, 'editarReceituario', 'purple'],
    ['Nova vacina', '/vacinas?novo=1', TbVaccine, 'editarVacinas', 'teal'],
    ['Nova consulta', '/historico?novo=1', TbStethoscope, 'editarProntuarios', 'blue'],
    ['Novo agendamento', '/agenda?novo=1', FiCalendar, 'editarAgenda', 'green']
  ].filter(([, , , permission]) => can(permission));
  const birthdays = data ? [...data.aniversarios.animais.map(row => ({...row, type:'Animal', href:`/perfil-animal/${row.id}`})), ...data.aniversarios.tutores.map(row => ({...row, type:'Tutor', href:`/perfil-tutor/${row.id}`}))].sort((a,b) => String(a.nascimento).slice(8,10).localeCompare(String(b.nascimento).slice(8,10))) : [];
  return <div className="clinic-overview ov-home">
    <OverviewHeader eyebrow="ROTINA DA CLÍNICA" title="Início" description="Os avisos e os próximos passos do seu dia, em um só lugar." loading={loading} refresh={refresh}>
      <Link className="ov-button ov-button-secondary" to="/dashboard"><TbLayoutDashboard />Dashboard clínico<FiArrowRight /></Link>
    </OverviewHeader>
    <OverviewStatus loading={loading} error={error} hasData={Boolean(data)} refresh={refresh} />
    {data && <div className="ov-home-grid"><div className="ov-column ov-home-top-left">
      <section className="ov-quick-actions" aria-labelledby="quick-actions-title"><h2 id="quick-actions-title">Ações rápidas</h2><div>{actions.map(([title, href, Icon, , color]) => <Link to={href} key={href}><span className={`ov-action-icon ${color}`}><Icon /></span>{title}<FiPlus className="ov-quick-plus" /></Link>)}</div></section>
      <Link className="ov-dashboard-callout" to="/dashboard"><span className="ov-callout-icon"><FiActivity /></span><div><strong>Um olhar clínico para sua operação</strong><p>Pacientes, atendimentos, equipe e indicadores dos últimos 30 dias.</p></div><FiArrowRight /></Link>
    </div><div className="ov-column ov-home-bottom-left">

      {panel('vencidas', { title:'Vacinas vencidas', icon:TbVaccine, count:data.vacinas.vencidas, tone:'ov-tone-danger', href:'/vacinas?status=vencidas' }, <VaccineList items={data.vacinas.vencidasItens} />)}
      {panel('programadas', { title:'Vacinas nos próximos 30 dias', icon:TbVaccine, count:data.vacinas.pendentes, tone:'ov-tone-teal', href:'/vacinas?status=proximas' }, <VaccineList items={data.vacinas.pendentesItens} />)}
      {panel('retornos', { title:'Retornos pendentes', icon:FiClipboard, count:data.retornos.total, href:'/retornos' }, data.retornos.itens.length ? <ul className="ov-list">{data.retornos.itens.map(row => <li key={row.id}><Link className="ov-row-link" to={String(row.data_retorno).slice(0,10) < data.hoje ? "/retornos?status=atrasados" : "/retornos"}><div><strong>{row.pet_nome || 'Paciente não informado'}</strong><span>{row.motivo || 'Acompanhamento clínico'}</span></div><time className={String(row.data_retorno).slice(0,10) < data.hoje ? 'ov-overdue' : ''} dateTime={row.data_retorno}>{formatOverviewDate(row.data_retorno)}</time></Link></li>)}</ul> : <OverviewEmpty>Nenhum retorno pendente no momento.</OverviewEmpty>)}
      {panel('agenda', { title:`Agenda de hoje · ${formatOverviewDate(data.hoje)}`, icon:FiCalendar, count:data.agenda.total, href:'/agenda' }, data.agenda.itens.length ? <ul className="ov-list">{data.agenda.itens.map(row => <li key={row.id}><Link className="ov-row-link" to="/agenda"><time className="ov-time">{row.horario || '—'}</time><div><strong>{row.pet_nome || 'Paciente não informado'}</strong><span>{row.tipo_servico || 'Atendimento'}{row.tutor_nome ? ` · ${row.tutor_nome}` : ''}</span></div><span className="ov-status">{row.status || 'Agendado'}</span></Link></li>)}</ul> : <OverviewEmpty>Nenhum agendamento para hoje. Sua agenda está livre.</OverviewEmpty>)}
    </div><div className="ov-column ov-home-top-right">
      <section className="ov-welcome"><span className="ov-eyebrow"><FiBell /> SEU DIA NO VETCARE</span><h2>Olá, {firstName}.</h2><p>Vamos cuidar de quem precisa de você.</p><div className="ov-welcome-stats"><div><strong>{data.agenda.total}</strong><span>agendamentos hoje</span></div><div><strong>{data.retornos.atrasados}</strong><span>retornos em atraso</span></div><div><strong>{data.vacinas.vencidas}</strong><span>doses vencidas</span></div></div><div className="ov-welcome-footer"><span>{data.clinica?.nome || 'Sua clínica'}<small>{data.clinica?.status_assinatura === 'trial' ? `Teste gratuito até ${formatOverviewDate(data.clinica.data_expiracao)}` : 'Sua rotina clínica conectada.'}</small></span><Link to={user.perfil === 'admin' ? '/assinatura' : '/perfil'}>{user.perfil === 'admin' ? 'Minha assinatura' : 'Meu perfil'}<FiArrowRight /></Link></div></section>
    </div><div className="ov-home-section-headings">
      <div className="ov-expand-row"><span>Seus avisos</span></div>
      <div className="ov-expand-row"><span>Atividade recente</span><button type="button" aria-pressed={allExpanded} onClick={() => setExpanded(allExpanded ? new Set() : new Set(panelIds))}>{allExpanded ? 'Recolher tudo' : 'Expandir tudo'}</button></div>
    </div><div className="ov-column ov-home-bottom-right">

      {panel('cadastros', { title:'Últimos cadastros', icon:TbPaw }, <div className="ov-recent-grid"><div><h3>Pacientes</h3>{data.cadastros.animais.length ? <ul className="ov-list">{data.cadastros.animais.map(row => <li key={row.id}><Link className="ov-row-link" to={`/perfil-animal/${row.id}`}><div><strong>{row.nome}</strong><span>{row.especie}</span></div><FiArrowRight /></Link></li>)}</ul> : <OverviewEmpty>Nenhum paciente cadastrado.</OverviewEmpty>}</div><div><h3>Tutores</h3>{data.cadastros.tutores.length ? <ul className="ov-list">{data.cadastros.tutores.map(row => <li key={row.id}><Link className="ov-row-link" to={`/perfil-tutor/${row.id}`}><strong>{row.nome}</strong><FiArrowRight /></Link></li>)}</ul> : <OverviewEmpty>Nenhum tutor cadastrado.</OverviewEmpty>}</div></div>)}
      {panel('registros', { title:'Últimos registros clínicos', icon:FiClipboard, href:'/historico' }, <ClinicalRecords records={data.registros} />)}
      {panel('aniversarios', { title:'Aniversariantes do mês', icon:FiGift }, birthdays.length ? <ul className="ov-list">{birthdays.map(row => <li key={`${row.type}-${row.id}`}><Link className="ov-row-link" to={row.href}><div><strong>{row.nome}</strong><span>{row.type}</span></div><span className="ov-birthday">{formatOverviewDate(row.nascimento).slice(0,5)}</span></Link></li>)}</ul> : <OverviewEmpty>Nenhum aniversário cadastrado para este mês.</OverviewEmpty>)}
    </div></div>}
  </div>;
}
