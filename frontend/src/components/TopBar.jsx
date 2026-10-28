import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, NavLink } from 'react-router-dom';
import {
  TbSun,
  TbMoon,
  TbBell,
  TbUserCheck,
  TbSearch,
  TbChevronRight,
  TbHome,
  TbUser,
  TbSettings,
  TbLogout,
  TbChevronDown,
  TbPaw,
  TbX,
  TbLoader,
  TbCalendarEvent,
  TbVaccine,
  TbPackage,
  TbAlertTriangle,
  TbCheck,
  TbRefresh
} from 'react-icons/tb';
import { apiGet } from '../services/api.js';
import './TopBar.css';

const ROUTE_MAP = {
  '/': { title: 'Início', category: 'Principal' },
  '/dashboard': { title: 'Dashboard clínico', category: 'Indicadores' },
  '/agenda': { title: 'Agenda & Consultas', category: 'Principal' },
  '/responsaveis': { title: 'Tutores & Clientes', category: 'Cadastros' },
  '/animais': { title: 'Pacientes (Pets)', category: 'Cadastros' },
  '/historico': { title: 'Consultas & Prontuários', category: 'Atendimento' },
  '/internacao': { title: 'Internação Clínica', category: 'Atendimento' },
  '/exames': { title: 'Exames Laboratoriais', category: 'Atendimento' },
  '/vacinas': { title: 'Vacinas & Vermífugos', category: 'Atendimento' },
  '/retornos': { title: 'Retornos Clínicos', category: 'Atendimento' },
  '/receituario': { title: 'Receituário Médico', category: 'Atendimento' },
  '/documentos': { title: 'Documentos & Atestados', category: 'Atendimento' },
  '/financeiro': { title: 'Fluxo Financeiro', category: 'Gestão' },
  '/orcamentos': { title: 'Orçamentos', category: 'Gestão' },
  '/notas-fiscais': { title: 'Notas Fiscais', category: 'Gestão' },
  '/estoque': { title: 'Controle de Estoque', category: 'Gestão' },
  '/servicos': { title: 'Controle de Estoque', category: 'Gestão' },
  '/tabela-precos': { title: 'Tabela de Preços', category: 'Gestão' },
  '/comissoes': { title: 'Comissões', category: 'Gestão' },
  '/crm': { title: 'Retenção & CRM', category: 'Gestão' },
  '/relatorios': { title: 'Relatórios & DRE', category: 'Gestão' },
  '/arquivos': { title: 'Arquivos & Exames', category: 'Gestão' },
  '/templates': { title: 'Modelos de Texto', category: 'Gestão' },
  '/configuracoes': { title: 'Configurações da Clínica', category: 'Sistema' },
  '/perfil': { title: 'Meu Perfil', category: 'Sistema' },
  '/usuarios': { title: 'Gestão de Usuários', category: 'Sistema' },
  '/assinatura': { title: 'Minha Assinatura', category: 'Sistema' },
};

