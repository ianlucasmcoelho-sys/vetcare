import React, { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import TopBar from "./components/TopBar.jsx";
import MenuToggle from "./components/MenuToggle.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
const Login = lazy(() => import("./pages/Login.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Responsaveis = lazy(() => import("./pages/Responsaveis.jsx"));
const Animais = lazy(() => import("./pages/Animais.jsx"));
const Historico = lazy(() => import("./pages/Historico.jsx"));
const Retornos = lazy(() => import("./pages/Retornos.jsx"));
const Agenda = lazy(() => import("./pages/Agenda.jsx"));
const Vacinas = lazy(() => import("./pages/Vacinas.jsx"));
const Estoque = lazy(() => import("./pages/Estoque.jsx"));
const Financeiro = lazy(() => import("./pages/Financeiro.jsx"));
const Documentos = lazy(() => import("./pages/Documentos.jsx"));
const Retencao = lazy(() => import("./pages/Retencao.jsx"));
const CentralArquivos = lazy(() => import("./pages/CentralArquivos.jsx"));
const PerfilTutor = lazy(() => import("./pages/PerfilTutor.jsx"));
const PerfilAnimal = lazy(() => import("./pages/PerfilAnimal.jsx"));
const Receituario = lazy(() => import("./pages/Receituario.jsx"));
const Relatorios = lazy(() => import("./pages/Relatorios.jsx"));
const Configuracoes = lazy(() => import("./pages/Configuracoes.jsx"));
const MeuPerfil = lazy(() => import("./pages/MeuPerfil.jsx"));
const CadastroClinica = lazy(() => import("./pages/CadastroClinica.jsx"));
const ResetarSenha = lazy(() => import("./pages/ResetarSenha.jsx"));
const RecuperarSenha = lazy(() => import("./pages/RecuperarSenha.jsx"));
const Usuarios = lazy(() => import("./pages/Usuarios.jsx"));
const Internacao = lazy(() => import("./pages/Internacao.jsx"));
const Exames = lazy(() => import("./pages/Exames.jsx"));
const TemplateManager = lazy(() => import("./pages/TemplateManager.jsx"));
const TabelaPrecos = lazy(() => import("./pages/TabelaPrecos.jsx"));
const Landing = lazy(() => import("./pages/Landing.jsx"));
const Orcamentos = lazy(() => import("./pages/Orcamentos.jsx"));
const Planos = lazy(() => import("./pages/Planos.jsx"));
const Checkout = lazy(() => import("./pages/Checkout.jsx"));
const PagamentoSucesso = lazy(() => import("./pages/PagamentoSucesso.jsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.jsx"));
const Comissoes = lazy(() => import("./pages/Comissoes.jsx"));
const BanhoTosa = lazy(() => import("./pages/BanhoTosa.jsx"));
const Assinatura = lazy(() => import("./pages/Assinatura.jsx"));
const NotasFiscais = lazy(() => import("./pages/NotasFiscais.jsx"));
import "./App.css";
import "./Global.css";

function RequiredFieldMessages() {
  useEffect(() => {
    const handleInvalid = (event) => {
      const field = event.target;
      if (!field.validity?.valueMissing) return;

      const labelElement = field.labels?.[0]
        || field.closest(".input-group, .form-group, .form-field")?.querySelector("label");
      const rawLabel = labelElement?.textContent
        || field.getAttribute("aria-label")
        || field.placeholder
        || field.name?.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ")
        || "campo obrigatório";
      const label = rawLabel.replace(/\*/g, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");
      const readableLabel = label.charAt(0).toLocaleUpperCase("pt-BR") + label.slice(1);

      field.setCustomValidity(`Preencha o campo ${readableLabel}.`);
    };

    const clearInvalidMessage = (event) => {
      if (event.target.required) event.target.setCustomValidity("");
    };

    document.addEventListener("invalid", handleInvalid, true);
    document.addEventListener("input", clearInvalidMessage, true);
    document.addEventListener("change", clearInvalidMessage, true);
    return () => {
      document.removeEventListener("invalid", handleInvalid, true);
      document.removeEventListener("input", clearInvalidMessage, true);
      document.removeEventListener("change", clearInvalidMessage, true);
    };
  }, []);

  return null;
}

function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("vetcare.sidebarCollapsed") === "true";
    } catch {
      return false;
    }
  });
  const location = useLocation();
  const token = localStorage.getItem("token");

  const toggleMobileMenu = () => setMobileMenuOpen((open) => !open);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      try {
        localStorage.setItem("vetcare.sidebarCollapsed", String(next));
      } catch {
        // O estado continua funcionando mesmo quando o armazenamento está indisponível.
      }
      return next;
    });
  };

  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event) => {
      if (event.key === "Escape") closeMobileMenu();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [mobileMenuOpen]);

  const usuarioStr = localStorage.getItem("usuario");
  const usuario = usuarioStr ? JSON.parse(usuarioStr) : null;
  const plano = usuario?.clinica?.plano_id || 'free';
  const status = (usuario?.clinica?.status_assinatura || 'trial').toLowerCase();
  const dataExpiracao = usuario?.clinica?.data_expiracao ? new Date(usuario.clinica.data_expiracao) : null;
  const isPeriodoTeste = ['free', 'trial'].includes(status) && dataExpiracao && new Date() <= dataExpiracao;
  const isAssinaturaValida = ['active', 'ativo', 'ativa', 'lifetime', 'vitalicio'].includes(status) || Boolean(isPeriodoTeste);
  const isFreePlan = plano === 'free' && status !== 'vitalicio';

  // Rotas Públicas (Quando NÃO está logado)
  if (!token) {
    return (
      <Suspense fallback={<div role="status" aria-live="polite" className="route-loading">Carregando...</div>}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<CadastroClinica />} />
        <Route path="/recuperar-senha" element={<RecuperarSenha />} />
        <Route path="/resetar-senha" element={<ResetarSenha />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    );
  }

  if (location.pathname === "/resetar-senha" || location.pathname === "/recuperar-senha") {
    return (
      <Suspense fallback={<div role="status" aria-live="polite" className="route-loading">Carregando...</div>}>
        <Routes>
          <Route path="/resetar-senha" element={<ResetarSenha />} />
          <Route path="/recuperar-senha" element={<RecuperarSenha />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }

  // Rotas Privadas (Quando ESTÁ logado)
  const isLoginPage = location.pathname === "/login";
  const isCadastroPage = location.pathname === "/cadastro";
  
  if (isLoginPage || isCadastroPage) {
    return <Navigate to="/" replace />;
  }

  // Verifica onboarding apenas se não for plano/checkout/pagamento e não estiver já na rota /onboarding
  const needsOnboarding = usuario?.clinica?.onboarding_concluido === 0;
  const isOnboardingPage = location.pathname === "/onboarding";

  const isPlanosPage = location.pathname === "/planos" || location.pathname === "/checkout" || location.pathname === "/pagamento-sucesso";
  const isFullScreenPage = isPlanosPage || isOnboardingPage;

  // Bloqueio de Acesso: Redireciona para /planos se a assinatura estiver vencida ou expirada
  if (!isAssinaturaValida && !isPlanosPage) {
    return <Navigate to="/planos" replace />;
  }

  if (needsOnboarding && !isOnboardingPage && !isPlanosPage && isAssinaturaValida) {
    return <Navigate to="/onboarding" replace />;
  }

  if (isFullScreenPage) {
    return (
      <Suspense fallback={<div role="status" aria-live="polite" className="route-loading">Carregando...</div>}>
      <Routes>
        <Route path="/planos" element={<Planos />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/pagamento-sucesso" element={<PagamentoSucesso />} />
        <Route path="/onboarding" element={<Onboarding usuario={usuario} />} />
      </Routes>
      </Suspense>
    );
  }

  return (
    <div className={`layout v-global-mesh-layout ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {/* Global Background Ambience */}
      <div className="v-dash-mesh">
        <div className="v-orb-dash v-orb-primary"></div>
        <div className="v-orb-dash v-orb-secondary"></div>
      </div>

      <MenuToggle isOpen={mobileMenuOpen} onClick={toggleMobileMenu} />
      <button
        type="button"
        className={`sidebar-overlay ${mobileMenuOpen ? "active" : ""}`} 
        onClick={closeMobileMenu}
        aria-label="Fechar menu de navegação"
        aria-hidden={!mobileMenuOpen}
        tabIndex={mobileMenuOpen ? 0 : -1}
      />
      <Sidebar
        isCollapsed={sidebarCollapsed}
        isMobileOpen={mobileMenuOpen}
        onToggle={toggleSidebar}
        onLinkClick={closeMobileMenu}
      />
      <TopBar isCollapsed={sidebarCollapsed} />
      <main className="content">
        <Suspense fallback={<div role="status" aria-live="polite" className="route-loading">Carregando...</div>}>
      <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/responsaveis" element={<Responsaveis />} />
          <Route path="/perfil-tutor/:id" element={<PerfilTutor />} />
          <Route path="/animais" element={<Animais />} />
          <Route path="/perfil-animal/:id" element={<PerfilAnimal />} />
          <Route path="/historico" element={<Historico />} />
          <Route path="/retornos" element={<Retornos />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/vacinas" element={<Vacinas />} />
          <Route path="/tabela-precos" element={<TabelaPrecos />} />
          <Route path="/receituario" element={<Receituario />} />
          <Route path="/financeiro" element={isFreePlan ? <Navigate to="/planos" /> : <Financeiro />} />
          <Route path="/documentos" element={<Documentos />} />
          <Route path="/arquivos" element={<CentralArquivos />} />
          <Route path="/assinatura" element={<Assinatura />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/perfil" element={<MeuPerfil />} />
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/templates" element={<TemplateManager />} />
          <Route path="/orcamentos" element={<Orcamentos />} />
          <Route path="/notas-fiscais" element={isFreePlan ? <Navigate to="/planos" /> : <NotasFiscais />} />

          {/* Premium / Blocked Features for Vet Clínica */}
          <Route path="/internacao" element={isFreePlan ? <Navigate to="/planos" /> : <Internacao />} />
          <Route path="/exames" element={isFreePlan ? <Navigate to="/planos" /> : <Exames />} />
          <Route path="/estoque" element={isFreePlan ? <Navigate to="/planos" /> : <Estoque />} />
          <Route path="/servicos" element={isFreePlan ? <Navigate to="/planos" /> : <Estoque />} />
          <Route path="/comissoes" element={isFreePlan ? <Navigate to="/planos" /> : <Comissoes />} />
          <Route path="/crm" element={isFreePlan ? <Navigate to="/planos" /> : <Retencao />} />
          <Route path="/automacoes" element={<Navigate to="/" replace />} />
          <Route path="/relatorios" element={isFreePlan ? <Navigate to="/planos" /> : <Relatorios />} />
          <Route path="/banhotosa" element={isFreePlan ? <Navigate to="/planos" /> : <BanhoTosa />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <RequiredFieldMessages />
        <AppLayout />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
