import React, { useState, useEffect } from 'react';
import { apiPost } from '../services/api';
import { FiCheck, FiLogOut, FiZap, FiShield, FiStar } from 'react-icons/fi';
import './Planos.css';

const Planos = () => {
  const [loading, setLoading] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [mousePos, setMouseX] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const userStr = localStorage.getItem('usuario');
    if (userStr) {
      setUsuario(JSON.parse(userStr));
    }
  }, []);

  const handleMouseMove = (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 20;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    setMouseX({ x, y });
  };

  const handleAssinar = (planoId) => {
    window.location.href = `/checkout?plano=${planoId}`;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = '/login';
  };

  return (
    <div className="v-planos-layout" onMouseMove={handleMouseMove}>
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
        <button className="v-btn-logout-pill" onClick={handleLogout}>
          <FiLogOut /> SAIR
        </button>
      </nav>

      <div className="v-planos-content">
        <div className="v-planos-header reveal-bottom">
          <h1 className="v-planos-title">Escolha o seu nível de <span>Excelência</span></h1>
          <p className="v-planos-subtitle">
            Sua clínica <strong>{usuario?.clinica?.nome || 'Veterinária'}</strong> atingiu o limite do período de testes. 
            Assine agora para continuar transformando a saúde animal com a melhor tecnologia do mercado.
          </p>
        </div>

        <div className="v-planos-grid" style={{ 
            transform: `perspective(1000px) rotateY(${mousePos.x * 0.1}deg) rotateX(${-mousePos.y * 0.1}deg)` 
        }}>
          
          {/* Card Básico */}
          <div className="v-plano-card v-glass-panel reveal-left">
            <div className="v-plano-icon-wrapper"><FiZap /></div>
            <h2>Essencial</h2>
            <p className="v-plano-desc">O fundamental para manter sua clínica operando com eficiência.</p>
            <div className="v-plano-price">
              R$ 99<span>/mês</span>
            </div>
            
            <ul className="v-plano-features">
              <li><FiCheck className="v-check-icon" /> Até 500 atendimentos/mês</li>
              <li><FiCheck className="v-check-icon" /> Cadastro ilimitado de pets</li>
              <li><FiCheck className="v-check-icon" /> Prontuário e Histórico</li>
              <li className="v-feature-disabled"><FiCheck className="v-check-icon" /> Controle de Estoque Completo</li>
              <li className="v-feature-disabled"><FiCheck className="v-check-icon" /> DRE Financeiro e Relatórios</li>
            </ul>

            <button 
              className="v-btn-plano-secondary"
              onClick={() => handleAssinar('pro')}
              disabled={loading}
            >
              {loading ? 'Processando...' : 'Assinar Essencial'}
            </button>
          </div>

          {/* Card Premium */}
          <div className="v-plano-card v-plano-premium v-glass-panel reveal-right">
            <div className="v-premium-badge">RECOMENDADO</div>
            <div className="v-premium-glow"></div>
            
            <div className="v-plano-icon-wrapper v-premium-icon"><FiStar /></div>
            <h2>Premium Elite</h2>
            <p className="v-plano-desc">Gestão completa e inteligência de dados para clínicas de alta performance.</p>
            <div className="v-plano-price v-price-premium">
              R$ 149<span>/mês</span>
            </div>
            
            <ul className="v-plano-features">
              <li><FiCheck className="v-check-icon v-premium-check" /> Atendimentos <strong>Ilimitados</strong></li>
              <li><FiCheck className="v-check-icon v-premium-check" /> Controle de Estoque Completo</li>
              <li><FiCheck className="v-check-icon v-premium-check" /> DRE Financeiro e Relatórios VIP</li>
              <li><FiCheck className="v-check-icon v-premium-check" /> Agendamento e Notificações (Em breve)</li>
              <li><FiCheck className="v-check-icon v-premium-check" /> Suporte Prioritário (WhatsApp)</li>
            </ul>

            <button 
              className="v-btn-plano-primary-3d"
              onClick={() => handleAssinar('premium')}
              disabled={loading}
            >
              {loading ? 'Processando...' : 'Desbloquear Premium'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Planos;