export default function TopBar({ isDarkMode, onToggleTheme, isCollapsed }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Estados de Dropdown do Usuário
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const userDropdownRef = useRef(null);

  // Estados de Notificações
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificacoes, setNotificacoes] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [lidas, setLidas] = useState(new Set());
  const notifContainerRef = useRef(null);

  // Estados de Pesquisa Global Instantânea
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState({ tutores: [], animais: [] });
  const [searchOpen, setSearchOpen] = useState(false);
  const searchContainerRef = useRef(null);

  const currentRoute = ROUTE_MAP[location.pathname] || (location.pathname.startsWith('/perfil-animal/') ? {title:'Perfil do paciente',category:'Atendimento'} : { title: 'VetCare', category: 'Sistema' });

  // Pegar dados do usuário do localStorage
  const usuarioStr = localStorage.getItem("usuario");
  const usuario = usuarioStr ? JSON.parse(usuarioStr) : null;

  // Carregar Notificações
  const carregarNotificacoes = async () => {
    try {
      setLoadingNotifs(true);
      const res = await apiGet('/notificacoes');
      if (res && res.ok) {
        const data = await res.json();
        setNotificacoes(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Erro ao carregar notificações na TopBar:", err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    carregarNotificacoes();
    // Atualizar notificações a cada 2 minutos
    const interval = setInterval(carregarNotificacoes, 120000);
    return () => clearInterval(interval);
  }, []);

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
      if (notifContainerRef.current && !notifContainerRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lógica de Pesquisa Instantânea com Debounce
  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();
    if (term.length < 2) {
      setSearchResults({ tutores: [], animais: [] });
      setSearchOpen(false);
      return;
    }

    setIsSearching(true);
    setSearchOpen(true);

    const timer = setTimeout(async () => {
      try {
        const [resTutores, resAnimais] = await Promise.allSettled([
          apiGet('/responsaveis'),
          apiGet('/animais')
        ]);

        let tutoresList = [];
        let animaisList = [];

        if (resTutores.status === 'fulfilled' && resTutores.value?.ok) {
          const data = await resTutores.value.json();
          tutoresList = Array.isArray(data) ? data : [];
        }

        if (resAnimais.status === 'fulfilled' && resAnimais.value?.ok) {
          const data = await resAnimais.value.json();
          animaisList = Array.isArray(data) ? data : [];
        }

        const tutoresFiltrados = tutoresList.filter(t =>
          t.nome?.toLowerCase().includes(term) ||
          t.email?.toLowerCase().includes(term) ||
          t.celular?.includes(term) ||
          t.cpf?.includes(term)
        ).slice(0, 5);

        const animaisFiltrados = animaisList.filter(a =>
          a.nome?.toLowerCase().includes(term) ||
          a.especie?.toLowerCase().includes(term) ||
          a.raca?.toLowerCase().includes(term) ||
          a.tutor_nome?.toLowerCase().includes(term)
        ).slice(0, 5);

        setSearchResults({ tutores: tutoresFiltrados, animais: animaisFiltrados });
      } catch (err) {
        console.error("Erro na busca da TopBar:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.clear();
    window.location.href = "/login";
  };

  const handleSelectResult = (path) => {
    setSearchOpen(false);
    setSearchTerm('');
    navigate(path);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      e.preventDefault();
      setSearchOpen(false);
      navigate(`/responsaveis?busca=${encodeURIComponent(searchTerm)}`);
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
    }
  };

  const handleNotifClick = (notif) => {
    // Marcar como lida
    setLidas(prev => new Set(prev).add(notif.id));
    setNotificationsOpen(false);

    // Navegar conforme o tipo
    if (notif.tipo === 'consulta') navigate('/agenda');
    else if (notif.tipo === 'retorno') navigate('/retornos');
    else if (notif.tipo.includes('vacina')) navigate('/vacinas');
    else if (notif.tipo === 'estoque') navigate('/servicos');
    else navigate('/dashboard');
  };

  const marcarTodasLidas = () => {
    const todasIds = notificacoes.map(n => n.id);
    setLidas(new Set(todasIds));
  };

  const notificacoesNaoLidas = notificacoes.filter(n => !lidas.has(n.id));
  const totalResults = searchResults.tutores.length + searchResults.animais.length;

  const getNotifIcon = (tipo) => {
    if (tipo === 'consulta') return <TbCalendarEvent className="notif-type-icon consulta" />;
    if (tipo === 'retorno') return <TbRefresh className="notif-type-icon retorno" />;
    if (tipo.includes('vacina')) return <TbVaccine className="notif-type-icon vacina" />;
    if (tipo === 'estoque') return <TbPackage className="notif-type-icon estoque" />;
    return <TbAlertTriangle className="notif-type-icon alerta" />;
  };

  return (
    <header className={`topbar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Dynamic Breadcrumb */}
      <div className="topbar-left">
        <div className="topbar-breadcrumb">
          <TbHome className="breadcrumb-icon" />
          <span className="breadcrumb-brand">VetCare</span>
          <TbChevronRight className="breadcrumb-sep" />
          <span className="breadcrumb-category">{currentRoute.category}</span>
          <TbChevronRight className="breadcrumb-sep" />
          <span className="breadcrumb-current">{currentRoute.title}</span>
        </div>
      </div>

      {/* Global Interactive Search Bar */}
      <div className="topbar-search-container" ref={searchContainerRef}>
        <div className="topbar-search">
          <TbSearch className="search-icon" />
          <input
            type="text"
            placeholder="Buscar tutor, pet, prontuário..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => { if (searchTerm.trim().length >= 2) setSearchOpen(true); }}
            onKeyDown={handleKeyDown}
          />
          {isSearching ? (
            <TbLoader className="search-status-icon spin" />
          ) : searchTerm ? (
            <button className="search-clear-btn" onClick={() => { setSearchTerm(''); setSearchOpen(false); }}>
              <TbX size={16} />
            </button>
          ) : null}
        </div>

        {/* Dropdown de Resultados da Pesquisa */}
        {searchOpen && (
          <div className="search-dropdown-menu fade-in">
            {isSearching ? (
              <div className="search-loading-state">
                <TbLoader className="spin" size={24} />
                <span>Buscando no sistema...</span>
              </div>
            ) : totalResults === 0 ? (
              <div className="search-empty-state">
                <TbSearch size={28} />
                <p>Nenhum resultado para "<strong>{searchTerm}</strong>"</p>
                <span>Tente buscar por nome de tutor, telefone ou nome do pet</span>
              </div>
            ) : (
              <div className="search-results-wrapper">
                {searchResults.tutores.length > 0 && (
                  <div className="search-section">
                    <div className="search-section-title">
                      <TbUser size={14} />
                      <span>Tutores & Clientes ({searchResults.tutores.length})</span>
                    </div>
                    {searchResults.tutores.map((tutor) => (
                      <div
                        key={tutor.id}
                        className="search-item"
                        onClick={() => handleSelectResult(`/perfil-tutor/${tutor.id}`)}
                      >
                        <div className="search-item-avatar user">
                          <TbUser size={18} />
                        </div>
                        <div className="search-item-info">
                          <strong>{tutor.nome}</strong>
                          <span>{tutor.celular || tutor.email || 'Sem contato'}</span>
                        </div>
                        <span className="search-item-badge">Tutor</span>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.animais.length > 0 && (
                  <div className="search-section">
                    <div className="search-section-title">
                      <TbPaw size={14} />
                      <span>Pacientes / Pets ({searchResults.animais.length})</span>
                    </div>
                    {searchResults.animais.map((pet) => (
                      <div
                        key={pet.id}
                        className="search-item"
                        onClick={() => handleSelectResult(`/perfil-animal/${pet.id}`)}
                      >
                        <div className="search-item-avatar pet">
                          <TbPaw size={18} />
                        </div>
                        <div className="search-item-info">
                          <strong>{pet.nome}</strong>
                          <span>
                            {[pet.especie, pet.raca].filter(Boolean).join(' • ') || 'Pet'}
                            {pet.tutor_nome ? ` (Tutor: ${pet.tutor_nome})` : ''}
                          </span>
                        </div>
                        <span className="search-item-badge pet">Paciente</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="search-dropdown-footer">
                  <span>Pressione <kbd>Enter</kbd> para ver todos os tutores</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right User Controls */}
      <div className="topbar-right">
        {onToggleTheme && (
          <button
            className="topbar-icon-btn"
            onClick={onToggleTheme}
            title={isDarkMode ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
          >
            {isDarkMode ? <TbSun size={20} /> : <TbMoon size={20} />}
          </button>
        )}

        {/* Notifications Panel Trigger */}
        <div className="topbar-notif-container" ref={notifContainerRef}>
          <button
            className={`topbar-icon-btn badge-btn ${notificationsOpen ? 'active' : ''}`}
            title="Notificações & Alertas"
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setDropdownOpen(false);
              setSearchOpen(false);
            }}
          >
            <TbBell size={20} />
            {notificacoesNaoLidas.length > 0 && (
              <span className="notif-badge-count">
                {notificacoesNaoLidas.length > 99 ? '99+' : notificacoesNaoLidas.length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {notificationsOpen && (
            <div className="notif-dropdown-panel fade-in">
              <div className="notif-panel-header">
                <div className="notif-title-row">
                  <TbBell size={18} className="notif-header-icon" />
                  <strong>Notificações</strong>
                  {notificacoesNaoLidas.length > 0 && (
                    <span className="notif-header-badge">{notificacoesNaoLidas.length} novas</span>
                  )}
                </div>
                {notificacoesNaoLidas.length > 0 && (
                  <button className="notif-mark-read-btn" onClick={marcarTodasLidas}>
                    <TbCheck size={14} />
                    <span>Marcar lidas</span>
                  </button>
                )}
              </div>

              <div className="notif-panel-body">
                {loadingNotifs ? (
                  <div className="notif-loading">
                    <TbLoader className="spin" size={24} />
                    <span>Carregando alertas...</span>
                  </div>
                ) : notificacoes.length === 0 ? (
                  <div className="notif-empty">
                    <TbBell size={32} />
                    <p>Nenhuma notificação no momento</p>
                    <span>Tudo em dia com suas consultas e estoque!</span>
                  </div>
                ) : (
                  <div className="notif-list">
                    {notificacoes.map((n) => {
                      const isLida = lidas.has(n.id);
                      return (
                        <div
                          key={n.id}
                          className={`notif-item ${isLida ? 'lida' : 'nao-lida'} ${n.prioridade}`}
                          onClick={() => handleNotifClick(n)}
                        >
                          <div className="notif-item-icon">
                            {getNotifIcon(n.tipo)}
                          </div>
                          <div className="notif-item-content">
                            <div className="notif-item-top">
                              <strong>{n.titulo}</strong>
                              {!isLida && <span className="notif-unread-dot"></span>}
                            </div>
                            <p>{n.mensagem}</p>
                            <span className="notif-item-date">{n.data}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="notif-panel-footer" onClick={() => { setNotificationsOpen(false); navigate('/dashboard'); }}>
                <span>Ver resumo no Dashboard →</span>
              </div>
            </div>
          )}
        </div>

        <div className="topbar-divider"></div>

        {/* User Profile Dropdown Menu */}
        <div className="topbar-user-container" ref={userDropdownRef}>
          <div 
            className="topbar-user" 
            onClick={() => {
              setDropdownOpen(!dropdownOpen);
              setNotificationsOpen(false);
              setSearchOpen(false);
            }}
            title="Menu do usuário"
          >
            <div className="user-avatar">
              {usuario?.nome ? usuario.nome.charAt(0).toUpperCase() : <TbUserCheck size={18} />}
            </div>
            <div className="user-info">
              <span className="user-name">{usuario?.nome || 'Veterinário(a)'}</span>
              <span className="user-role">{usuario?.clinica_nome || 'Clínica VetCare'}</span>
            </div>
            <TbChevronDown className={`dropdown-arrow ${dropdownOpen ? 'open' : ''}`} />
          </div>

          {dropdownOpen && (
            <div className="user-dropdown-menu fade-in">
              <div className="dropdown-header">
                <strong>{usuario?.nome || 'Usuário'}</strong>
                <span>{usuario?.email || usuario?.clinica_nome || 'VetCare'}</span>
              </div>
              <div className="dropdown-divider"></div>
              
              <NavLink 
                to="/perfil" 
                className="dropdown-item"
                onClick={() => setDropdownOpen(false)}
              >
                <TbUser size={18} />
                <span>Meu Perfil</span>
              </NavLink>

              <NavLink 
                to="/configuracoes" 
                className="dropdown-item"
                onClick={() => setDropdownOpen(false)}
              >
                <TbSettings size={18} />
                <span>Configurações</span>
              </NavLink>

              {usuario?.perfil === 'admin' && (
                <NavLink 
                  to="/usuarios" 
                  className="dropdown-item"
                  onClick={() => setDropdownOpen(false)}
                >
                  <TbUserCheck size={18} />
                  <span>Equipe & Usuários</span>
                </NavLink>
              )}

              <div className="dropdown-divider"></div>

              <button className="dropdown-item logout" onClick={handleLogout}>
                <TbLogout size={18} />
                <span>Sair do Sistema</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
