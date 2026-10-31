import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MenuToggle from './MenuToggle';
import '../styles/interface-fixes.css';

export default function AuthenticatedShell({ sidebarCollapsed, mobileMenuOpen, toggleMobileMenu, closeMobileMenu, toggleSidebar, children }) {
  return <div className={`layout v-global-mesh-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
    <div className="v-dash-mesh" aria-hidden="true"><div className="v-orb-dash v-orb-primary" /><div className="v-orb-dash v-orb-secondary" /></div>
    <MenuToggle isOpen={mobileMenuOpen} onClick={toggleMobileMenu} />
    <button type="button" className={`sidebar-overlay ${mobileMenuOpen ? 'active' : ''}`}
      onClick={closeMobileMenu} aria-label="Fechar menu de navegação" aria-hidden={!mobileMenuOpen} tabIndex={mobileMenuOpen ? 0 : -1} />
    <Sidebar isCollapsed={sidebarCollapsed} isMobileOpen={mobileMenuOpen} onToggle={toggleSidebar} onLinkClick={closeMobileMenu} />
    <TopBar isCollapsed={sidebarCollapsed} />
    <main className="content">{children}</main>
  </div>;
}
