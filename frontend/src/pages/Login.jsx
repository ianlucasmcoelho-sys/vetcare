import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from '@react-oauth/google';
import { 
  FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle, 
  FiArrowRight, FiSun, FiMoon, FiArrowLeft, FiUser, FiZap, FiShield
} from "react-icons/fi";
import { MdOutlinePets } from "react-icons/md";
import { API_URL } from "../services/api";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [showRecuperar, setShowRecuperar] = useState(false);
  const [emailRecuperacao, setEmailRecuperacao] = useState("");
  const [mensagemRecuperacao, setMensagemRecuperacao] = useState("");
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [mousePos, setMouseX] = useState({ x: 0, y: 0 });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  const handleMouseMove = (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 20;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    setMouseX({ x, y });
  };

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

  return (
    <div className="v-auth-page" onMouseMove={handleMouseMove}>
      {/* Floating Navbar */}
      <nav className="v-login-nav reveal-top">
        <div className="v-nav-brand" onClick={() => navigate("/")} style={{ gap: '10px' }}>
          <div className="v-nav-logo-box" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
            <img src="/logo.png" alt="Vet Care Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
          </div>
          <span>Vet Care</span>
        </div>
        <div className="v-nav-actions">
           <button className="v-home-link" onClick={() => navigate("/")}>HOME</button>
           <button className="v-theme-toggle-pill" onClick={toggleTheme}>
              {theme === "light" ? <FiMoon /> : <FiSun />}
           </button>
        </div>
      </nav>

      <div className="v-login-content-split">
        {/* Auth Panel */}
        <div className="v-panel-auth reveal-left">
          <div className="v-auth-header">
            <div className="v-user-avatar-3d">
              <FiUser />
            </div>
            <h2>Bem-vindo</h2>
            <p>Acesse sua plataforma de gestão veterinária</p>
          </div>

          <form onSubmit={handleSubmit} className="v-form-pill">
            {erro && <div className="v-pill-error"><FiAlertCircle /> {erro}</div>}
            
            <div className="v-input-pill-group">
              <FiMail className="v-pill-icon" />
              <input 
                type="email" 
                placeholder="E-mail Corporativo" 
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

            <div className="v-auth-footer-actions">
               <button type="submit" className="v-btn-pill-primary-3d" disabled={loading}>
                 {loading ? "..." : "LOG IN"}
               </button>
            </div>
            
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>OU</div>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => {
                  setErro("Erro ao conectar com o Google");
                }}
                theme={theme === 'dark' ? 'filled_black' : 'outline'}
                shape="pill"
                width="400"
              />
            </div>
            
            <button type="button" className="v-btn-pill-secondary" onClick={() => navigate("/cadastro")}>
                 CRIAR CONTA
            </button>

            <button type="button" className="v-link-forgot" onClick={() => setShowRecuperar(true)}>
              Esqueceu sua senha?
            </button>
          </form>
        </div>

        {/* Visual Divider (Inspired by image) */}
        <div className="v-split-divider"></div>

        {/* Intro Panel with 3D Depth */}
        <div className="v-panel-intro reveal-right">
          <div className="v-intro-3d-scene" style={{ 
            transform: `perspective(1000px) rotateY(${mousePos.x * 0.4}deg) rotateX(${-mousePos.y * 0.4}deg)` 
          }}>
            <h1 className="v-intro-title-3d">Vet <br/> Care</h1>
            <p className="v-intro-tagline">
              O ecossistema de elite para veterinários de alta performance. 
              Gestão inteligente, design imersivo e segurança local.
            </p>
            <div className="v-intro-features">
              <div className="v-mini-badge"><FiZap /> SaaS de Elite</div>
              <div className="v-mini-badge"><FiShield /> 100% Seguro</div>
            </div>
            <button className="v-btn-pill-white" onClick={() => navigate("/")}>
              SAIBA MAIS...
            </button>
          </div>
        </div>
      </div>

      <div className="v-login-bottom-bar">
        <span>© 2026 Vet Care • Tecnologia Brasileira</span>
      </div>
    </div>
  );
}
