import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  TbLayoutDashboard,
  TbHome,
  TbCalendar,
  TbUsers,
  TbPaw,
  TbStethoscope,
  TbBed,
  TbFlask,
  TbVaccine,
  TbRefresh,
  TbPrescription,
  TbFileCertificate,
  TbFileInvoice,
  TbReceiptTax,
  TbReceipt,
  TbPackage,
  TbTags,
  TbReportMoney,
  TbFolderOpen,
  TbTemplate,
  TbHeartHandshake,
  TbFileAnalytics,
  TbUserCheck,
  TbSettings,
  TbChevronLeft,
  TbChevronRight
} from 'react-icons/tb';
import './Sidebar.css';
import { preloadRoute } from '../utils/routePreload';

export default function Sidebar({ isCollapsed, isMobileOpen, onToggle, onLinkClick }) {
  const visuallyCollapsed = isCollapsed && !isMobileOpen;
  const usuarioStr = localStorage.getItem("usuario");
  const usuario = usuarioStr ? JSON.parse(usuarioStr) : null;
  const plano = usuario?.clinica?.plano_id || 'free';
  const status = usuario?.clinica?.status_assinatura || 'trial';
  const isPlanoGratuito = plano === 'free' && status !== 'vitalicio';

  const menuSections = [
    {
      title: 'Principal',
      items: [
        { path: '/', label: 'Início', icon: TbHome },
        { path: '/dashboard', label: 'Dashboard clínico', icon: TbLayoutDashboard },
        { path: '/agenda', label: 'Agendamentos', icon: TbCalendar },
        { path: '/responsaveis', label: 'Tutores / Clientes', icon: TbUsers },
        { path: '/animais', label: 'Pacientes (Pets)', icon: TbPaw },
      ]
    },
    {
      title: 'Atendimento Clínico',
      items: [
        { path: '/historico', label: 'Consultas & Prontuários', icon: TbStethoscope },
        { path: '/internacao', label: 'Internação Clínica', icon: TbBed, premium: isPlanoGratuito },
        { path: '/exames', label: 'Exames Laboratoriais', icon: TbFlask, premium: isPlanoGratuito },
        { path: '/vacinas', label: 'Vacinas & Vermífugos', icon: TbVaccine },
        { path: '/retornos', label: 'Retornos Clínicos', icon: TbRefresh },
        { path: '/receituario', label: 'Receituário', icon: TbPrescription },
        { path: '/documentos', label: 'Documentos & Atestados', icon: TbFileCertificate },
      ]
    },
    {
      title: 'Gestão & Suprimentos',
      items: [
        { path: '/financeiro', label: 'Financeiro / Caixa', icon: TbReceiptTax, premium: isPlanoGratuito },
        { path: '/orcamentos', label: 'Orçamentos', icon: TbReceipt },
        { path: '/notas-fiscais', label: 'Notas Fiscais', icon: TbFileInvoice },
        { path: '/estoque', label: 'Controle de Estoque', icon: TbPackage, premium: isPlanoGratuito },
        { path: '/tabela-precos', label: 'Tabela de Preços', icon: TbTags },
        { path: '/comissoes', label: 'Comissões', icon: TbReportMoney, premium: isPlanoGratuito },
        { path: '/arquivos', label: 'Arquivos da Clínica', icon: TbFolderOpen },
        { path: '/templates', label: 'Modelos de Texto', icon: TbTemplate },
      ]
    },
    {
      title: 'Inteligência & Sistema',
      items: [
        { path: '/crm', label: 'Retenção & CRM', icon: TbHeartHandshake, premium: isPlanoGratuito },
        { path: '/relatorios', label: 'Relatórios & DRE', icon: TbFileAnalytics, premium: isPlanoGratuito },
        { path: '/usuarios', label: 'Equipe & Usuários', icon: TbUserCheck },
        { path: '/configuracoes', label: 'Configurações', icon: TbSettings },
      ]
    }
  ];

  const handleLinkClick = () => {
    if (onLinkClick) onLinkClick();
  };

  return (
    <aside id="app-navigation" className={`sidebar ${visuallyCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        <NavLink to="/" className="sidebar-logo" onClick={handleLinkClick}>
          <div className="sidebar-logo-icon">
            <TbPaw />
          </div>
          <span className="sidebar-logo-text">
            Vet<span>Care</span>
          </span>
        </NavLink>
        {onToggle && (
          <button
            className="sidebar-toggle-btn"
            aria-label={visuallyCollapsed ? "Expandir menu" : "Recolher menu"}
            aria-expanded={!visuallyCollapsed}
            onClick={onToggle}
            title={visuallyCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {visuallyCollapsed ? <TbChevronRight size={18} /> : <TbChevronLeft size={18} />}
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <nav className="sidebar-nav">
        {menuSections.map((section, idx) => (
          <div key={idx} className="sidebar-section">
            {!visuallyCollapsed && <div className="sidebar-section-title">{section.title}</div>}
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  title={visuallyCollapsed ? item.label : undefined}
                  onClick={handleLinkClick}
                  onMouseEnter={() => preloadRoute(item.path)}
                  onFocus={() => preloadRoute(item.path)}
                >
                  <span className="sidebar-link-icon">
                    <Icon />
                  </span>
                  <span className="sidebar-link-text">{item.label}</span>
                  {item.premium && !visuallyCollapsed && (
                    <span className="sidebar-badge">PRO</span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer Plan Info */}
      <div className="sidebar-footer">
        <NavLink to="/assinatura" style={{ textDecoration: 'none' }} onClick={handleLinkClick}>
          <div className="sidebar-plan-card">
            <div className="sidebar-plan-header">
              <span className="sidebar-plan-name">
                {status === 'vitalicio' ? 'Acesso Vitalício' : plano === 'free' ? 'Plano Free' : 'VetCare Completo'}
              </span>
              <span className="sidebar-plan-badge">
                {status === 'vitalicio' ? 'VITALÍCIO' : status === 'free' ? 'FREE' : status === 'active' ? 'ATIVO' : 'TRIAL'}
              </span>
            </div>
            <span className="sidebar-plan-desc">
                {status === 'vitalicio' ? 'Acesso permanente' : plano === 'free' ? 'Conheça o plano completo' : 'Plano com acesso completo'}
            </span>
          </div>
        </NavLink>
      </div>
    </aside>
  );
}
