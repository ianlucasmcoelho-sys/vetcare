import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle, 
  FiPhone, FiSun, FiMoon, FiCheckCircle, FiZap, FiShield, 
  FiStar, FiArrowRight, FiCheck, FiActivity, FiPackage
} from "react-icons/fi";
import { FaBuilding } from "react-icons/fa";
import { MdOutlinePets, MdOutlineMedicalServices } from "react-icons/md";
import { API_URL } from "../services/api";
import "./Login.css";
import "./CadastroClinica.css";

// Conteúdo dinâmico do painel direito por plano
const planoPanels = {
  free: {
    badge: { label: "Plano Free", color: "rgba(100,116,139,0.12)", text: "#475569" },
    title: "Comece\nGrátis.",
    tagline: "Experimente os recursos essenciais por 7 dias, sem cartão de crédito.",
    features: [
      { icon: FiCheck, label: "7 dias de acesso gratuito", color: "#14b8a6" },
      { icon: MdOutlinePets, label: "Agenda, tutores e pacientes", color: "#3b82f6" },
      { icon: MdOutlineMedicalServices, label: "Prontuário e histórico clínico", color: "#8b5cf6" },
    ],
    stats: [
      { value: "R$ 0", unit: "", label: "Para sempre" },
      { value: "7", unit: "dias", label: "de teste gratuito" },
    ],
    cta: "Conheça o sistema completo",
  },
  complete: {
    badge: { label: "VetCare Completo", color: "rgba(20,184,166,0.12)", text: "#0d9488" },
    title: "Gestão\nCompleta.",
    tagline: "Todos os módulos de gestão por R$ 97 ao mês, com cobrança mensal.",
    features: [
      { icon: FiStar, label: "Estoque, financeiro e relatórios", color: "#f59e0b" },
      { icon: FiZap, label: "Internação, exames e CRM", color: "#14b8a6" },
      { icon: FiActivity, label: "Comissões e banho & tosa", color: "#8b5cf6" },
    ],
    stats: [
      { value: "R$97", unit: "/mês", label: "Preço único" },
      { value: "∞", unit: "", label: "Recursos completos" },
    ],
    cta: "Ver todos os recursos",
  },
};

