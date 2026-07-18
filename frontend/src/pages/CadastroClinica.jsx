import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle, 
  FiPhone, FiSun, FiMoon, FiCheckCircle, FiZap, FiShield, FiStar
} from "react-icons/fi";
import { FaBuilding } from "react-icons/fa";
import { MdOutlinePets } from "react-icons/md";
import { API_URL } from "../services/api";
import "./Login.css";
import "./CadastroClinica.css";

export default function CadastroClinica() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planoSelected = searchParams.get('plano') || 'free';
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmSenha, setShowConfirmSenha] = useState(false);
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

  const [form, setForm] = useState({
    clinica_nome: "",
    clinica_cnpj: "",
    clinica_telefone: "",
    clinica_email: "",
    admin_nome: "",
    admin_email: "",
    admin_senha: "",
    admin_confirm_senha: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro("");
    setSucesso("");

    if (form.admin_senha !== form.admin_confirm_senha) {
      setErro("As senhas não coincidem");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/cadastro-clinica`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSucesso("Clínica cadastrada com sucesso!");
        
        // Logar o usuário automaticamente
        localStorage.setItem("token", data.token);
        const userData = { ...data.usuario, clinica: data.clinica };
        localStorage.setItem("usuario", JSON.stringify(userData));

        setTimeout(() => {
          const params = new URLSearchParams(window.location.search);
          const plano = params.get('plano') || 'free';
          
          if (plano === 'clinica' || plano === 'complete') {
            window.location.href = `/checkout?plano=${plano}`;
          } else {
            window.location.href = "/";
          }
        }, 1500);
      } else {
        setErro(data.error || "Erro ao cadastrar clínica");
      }
    } catch (error) {
      setErro("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="v-auth-page v-harmonized-signup-override" onMouseMove={handleMouseMove}>
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

      <div className="v-login-content-split v-signup-split-override">
        {/* Left Side: Auth Panel (Form) */}
        <div className="v-panel-auth v-panel-signup reveal-left">
          <div className="v-auth-header v-signup-header-compact">
            <div className="v-user-avatar-3d v-avatar-small">
              <FaBuilding />
            </div>
            <h2>Criar Conta</h2>
            <p>Cadastre sua clínica e revolucione sua gestão</p>
          </div>

          <form onSubmit={handleSubmit} className="v-form-pill v-form-signup-pill">
            {erro && <div className="v-pill-error"><FiAlertCircle /> {erro}</div>}
            {sucesso && <div className="v-pill-success"><FiCheckCircle /> {sucesso}</div>}

            <div className="v-signup-pill-section">
              <h3 className="v-signup-pill-title">Dados da Clínica</h3>
              <div className="v-signup-pill-grid">
                <div className="v-input-pill-group v-col-full">
                  <FiZap className="v-pill-icon" />
                  <input 
                    type="text" 
                    name="clinica_nome"
                    placeholder="Nome da Clínica / Razão Social" 
                    value={form.clinica_nome}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="v-input-pill-group">
                  <FiPhone className="v-pill-icon" />
                  <input 
                    type="tel" 
                    name="clinica_telefone"
                    placeholder="Telefone" 
                    value={form.clinica_telefone}
                    onChange={handleChange}
                  />
                </div>
                <div className="v-input-pill-group">
                  <FiMail className="v-pill-icon" />
                  <input 
                    type="email" 
                    name="clinica_email"
                    placeholder="E-mail Comercial" 
                    value={form.clinica_email}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="v-signup-pill-section">
              <h3 className="v-signup-pill-title">Administrador</h3>
              <div className="v-signup-pill-grid">
                <div className="v-input-pill-group v-col-full">
                  <FiUser className="v-pill-icon" />
                  <input 
                    type="text" 
                    name="admin_nome"
                    placeholder="Nome Completo" 
                    value={form.admin_nome}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="v-input-pill-group v-col-full">
                  <FiMail className="v-pill-icon" />
                  <input 
                    type="email" 
                    name="admin_email"
                    placeholder="E-mail de Acesso" 
                    value={form.admin_email}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="v-input-pill-group">
                  <FiLock className="v-pill-icon" />
                  <input 
                    type={showSenha ? "text" : "password"} 
                    name="admin_senha"
                    placeholder="Senha" 
                    value={form.admin_senha}
                    onChange={handleChange}
                    required
                  />
                  <button type="button" className="v-pill-eye" onClick={() => setShowSenha(!showSenha)}>
                    {showSenha ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                <div className="v-input-pill-group">
                  <FiLock className="v-pill-icon" />
                  <input 
                    type={showConfirmSenha ? "text" : "password"} 
                    name="admin_confirm_senha"
                    placeholder="Confirmar Senha" 
                    value={form.admin_confirm_senha}
                    onChange={handleChange}
                    required
                  />
                  <button type="button" className="v-pill-eye" onClick={() => setShowConfirmSenha(!showConfirmSenha)}>
                    {showConfirmSenha ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
            </div>

            <div className="v-auth-footer-actions">
               <button type="submit" className="v-btn-pill-primary-3d" disabled={loading || sucesso !== ""}>
                 {loading ? "..." : (sucesso !== "" ? "REDIRECIONANDO..." : "CRIAR CONTA")}
               </button>
               <span className="v-divider-text">ou</span>
               <button type="button" className="v-btn-pill-secondary" onClick={() => navigate("/login")}>
                 LOG IN
               </button>
            </div>
          </form>
        </div>

        {/* Visual Divider */}
        <div className="v-split-divider v-divider-tall"></div>

        {/* Right Side: Intro Panel */}
        <div className="v-panel-intro reveal-right">
          <div className="v-intro-3d-scene" style={{ 
            transform: `perspective(1000px) rotateY(${mousePos.x * 0.4}deg) rotateX(${-mousePos.y * 0.4}deg)` 
          }}>
            {planoSelected === 'complete' && (
              <>
                <div className="v-mini-badge" style={{background: 'var(--accent-color)', color: '#000', marginBottom: '1rem'}}>
                  Plano Vet Complete
                </div>
                <h1 className="v-intro-title-3d">Gestão 360º<br/>para Clínicas</h1>
                <p className="v-intro-tagline">
                  Você está a um passo de revolucionar sua clínica e petshop com gestão completa.
                </p>
                <div className="v-intro-features" style={{ justifyContent: 'center' }}>
                  <div className="v-mini-badge"><FiStar /> Ilimitado</div>
                  <div className="v-mini-badge"><FiShield /> Comissões e CRM</div>
                </div>
              </>
            )}
            
            {planoSelected === 'clinica' && (
              <>
                <div className="v-mini-badge" style={{background: 'var(--primary)', color: '#fff', marginBottom: '1rem'}}>
                  Plano Vet Clínica
                </div>
                <h1 className="v-intro-title-3d">Foco na<br/>Medicina</h1>
                <p className="v-intro-tagline">
                  O fundamental para manter seu consultório operando com excelência.
                </p>
                <div className="v-intro-features" style={{ justifyContent: 'center' }}>
                  <div className="v-mini-badge"><FiZap /> Prontuário VIP</div>
                  <div className="v-mini-badge"><FiShield /> Estoque e Agenda</div>
                </div>
              </>
            )}

            {planoSelected === 'free' && (
              <>
                <div className="v-mini-badge" style={{background: 'var(--bg-tertiary)', color: 'var(--text-main)', marginBottom: '1rem'}}>
                  Trial (7 Dias)
                </div>
                <h1 className="v-intro-title-3d">Sem<br/>Compromisso</h1>
                <p className="v-intro-tagline">
                  Experimente o Vet Care gratuitamente. Sem cartão de crédito.
                </p>
                <div className="v-intro-features" style={{ justifyContent: 'center' }}>
                  <div className="v-mini-badge"><FiMoon /> Recursos Básicos</div>
                  <div className="v-mini-badge"><FiCheckCircle /> Pets Ilimitados</div>
                </div>
              </>
            )}
            
            <button className="v-btn-pill-white" onClick={() => navigate("/")} style={{ marginTop: '2rem' }}>
              CONHEÇA O SISTEMA
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
