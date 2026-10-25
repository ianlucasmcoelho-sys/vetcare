import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from '@react-oauth/google';
import { 
  FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle, 
  FiArrowRight, FiSun, FiMoon, FiUser, FiZap, FiShield,
  FiActivity, FiTrendingUp, FiCalendar, FiUsers
} from "react-icons/fi";
import { MdOutlinePets } from "react-icons/md";
import { API_URL } from "../services/api";
import "./Login.css";

const mockStats = [
  { icon: FiUsers, label: "Tutores Ativos", value: "2.4k+", color: "#14b8a6" },
  { icon: MdOutlinePets, label: "Pacientes", value: "3.9k+", color: "#3b82f6" },
  { icon: FiTrendingUp, label: "Receita Média", value: "R$12k", color: "#10b981" },
  { icon: FiCalendar, label: "Agendamentos", value: "98/mês", color: "#f59e0b" },
];

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro("");

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem("token", data.token);
        const userData = { ...data.usuario, clinica: data.clinica };
        localStorage.setItem("usuario", JSON.stringify(userData));
        
        const params = new URLSearchParams(window.location.search);
        const plano = params.get('plano');
        
        if (plano === 'pro' || plano === 'premium') {
          window.location.href = `/checkout?plano=${plano}`;
        } else {
          window.location.href = "/"; 
        }
      } else {
        setErro(data.error || "E-mail ou senha inválidos");
      }
    } catch (error) {
      setErro("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setErro("");
    try {
      const response = await fetch(`${API_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        localStorage.setItem("token", data.token);
        const userData = { ...data.usuario, clinica: data.clinica };
        localStorage.setItem("usuario", JSON.stringify(userData));
        window.location.href = "/"; 
      } else {
        setErro(data.error || "Falha ao entrar com Google");
      }
    } catch (error) {
      setErro("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleAcessarDemo = async () => {
    setEmail("demo@vetcare.com");
    setSenha("demo123");
    setLoading(true);
    setErro("");
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "demo@vetcare.com", senha: "demo123" }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        localStorage.setItem("token", data.token);
        const userData = { ...data.usuario, clinica: data.clinica };
        localStorage.setItem("usuario", JSON.stringify(userData));
        window.location.href = "/";
      } else {
        setErro(data.error || "Falha ao entrar no modo demonstração");
      }
    } catch (error) {
      setErro("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="v-auth-page">
      {/* Ambient Background */}
      <div className="v-auth-ambient">
        <div className="v-auth-orb v-auth-orb-1"></div>
        <div className="v-auth-orb v-auth-orb-2"></div>
      </div>

      {/* Floating Navbar */}
      <nav className="v-login-nav reveal-top">
        <div className="v-nav-brand" onClick={() => navigate("/")}>
          <div className="v-nav-logo-box">
            <img src="/logo.png" alt="Vet Care Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
          </div>
          <span>Vet Care</span>
        </div>
        <div className="v-nav-actions">
           <button className="v-home-link" onClick={() => navigate("/")}>← Voltar ao site</button>
           <button className="v-theme-toggle-pill" onClick={toggleTheme}>
              {theme === "light" ? <FiMoon size={16} /> : <FiSun size={16} />}
           </button>
        </div>
      </nav>

      <div className="v-login-content-split">
        {/* ===== AUTH PANEL ===== */}
        <div className="v-panel-auth reveal-left">
          <div className="v-auth-card">
            {/* Header */}
            <div className="v-auth-card-header">
              <div className="v-auth-logo-badge">
                <img src="/logo.png" alt="Vet Care" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
              </div>
              <h2>Bem-vindo de volta</h2>
              <p>Acesse sua plataforma de gestão veterinária</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="v-form-pill">
              {erro && <div className="v-pill-error"><FiAlertCircle /> {erro}</div>}
              
              <div className="v-input-pill-group">
                <FiMail className="v-pill-icon" />
                <input 
                  type="email" 
                  placeholder="E-mail corporativo" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="v-input-pill-group">
                <FiLock className="v-pill-icon" />
                <input 
                  type={showSenha ? "text" : "password"} 
                  placeholder="Senha" 
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
                <button type="button" className="v-pill-eye" onClick={() => setShowSenha(!showSenha)}>
                  {showSenha ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>

              <div className="v-forgot-row">
                <button type="button" className="v-link-forgot" onClick={() => navigate('/recuperar-senha')}>
                  Esqueceu sua senha?
                </button>
              </div>

              <button type="submit" className="v-btn-pill-primary-3d" disabled={loading}>
                {loading ? (
                  <span className="v-btn-loading">
                    <span className="v-spinner"></span> Entrando...
                  </span>
                ) : (
                  <>Entrar na plataforma <FiArrowRight /></>
                )}
              </button>

              <button 
                type="button" 
                className="v-btn-pill-demo" 
                onClick={handleAcessarDemo} 
                disabled={loading}
                title="Acesse o perfil pré-populado com dados simulados completos"
              >
                <FiZap /> Acessar Perfil Demonstração
              </button>
              
              <div className="v-auth-divider">
                <span></span>
                <small>ou continue com</small>
                <span></span>
              </div>

              <div className="v-google-wrap">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setErro("Erro ao conectar com o Google")}
                  theme={theme === 'dark' ? 'filled_black' : 'outline'}
                  shape="pill"
                  width="400"
                />
              </div>
              
              <button type="button" className="v-btn-pill-secondary" onClick={() => navigate("/cadastro")}>
                Criar nova conta
              </button>
            </form>
          </div>
        </div>

        {/* ===== VISUAL PANEL ===== */}
        <div className="v-panel-intro reveal-right">
          <div className="v-intro-scene">
            {/* Heading */}
            <div className="v-intro-heading">
              <div className="v-intro-logo-wrap">
                <img src="/logo.png" alt="Vet Care" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
              </div>
              <h1 className="v-intro-title-3d">Vet<br/>Care</h1>
            </div>

            <p className="v-intro-tagline">
              O ecossistema de elite para veterinários. Gestão inteligente, 
              design imersivo e segurança de ponta.
            </p>

            {/* Stats Grid */}
            <div className="v-intro-stats">
              {mockStats.map((stat, i) => (
                <div key={i} className="v-intro-stat-card" style={{ animationDelay: `${i * 0.12}s` }}>
                  <div className="v-intro-stat-icon" style={{ background: `${stat.color}18`, color: stat.color }}>
                    <stat.icon size={16} />
                  </div>
                  <div>
                    <strong>{stat.value}</strong>
                    <small>{stat.label}</small>
                  </div>
                </div>
              ))}
            </div>

            {/* Mini Feature List */}
            <div className="v-intro-features-list">
              <div className="v-intro-feature-item">
                <div className="v-feature-dot" style={{ background: '#14b8a6' }}></div>
                <span>Agenda e prontuário integrados</span>
              </div>
              <div className="v-intro-feature-item">
                <div className="v-feature-dot" style={{ background: '#3b82f6' }}></div>
                <span>Financeiro e estoque automatizados</span>
              </div>
            </div>

            {/* Trust badges */}
            <div className="v-intro-badges">
              <div className="v-mini-badge"><FiZap size={12} /> SaaS de Elite</div>
              <div className="v-mini-badge"><FiShield size={12} /> 100% Seguro</div>
              <div className="v-mini-badge"><FiActivity size={12} /> 99.9% Uptime</div>
            </div>
          </div>
        </div>
      </div>

      <div className="v-login-bottom-bar">
        <span>© 2026 Vet Care • Tecnologia Brasileira</span>
      </div>
    </div>
  );
}
