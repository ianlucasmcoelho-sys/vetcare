import React, { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { lazyPage } from "./utils/routePreload";
const AuthenticatedShell = lazy(() => import("./components/AuthenticatedShell.jsx"));
import ErrorBoundary from "./components/ErrorBoundary.jsx";
const Login = lazyPage("Login");
const Dashboard = lazyPage("Dashboard");
const Inicio = lazyPage("Inicio");
const Responsaveis = lazyPage("Responsaveis");
const Animais = lazyPage("Animais");
const Historico = lazyPage("Historico");
const Retornos = lazyPage("Retornos");
const Agenda = lazyPage("Agenda");
const Vacinas = lazyPage("Vacinas");
const Estoque = lazyPage("Estoque");
const Financeiro = lazyPage("Financeiro");
const Documentos = lazyPage("Documentos");
const Retencao = lazyPage("Retencao");
const CentralArquivos = lazyPage("CentralArquivos");
const PerfilTutor = lazyPage("PerfilTutor");
const PerfilAnimal = lazyPage("PerfilAnimal");
const Receituario = lazyPage("Receituario");
const Relatorios = lazyPage("Relatorios");
const Configuracoes = lazyPage("Configuracoes");
const MeuPerfil = lazyPage("MeuPerfil");
const CadastroClinica = lazyPage("CadastroClinica");
const ResetarSenha = lazyPage("ResetarSenha");
const RecuperarSenha = lazyPage("RecuperarSenha");
const Usuarios = lazyPage("Usuarios");
const Internacao = lazyPage("Internacao");
const Exames = lazyPage("Exames");
const TemplateManager = lazyPage("TemplateManager");
const TabelaPrecos = lazyPage("TabelaPrecos");
const Landing = lazyPage("Landing");
const Orcamentos = lazyPage("Orcamentos");
const Planos = lazyPage("Planos");
const Checkout = lazyPage("Checkout");
const PagamentoSucesso = lazyPage("PagamentoSucesso");
const Onboarding = lazyPage("Onboarding");
const Comissoes = lazyPage("Comissoes");
const BanhoTosa = lazyPage("BanhoTosa");
const AcompanharBanhoTosa = lazyPage("AcompanharBanhoTosa");
const Automacoes = lazyPage("Automacoes");
const Assinatura = lazyPage("Assinatura");
const NotasFiscais = lazyPage("NotasFiscais");
import "./App.css";
import "./Global.css";
import "./styles/performance.css";

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
  const [,refreshBilling] = useState(0);
  useEffect(()=>{
    const refresh=()=>refreshBilling(value=>value+1);
    window.addEventListener('billing-updated',refresh);
    return ()=>window.removeEventListener('billing-updated',refresh);
  },[]);
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

  if (location.pathname.startsWith("/acompanhar-banho-tosa/")) {
    const token = decodeURIComponent(location.pathname.slice("/acompanhar-banho-tosa/".length).split("/")[0]);
    return <Suspense fallback={<div role="status" className="route-loading">Carregando acompanhamento...</div>}>
      <AcompanharBanhoTosa token={token} />
    </Suspense>;
  }

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
  const hasPaidCompletePlan = status === 'vitalicio'
    || (plano === 'complete' && ['active', 'ativo', 'ativa'].includes(status));

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

  const isPlanosPage = location.pathname === "/planos" || location.pathname === "/checkout" || location.pathname === "/pagamento-sucesso" || location.pathname === "/assinatura";
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
        <Route path="/assinatura" element={<Assinatura />} />
        <Route path="/onboarding" element={<Onboarding usuario={usuario} />} />
      </Routes>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<div role="status" className="route-loading">Carregando...</div>}>
      <AuthenticatedShell sidebarCollapsed={sidebarCollapsed} mobileMenuOpen={mobileMenuOpen}
        toggleMobileMenu={toggleMobileMenu} closeMobileMenu={closeMobileMenu} toggleSidebar={toggleSidebar}>
        <Suspense fallback={<div role="status" aria-live="polite" className="route-loading">Carregando...</div>}>
      <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/inicio" element={<Navigate to="/" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
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
          <Route path="/notas-fiscais" element={<NotasFiscais />} />
          <Route path="/banhotosa" element={hasPaidCompletePlan ? <BanhoTosa /> : <Navigate to="/planos" replace />} />

          {/* Premium / Blocked Features for Vet Clínica */}
          <Route path="/internacao" element={isFreePlan ? <Navigate to="/planos" /> : <Internacao />} />
          <Route path="/exames" element={isFreePlan ? <Navigate to="/planos" /> : <Exames />} />
          <Route path="/estoque" element={isFreePlan ? <Navigate to="/planos" /> : <Estoque />} />
          <Route path="/servicos" element={isFreePlan ? <Navigate to="/planos" /> : <Estoque />} />
          <Route path="/comissoes" element={isFreePlan ? <Navigate to="/planos" /> : <Comissoes />} />
          <Route path="/crm" element={isFreePlan ? <Navigate to="/planos" /> : <Retencao />} />
          <Route path="/automacoes" element={<Automacoes />} />
          <Route path="/relatorios" element={isFreePlan ? <Navigate to="/planos" /> : <Relatorios />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      </AuthenticatedShell>
    </Suspense>
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