export default function CadastroClinica() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planoSelected = searchParams.get('plano') || 'free';
  const panel = planoPanels[planoSelected] || planoPanels.free;

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmSenha, setShowConfirmSenha] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

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

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, text: '', color: '' };
    if (pass.length < 8) return { score: 1, text: 'Fraca', color: '#EF4444' };
    const hasUpper = /[A-Z]/.test(pass);
    const hasLower = /[a-z]/.test(pass);
    const hasNumber = /\d/.test(pass);
    const hasSpecial = /[@$!%*?&.]/.test(pass);
    if (hasUpper && hasLower && hasNumber && hasSpecial && pass.length >= 8) {
      return { score: 3, text: 'Forte', color: '#10B981' };
    }
    return { score: 2, text: 'Média', color: '#F59E0B' };
  };

  const strength = getPasswordStrength(form.admin_senha);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro("");
    setSucesso("");

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{8,}$/;
    if (!passwordRegex.test(form.admin_senha)) {
      setErro("A senha não atende aos requisitos de segurança.");
      setLoading(false);
      return;
    }

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
        localStorage.setItem("token", data.token);
        const userData = { ...data.usuario, clinica: data.clinica };
        localStorage.setItem("usuario", JSON.stringify(userData));

        setTimeout(() => {
          const plano = searchParams.get('plano') || 'free';
          if (plano === 'complete') {
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
    <div className="v-auth-page v-signup-page">
      {/* Ambient Background */}
      <div className="v-auth-ambient">
        <div className="v-auth-orb v-auth-orb-1"></div>
        <div className="v-auth-orb v-auth-orb-2"></div>
      </div>

      {/* Navbar */}
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

      <div className="v-signup-content-split">
        {/* ===== FORMULÁRIO ===== */}
        <div className="v-panel-auth reveal-left">
          <div className="v-auth-card v-signup-card">

            {/* Header */}
            <div className="v-auth-card-header">
              <div className="v-auth-logo-badge">
                <FaBuilding size={22} style={{ color: 'var(--primary)' }} />
              </div>
              <h2>Criar Conta</h2>
              <p>Cadastre sua clínica e revolucione sua gestão</p>
            </div>

            <form onSubmit={handleSubmit} className="v-form-pill v-signup-form">
              {erro && <div className="v-pill-error"><FiAlertCircle /> {erro}</div>}
              {sucesso && (
                <div className="v-pill-success">
                  <FiCheckCircle /> {sucesso}
                </div>
              )}

              {/* Seção Clínica */}
              <div className="v-signup-section">
                <div className="v-signup-section-label">
                  <FaBuilding size={12} />
                  Dados da Clínica
                </div>
                <div className="v-signup-grid">
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

              {/* Seção Admin */}
              <div className="v-signup-section">
                <div className="v-signup-section-label">
                  <FiUser size={12} />
                  Dados do Administrador
                </div>
                <div className="v-signup-grid">
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

                  {/* Senha com strength meter */}
                  <div className="v-col-full v-password-wrap">
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
                    {form.admin_senha && (
                      <div className="v-strength-meter">
                        <div className="v-strength-bars">
                          {[1, 2, 3].map(i => (
                            <div
                              key={i}
                              className="v-strength-bar"
                              style={{ background: strength.score >= i ? strength.color : 'var(--border-color)' }}
                            />
                          ))}
                          <span className="v-strength-text" style={{ color: strength.color }}>{strength.text}</span>
                        </div>
                        <p className="v-strength-hint">Mínimo 8 caracteres com maiúsculas, minúsculas, número e símbolo (@$!%*?&).</p>
                      </div>
                    )}
                  </div>

                  <div className="v-input-pill-group v-col-full">
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

              {/* Submit */}
              <button
                type="submit"
                className="v-btn-pill-primary-3d"
                disabled={loading || sucesso !== ""}
              >
                {loading ? (
                  <span className="v-btn-loading"><span className="v-spinner"></span> Criando conta...</span>
                ) : sucesso !== "" ? (
                  <span className="v-btn-loading"><FiCheckCircle /> Redirecionando...</span>
                ) : (
                  <>Criar minha Clínica <FiArrowRight /></>
                )}
              </button>

              <button type="button" className="v-btn-pill-secondary" onClick={() => navigate("/login")}>
                Já tenho uma conta
              </button>
            </form>
          </div>
        </div>

        {/* ===== PAINEL VISUAL ===== */}
        <div className="v-panel-intro reveal-right">
          <div className="v-intro-scene">

            {/* Plan Badge */}
            <div className="v-signup-plan-badge" style={{ background: panel.badge.color, color: panel.badge.text }}>
              {panel.badge.label}
            </div>

            {/* Title */}
            <h1 className="v-intro-title-3d" style={{ whiteSpace: 'pre-line' }}>
              {panel.title}
            </h1>

            <p className="v-intro-tagline">{panel.tagline}</p>

            {/* Stats Row */}
            <div className="v-signup-stats-row">
              {panel.stats.map((stat, i) => (
                <div key={i} className="v-signup-stat">
                  <div className="v-signup-stat-number">
                    {stat.value}<span>{stat.unit}</span>
                  </div>
                  <div className="v-signup-stat-label">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Feature List */}
            <div className="v-intro-features-list">
              {panel.features.map((feat, i) => (
                <div key={i} className="v-intro-feature-item">
                  <div className="v-feature-dot" style={{ background: feat.color }}></div>
                  <span>{feat.label}</span>
                </div>
              ))}
            </div>

            {/* Trust badges */}
            <div className="v-intro-badges">
              <div className="v-mini-badge"><FiShield size={12} /> Dados Seguros</div>
              <div className="v-mini-badge"><FiZap size={12} /> Setup em 2min</div>
              <div className="v-mini-badge"><FiActivity size={12} /> 99.9% Uptime</div>
            </div>

            {/* CTA link */}
            <button className="v-signup-back-link" onClick={() => navigate("/")}>
              {panel.cta} →
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
