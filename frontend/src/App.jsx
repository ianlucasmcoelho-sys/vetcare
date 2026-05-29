import React, { useState } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import TopBar from "./components/TopBar.jsx";
import MenuToggle from "./components/MenuToggle.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Responsaveis from "./pages/Responsaveis.jsx";
import Animais from "./pages/Animais.jsx";
import Historico from "./pages/Historico.jsx";
import Retornos from "./pages/Retornos.jsx";
import Agenda from "./pages/Agenda.jsx";
import Vacinas from "./pages/Vacinas.jsx";
import Estoque from "./pages/Estoque.jsx";
import Financeiro from "./pages/Financeiro.jsx";
import Documentos from "./pages/Documentos.jsx";
import Retencao from "./pages/Retencao.jsx";
import CentralArquivos from "./pages/CentralArquivos.jsx";
import PerfilTutor from "./pages/PerfilTutor.jsx";
import PerfilAnimal from "./pages/PerfilAnimal.jsx";
import Receituario from "./pages/Receituario.jsx";
import Relatorios from "./pages/Relatorios.jsx";
import Configuracoes from "./pages/Configuracoes.jsx";
import MeuPerfil from "./pages/MeuPerfil.jsx";
import CadastroClinica from "./pages/CadastroClinica.jsx";
import ResetarSenha from "./pages/ResetarSenha.jsx";
import Usuarios from "./pages/Usuarios.jsx";
import Internacao from "./pages/Internacao.jsx";
import Exames from "./pages/Exames.jsx";
import TemplateManager from "./pages/TemplateManager.jsx";
import TabelaPrecos from "./pages/TabelaPrecos.jsx";
import Landing from "./pages/Landing.jsx";
import "./App.css";
import "./Global.css";

function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const token = localStorage.getItem("token");

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // Rotas Públicas (Quando NÃO está logado)
  if (!token) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<CadastroClinica />} />
        <Route path="/resetar-senha" element={<ResetarSenha />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Rotas Privadas (Quando ESTÁ logado)
  const isLoginPage = location.pathname === "/login";
  const isCadastroPage = location.pathname === "/cadastro";
  const isResetPage = location.pathname === "/resetar-senha";
  
  if (isLoginPage || isCadastroPage || isResetPage) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="layout">
      <MenuToggle isOpen={mobileMenuOpen} onClick={toggleMobileMenu} />
      <div 
        className={`sidebar-overlay ${mobileMenuOpen ? "active" : ""}`} 
        onClick={closeMobileMenu} 
      />
      <div className={`sidebar ${mobileMenuOpen ? "mobile-open" : ""}`}>
        <Sidebar onLinkClick={closeMobileMenu} />
      </div>
      <TopBar />
      <main className="content">
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
          <Route path="/servicos" element={<Estoque />} />
          <Route path="/tabela-precos" element={<TabelaPrecos />} />
          <Route path="/receituario" element={<Receituario />} />
          <Route path="/financeiro" element={<Financeiro />} />
          <Route path="/documentos" element={<Documentos />} />
          <Route path="/crm" element={<Retencao />} />
          <Route path="/arquivos" element={<CentralArquivos />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/perfil" element={<MeuPerfil />} />
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/internacao" element={<Internacao />} />
          <Route path="/exames" element={<Exames />} />
          <Route path="/templates" element={<TemplateManager />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}