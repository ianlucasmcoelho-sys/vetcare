import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle, 
  FiArrowRight, FiPhone, FiSun, FiMoon, FiCheckCircle, FiArrowLeft, FiZap, FiShield
} from "react-icons/fi";
import { FaPaw, FaBuilding, FaShieldAlt, FaRocket, FaUserTie } from "react-icons/fa";
import { MdOutlinePets } from "react-icons/md";
import { API_URL } from "../services/api";
import "./Login.css"; // Reuse login styles
import "./CadastroClinica.css";

export default function CadastroClinica() {
  const navigate = useNavigate();
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

      if (response.ok) {
        setSucesso("Clínica cadastrada com sucesso!");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
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
    <div className="v-harmonized-signup" onMouseMove={handleMouseMove}>
      {/* Reuse Mesh Background */}
      <div className="v-login-mesh">
        <div className="v-login-orb v-orb-teal"></div>
        <div className="v-login-orb v-orb-blue"></div>
      </div>

      {/* Floating Navbar */}
      <nav className="v-login-nav reveal-top">
        <div className="v-nav-brand" onClick={() => navigate("/")}>
          <div className="v-nav-logo-box">
            <MdOutlinePets />
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

      <div className="v-signup-content-split">
        {/* Signup Form Panel */}
        <div className="v-panel-signup-form reveal-left">
          <div className="v-signup-header">
            <h2>Criar Conta</h2>
            <p>Junte-se à elite da gestão veterinária</p>
          </div>

          <form onSubmit={handleSubmit} className="v-form-pill">
            {erro && <div className="v-pill-error"><FiAlertCircle /> {erro}</div>}
            {sucesso && <div className="v-pill-success"><FiCheckCircle /> {sucesso}</div>}

            <div className="v-section-pill">
              <h3 className="v-section-title"><FaBuilding /> Dados da Clínica</h3>
              <div className="v-signup-grid">
                <div className="v-input-pill-group v-full-width">
                  <label className="v-input-pill-label">Nome da Clínica / Razão Social</label>
                  <div className="v-input-wrapper">
                    <FiZap className="v-pill-icon" />
                    <input 
                      type="text" 
                      name="clinica_nome"
                      placeholder="Ex: Clínica Veterinária Ouro Pet" 
                      value={form.clinica_nome}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="v-input-pill-group">
                  <label className="v-input-pill-label">Telefone</label>
                  <div className="v-input-wrapper">
                    <FiPhone className="v-pill-icon" />
                    <input 
                      type="tel" 
                      name="clinica_telefone"
                      placeholder="(00) 00000-0000" 
                      value={form.clinica_telefone}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="v-input-pill-group">
                  <label className="v-input-pill-label">E-mail Corporativo</label>
                  <div className="v-input-wrapper">
                    <FiMail className="v-pill-icon" />
                    <input 
                      type="email" 
                      name="clinica_email"
                      placeholder="contato@clinica.com" 
                      value={form.clinica_email}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="v-section-pill">
              <h3 className="v-section-title">Administrador</h3>
              <div className="v-signup-grid">
                <div className="v-input-pill-group v-full-width">
                  <label className="v-input-pill-label">Nome Completo</label>
                  <div className="v-input-wrapper">
                    <FiUser className="v-pill-icon" />
                    <input 
                      type="text" 
                      name="admin_nome"
                      placeholder="Nome do responsável" 
                      value={form.admin_nome}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="v-input-pill-group v-full-width">
                  <label className="v-input-pill-label">E-mail de Acesso</label>
                  <div className="v-input-wrapper">
                    <FiMail className="v-pill-icon" />
                    <input 
                      type="email" 
                      name="admin_email"
                      placeholder="seu@email.com" 
                      value={form.admin_email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="v-input-pill-group">
                  <label className="v-input-pill-label">Senha</label>
                  <div className="v-input-wrapper">
                    <FiLock className="v-pill-icon" />
                    <input 
                      type={showSenha ? "text" : "password"} 
                      name="admin_senha"
                      placeholder="Mín. 6 caracteres" 
                      value={form.admin_senha}
                      onChange={handleChange}
                      required
                    />
                    <button type="button" className="v-pill-eye" onClick={() => setShowSenha(!showSenha)}>
                      {showSenha ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>
                <div className="v-input-pill-group">
                  <label className="v-input-pill-label">Confirmar Senha</label>
                  <div className="v-input-wrapper">
                    <FiLock className="v-pill-icon" />
                    <input 
                      type={showConfirmSenha ? "text" : "password"} 
                      name="admin_confirm_senha"
                      placeholder="Repita a senha" 
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
            </div>

            <div className="v-auth-footer-actions">
               <button type="submit" className="v-btn-pill-primary-3d" disabled={loading}>
                 {loading ? "..." : "CRIAR CONTA"}
               </button>
               <span className="v-divider-text">ou</span>
               <button type="button" className="v-btn-pill-secondary" onClick={() => navigate("/login")}>
                 LOG IN
               </button>
            </div>
          </form>
        </div>

        {/* Visual Divider */}
        <div className="v-split-divider"></div>

        {/* Intro Panel */}
        <div className="v-panel-intro reveal-right">
          <div className="v-intro-3d-scene" style={{ 
            transform: `perspective(1000px) rotateY(${mousePos.x * 0.4}deg) rotateX(${-mousePos.y * 0.4}deg)` 
          }}>
            <h1 className="v-intro-title-3d">Vet <br/> Care</h1>
            <p className="v-intro-tagline">
              Sua jornada para o próximo nível começa aqui. Tecnologia de ponta para quem não aceita o comum.
            </p>
            
            <div className="v-signup-features">
              <div className="v-feature-card">
                <div className="v-feature-icon-box"><FaRocket /></div>
                <div className="v-feature-text">
                  <h4>Setup Instantâneo</h4>
                  <p>Inicie sua operação em segundos.</p>
                </div>
              </div>
              <div className="v-feature-card">
                <div className="v-feature-icon-box"><FiShield /></div>
                <div className="v-feature-text">
                  <h4>Privacidade Total</h4>
                  <p>Dados criptografados e seguros.</p>
                </div>
              </div>
            </div>

            <button className="v-btn-pill-white" onClick={() => navigate("/")}>
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
