import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { usePermission } from "../hooks/usePermission";
import UpgradeModal from "./UpgradeModal";
import "./Sidebar.css";
import {
  TbLayoutDashboard, TbUser, TbPaw, TbCalendar, TbHistory,
  TbRefresh, TbCube, TbCurrencyDollar, TbVaccine, TbFileText,
  TbReport, TbSettings, TbUsers, TbActivity, TbFlask, TbReceiptTax, TbMessageCircle
} from "react-icons/tb";
import { FiLock, FiScissors } from "react-icons/fi";

export default function Sidebar({ onLinkClick }) {
  const { can, isAdmin } = usePermission();
  const podeVerUsuarios = can("verUsuarios");
  const podeVerRelatorios = can("verRelatorios");

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [featureToUpgrade, setFeatureToUpgrade] = useState("");

  const usuarioStr = localStorage.getItem("usuario");
  const usuario = usuarioStr ? JSON.parse(usuarioStr) : null;
  
  // plano_id = 'clinica' (Apenas Clínica), 'complete' (Clínica + Petshop), 'free' (Trial)
  const plano = usuario?.clinica?.plano_id || 'free';
  const status = usuario?.clinica?.status_assinatura || 'trial';
  
  // O plano Clínica bloqueia módulos avançados (Comissões, CRM, Relatórios VIP)
  const isApenasClinica = plano === 'clinica' && status !== 'trial';

  const handleRestrictedClick = (e, featureName) => {
    if (isApenasClinica) {
      e.preventDefault();
      setFeatureToUpgrade(featureName);
      setUpgradeModalOpen(true);
      if (onLinkClick) onLinkClick(); // close mobile menu if open
    } else {
      if (onLinkClick) onLinkClick();
    }
  };

  return (
    <>
      <aside className="sidebar">
        <div className="logo-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="Vet Care Logo" style={{ height: '32px', width: 'auto' }} />
          Vet Care
        </div>
        <nav>
          <div className="sidebar-section">
            <div className="sidebar-section-title">Principal</div>
            <NavLink to="/" end onClick={onLinkClick}><TbLayoutDashboard /> Painel de Controle</NavLink>
            <NavLink to="/agenda" onClick={onLinkClick}><TbCalendar /> Agenda</NavLink>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-title">Clínica & Pacientes</div>
            <NavLink to="/responsaveis" onClick={onLinkClick}><TbUser /> Tutores</NavLink>
            <NavLink to="/animais" onClick={onLinkClick}><TbPaw /> Animais</NavLink>
            <NavLink to="/historico" onClick={onLinkClick}><TbHistory /> Prontuário</NavLink>
            
            <NavLink to="/internacao" onClick={onLinkClick}>
              <TbActivity /> Internação
            </NavLink>
            
            <NavLink to="/retornos" onClick={onLinkClick}><TbRefresh /> Retornos</NavLink>
            <NavLink to="/vacinas" onClick={onLinkClick}><TbVaccine /> Vacinas</NavLink>
            
            <NavLink to="/exames" onClick={onLinkClick}>
              <TbFlask /> Exames
            </NavLink>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-title">Gestão</div>
            <NavLink to="/servicos" onClick={onLinkClick}>
              <TbCube /> Estoque
            </NavLink>
            <NavLink to={isApenasClinica ? "#" : "/banhotosa"} className="sidebar-link" onClick={(e) => handleRestrictedClick(e, "Centro Estético")}>
              <FiScissors size={20} style={{marginRight: '12px'}} /> Centro Estético {isApenasClinica && <FiLock style={{ marginLeft: 'auto', opacity: 0.5 }} />}
            </NavLink>
            <NavLink to="/financeiro" className="sidebar-link" onClick={onLinkClick}>
              <TbCurrencyDollar /> Financeiro
            </NavLink>
            <NavLink to={isApenasClinica ? "#" : "/comissoes"} className="sidebar-link" onClick={(e) => handleRestrictedClick(e, "Gestão de Comissões")}>
              <TbCurrencyDollar /> Comissões {isApenasClinica && <FiLock style={{ marginLeft: 'auto', opacity: 0.5 }} />}
            </NavLink>
            <NavLink to="/tabela-precos" className="sidebar-link" onClick={onLinkClick}><TbReceiptTax /> Tabela de Preços</NavLink>
            <NavLink to="/orcamentos" onClick={onLinkClick}><TbFileText /> Orçamentos</NavLink>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-title">Documentos & CRM</div>
            <NavLink to={isApenasClinica ? "#" : "/crm"} onClick={(e) => handleRestrictedClick(e, "Retenção & CRM")}>
              <TbUsers /> Retenção & CRM {isApenasClinica && <FiLock style={{ marginLeft: 'auto', opacity: 0.5 }} />}
            </NavLink>
            <NavLink to={isApenasClinica ? "#" : "/automacoes"} onClick={(e) => handleRestrictedClick(e, "Automações via WhatsApp")}>
              <TbMessageCircle /> WhatsApp & Automações {isApenasClinica && <FiLock style={{ marginLeft: 'auto', opacity: 0.5 }} />}
            </NavLink>
            <NavLink to="/receituario" onClick={onLinkClick}><TbFileText /> Receituário</NavLink>
            <NavLink to="/documentos" onClick={onLinkClick}><TbFileText /> Centro de Documentos</NavLink>
            <NavLink to="/arquivos" onClick={onLinkClick}><TbFileText /> Central de Arquivos</NavLink>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-title">Administrativo</div>
            {podeVerRelatorios && (
              <NavLink to={isApenasClinica ? "#" : "/relatorios"} onClick={(e) => handleRestrictedClick(e, "Relatórios DRE Avançados")}>
                <TbReport /> Relatórios {isApenasClinica && <FiLock style={{ marginLeft: 'auto', opacity: 0.5 }} />}
              </NavLink>
            )}
            {podeVerUsuarios && <NavLink to="/usuarios" onClick={onLinkClick}><TbUsers /> Usuários</NavLink>}
            {isAdmin() && <NavLink to="/templates" onClick={onLinkClick}><TbFileText /> Modelos</NavLink>}
            <NavLink to="/configuracoes" onClick={onLinkClick}><TbSettings /> Configurações</NavLink>
          </div>
        </nav>
      </aside>

      <UpgradeModal 
        isOpen={upgradeModalOpen} 
        onClose={() => setUpgradeModalOpen(false)} 
        featureName={featureToUpgrade} 
      />
    </>
  );
}