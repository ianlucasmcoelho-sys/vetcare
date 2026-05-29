import React from "react";
import { NavLink } from "react-router-dom";
import { usePermission } from "../hooks/usePermission";
import "./Sidebar.css";
import {
  TbLayoutDashboard, TbUser, TbPaw, TbCalendar, TbHistory,
  TbRefresh, TbCube, TbCurrencyDollar, TbVaccine, TbFileText,
  TbReport, TbSettings, TbUsers, TbActivity, TbFlask, TbReceiptTax
} from "react-icons/tb";

export default function Sidebar({ onLinkClick }) {
  const { can, isAdmin } = usePermission();
  const podeVerUsuarios = can("verUsuarios");
  const podeVerRelatorios = can("verRelatorios");

  return (
    <aside className="sidebar">
      <div className="logo-title">
        <TbPaw size={24} color="#14b8a6" /> 
        Vet Care
      </div>
      <nav>
        <NavLink to="/" end onClick={onLinkClick}><TbLayoutDashboard /> Painel de Controle</NavLink>
        <NavLink to="/responsaveis" onClick={onLinkClick}><TbUser /> Tutores</NavLink>
        <NavLink to="/animais" onClick={onLinkClick}><TbPaw /> Animais</NavLink>
        <NavLink to="/historico" onClick={onLinkClick}><TbHistory /> Prontuário</NavLink>
        <NavLink to="/retornos" onClick={onLinkClick}><TbRefresh /> Retornos</NavLink>
        <NavLink to="/agenda" onClick={onLinkClick}><TbCalendar /> Agenda</NavLink>
        <NavLink to="/vacinas" onClick={onLinkClick}><TbVaccine /> Vacinas</NavLink>
        <NavLink to="/tabela-precos" onClick={onLinkClick}><TbReceiptTax /> Tabela de Preços</NavLink>
        <NavLink to="/receituario" onClick={onLinkClick}><TbFileText /> Receituário</NavLink>
        <NavLink to="/documentos" onClick={onLinkClick}><TbFileText /> Centro de Documentos</NavLink>
        <NavLink to="/crm" onClick={onLinkClick}><TbUsers /> Retenção & CRM</NavLink>
        <NavLink to="/internacao" onClick={onLinkClick}><TbActivity /> Internação</NavLink>
        <NavLink to="/exames" onClick={onLinkClick}><TbFlask /> Exames</NavLink>
        <NavLink to="/arquivos" onClick={onLinkClick}><TbFileText /> Central de Arquivos</NavLink>
        {podeVerRelatorios && <NavLink to="/relatorios" onClick={onLinkClick}><TbReport /> Relatórios</NavLink>}
        <NavLink to="/servicos" onClick={onLinkClick}><TbCube /> Estoque</NavLink>
        <NavLink to="/financeiro" onClick={onLinkClick}><TbCurrencyDollar /> Financeiro</NavLink>
        {podeVerUsuarios && <NavLink to="/usuarios" onClick={onLinkClick}><TbUsers /> Usuários</NavLink>}
        <NavLink to="/configuracoes" onClick={onLinkClick}><TbSettings /> Configurações</NavLink>
        {isAdmin() && <NavLink to="/templates" onClick={onLinkClick}><TbFileText /> Modelos</NavLink>}
      </nav>
    </aside>
  );
}