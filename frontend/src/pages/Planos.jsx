import BackToDashboard from "../components/BackToDashboard";
import React, { useState, useEffect } from 'react';
import { FiCheck, FiLogOut, FiZap, FiShield, FiStar, FiHeart } from 'react-icons/fi';
import './Planos.css';

const Planos = () => {
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('usuario');
    if (userStr) {
      setUsuario(JSON.parse(userStr));
    }
  }, []);

  const handleAssinar = () => {
    window.location.href = '/checkout?plano=complete';
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = '/login';
  };

  return (
    <div className="v-planos-layout">
      {/* Mesh Background */}
      <div className="v-planos-mesh">
        <div className="v-planos-orb v-orb-purple"></div>
        <div className="v-planos-orb v-orb-cyan"></div>
      </div>

      <nav className="v-planos-nav reveal-top">
        <div className="v-nav-brand">
          <div className="v-nav-logo-box">
            <FiShield />
          </div>
          <span>Vet Care <span className="v-nav-badge">SaaS</span></span>
        </div>
        <BackToDashboard />
        <button className="v-btn-logout-pill" onClick={handleLogout}>
          <FiLogOut /> SAIR
        </button>
      </nav>

      <div className="v-planos-content">
        <div className="v-planos-header reveal-bottom">
          <h1 className="v-planos-title">Escolha o seu nível de <span>Excelência</span></h1>
          <p className="v-planos-subtitle">
            Escolha o acesso ideal para <strong>{usuario?.clinica?.nome || 'sua clínica'}</strong>. O teste gratuito dura 7 dias; depois, assine por R$ 97 ao mês para continuar usando o sistema.
          </p>
        </div>

        <div className="v-planos-grid">
          
          <div className="v-plano-card v-glass-panel reveal-left">
            <div className="v-plano-icon-wrapper"><FiHeart /></div>
            <h2>Free</h2>
            <p className="v-plano-desc">Recursos essenciais para começar a organizar a rotina da clínica.</p>
            <div className="v-plano-price">
              Grátis<span> por 7 dias</span>
            </div>
            
            <ul className="v-plano-features">
              <li><FiCheck className="v-check-icon" /> Dashboard e agenda</li>
              <li><FiCheck className="v-check-icon" /> Tutores e cadastro de pacientes</li>
              <li><FiCheck className="v-check-icon" /> Prontuário e histórico clínico</li>
              <li><FiCheck className="v-check-icon" /> Sem cartão durante o período de teste</li>
            </ul>

            <button className="v-btn-plano-secondary" onClick={() => { window.location.href = '/'; }}>
              Acessar o sistema
            </button>
          </div>

          <div className="v-plano-card v-plano-premium v-glass-panel reveal-right">
            <div className="v-premium-badge">PLANO COMPLETO</div>
            <div className="v-premium-glow"></div>
            
            <div className="v-plano-icon-wrapper v-premium-icon"><FiStar /></div>
            <h2>VetCare Completo</h2>
            <p className="v-plano-desc">Todos os módulos de gestão em uma única assinatura mensal.</p>
            <div className="v-plano-price v-price-premium">
              R$ 97<span>/mês</span>
            </div>
            
            <ul className="v-plano-features">
              <li><FiCheck className="v-check-icon v-premium-check" /> Todos os recursos do Free</li>
              <li><FiCheck className="v-check-icon v-premium-check" /> Estoque, internação e exames</li>
              <li><FiCheck className="v-check-icon v-premium-check" /> Financeiro, relatórios e comissões</li>
              <li><FiCheck className="v-check-icon v-premium-check" /> CRM e acompanhamento de pacientes</li>
              <li><FiCheck className="v-check-icon v-premium-check" /> Cancele quando quiser</li>
            </ul>

            <button 
              className="v-btn-plano-primary-3d"
              onClick={handleAssinar}
            >
              Assinar por R$ 97/mês
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Planos;
