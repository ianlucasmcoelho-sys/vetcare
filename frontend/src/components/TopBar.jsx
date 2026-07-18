import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FiUser, FiLogOut, FiSettings, FiChevronDown, 
  FiBell, FiActivity, FiSun, FiMoon
} from "react-icons/fi";
import Notificacoes from "./Notificacoes";
import { apiGet } from "../services/api";
import "./TopBar.css";

export default function TopBar() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificacoesOpen, setIsNotificacoesOpen] = useState(false);
  const [notificacoesCount, setNotificacoesCount] = useState(0);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  
  const menuRef = useRef(null);
  const notifRef = useRef(null);

  // Aplicar tema dinâmico
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  // Buscar usuário do localStorage
  const [usuario, setUsuario] = useState(() => {
    const usuarioStr = localStorage.getItem("usuario");
    return usuarioStr ? JSON.parse(usuarioStr) : { nome: "Admin", perfil: "admin", email: "admin@vetcare.com" };
  });

  useEffect(() => {
    const handleUsuarioUpdate = () => {
      const usuarioStr = localStorage.getItem("usuario");
      if (usuarioStr) {
        setUsuario(JSON.parse(usuarioStr));
      }
    };
    window.addEventListener('usuarioAtualizado', handleUsuarioUpdate);
    return () => window.removeEventListener('usuarioAtualizado', handleUsuarioUpdate);
  }, []);

  // Buscar contagem de notificações não lidas considerando o que já foi lido localmente
  const carregarContagem = async () => {
    try {
      const response = await apiGet("/notificacoes");
      if (response && response.ok) {
        const data = await response.json();
        const lidasStorage = JSON.parse(localStorage.getItem("notificacoes_lidas") || "[]");
        const naoLidas = data.filter(n => !lidasStorage.includes(n.id)).length;
        setNotificacoesCount(naoLidas);
      }
    } catch (error) {
      console.error("❌ Erro ao carregar contagem:", error);
    }
  };

  useEffect(() => {
    carregarContagem();
    const interval = setInterval(carregarContagem, 60000);
    
    // Ouvir evento de atualização de notificações
    const handleUpdate = (e) => {
      setNotificacoesCount(e.detail);
    };
    window.addEventListener('notificacoesAtualizadas', handleUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('notificacoesAtualizadas', handleUpdate);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setIsNotificacoesOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/");
  };

  return (
    <div className="topbar">
      <div className="topbar-left">
        {/* Espaço reservado para Breadcrumbs ou Título da Página Dinâmico */}
      </div>

      <div className="topbar-right">
        {/* Botão de Alternar Tema (Dark/Light) */}
        <button 
          className="topbar-icon-btn theme-toggle-btn" 
          onClick={toggleTheme} 
          title={`Mudar para modo ${theme === 'light' ? 'escuro' : 'claro'}`}
        >
          {theme === "light" ? <FiMoon size={18} /> : <FiSun size={18} />}
        </button>

        <div className="notificacoes-container" ref={notifRef}>
          <button 
            className={`topbar-icon-btn ${notificacoesCount > 0 ? "has-notification" : ""}`} 
            onClick={() => setIsNotificacoesOpen(!isNotificacoesOpen)}
            title="Notificações"
          >
            <FiBell size={18} />
            {notificacoesCount > 0 && (
              <span className="notification-badge">{notificacoesCount > 9 ? "9+" : notificacoesCount}</span>
            )}
          </button>
          <Notificacoes isOpen={isNotificacoesOpen} onClose={() => setIsNotificacoesOpen(false)} />
        </div>

        <div className="user-menu-container" ref={menuRef}>
          <button className="user-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <div className="user-avatar-circle">
              <FiUser size={16} />
            </div>
            <div className="user-info-text">
              <span className="user-display-name">{usuario.nome?.split(" ")[0] || "Admin"}</span>
              <span className="user-display-role">{usuario.perfil === 'admin' ? 'Administrador' : 'Veterinário'}</span>
            </div>
            <FiChevronDown className={`menu-chevron ${isMenuOpen ? "open" : ""}`} size={14} />
          </button>

          {isMenuOpen && (
            <div className="user-dropdown-menu">
              <div className="dropdown-user-header">
                <div className="header-avatar"><FiUser size={18} /></div>
                <div className="header-details">
                  <span className="header-name">{usuario.nome}</span>
                  <span className="header-email">{usuario.email}</span>
                </div>
              </div>
              <div className="dropdown-links">
                <button className="dropdown-link-item" onClick={() => { setIsMenuOpen(false); navigate("/configuracoes"); }}>
                  <FiSettings size={14} /> Configurações
                </button>
                <div className="dropdown-link-divider"></div>
                <button className="dropdown-link-item logout-link" onClick={handleLogout}>
                  <FiLogOut size={14} /> Sair do Sistema
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
