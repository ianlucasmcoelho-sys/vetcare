import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FiArrowRight, FiZap, FiLayout, FiClock, 
  FiTrendingUp, FiHome, FiClipboard, FiPackage, 
  FiDollarSign, FiSearch, FiLayers, FiShield,
  FiCheck, FiStar, FiMoon, FiHeart
} from "react-icons/fi";
import { MdOutlinePets, MdOutlineMedicalServices } from "react-icons/md";
import "./Landing.css";

export default function Landing() {
  const navigate = useNavigate();
  const [mousePos, setMouseX] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 20;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    setMouseX({ x, y });
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('v-visible');
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.v-reveal').forEach(el => observer.observe(el));
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="v-landing-page">
      {/* Interactive 3D Background */}
      <div className="v-ambient-space">
        <div className="v-orb v-orb-1" style={{ transform: `translate(${mousePos.x * 2}px, ${mousePos.y * 2}px)` }}></div>
        <div className="v-orb v-orb-2" style={{ transform: `translate(${-mousePos.x * 3}px, ${-mousePos.y * 3}px)` }}></div>
      </div>

      {/* NAVBAR with real logo */}
      <nav className="v-top-nav v-glass">
        <div className="v-brand" style={{ gap: '10px' }}>
          <div className="v-logo-3d-wrap" style={{ width: '40px', height: '40px', background: 'transparent', border: 'none', boxShadow: 'none' }}>
            <img src="/logo.png" alt="Vet Care Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <span className="v-logo-text">Vet Care</span>
        </div>
        <div className="v-nav-links" style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <a href="#funcionalidades" style={{ textDecoration: 'none', color: 'var(--text-main)', fontWeight: 600 }}>Funcionalidades</a>
          <a href="#design" style={{ textDecoration: 'none', color: 'var(--text-main)', fontWeight: 600 }}>Design</a>
          <a href="#planos" style={{ textDecoration: 'none', color: 'var(--primary)', fontWeight: 800 }}>Planos e Preços</a>
        </div>
        <div className="v-nav-cta">
          <button className="v-btn-login" onClick={() => navigate("/login")}>Entrar</button>
          <button className="v-btn-signup-3d" onClick={() => navigate("/cadastro")}>Começar Agora</button>
        </div>
      </nav>

      {/* HERO with real dashboard screenshot */}
      <section className="v-hero-grid">
        <div className="v-hero-info v-reveal">
          <div className="v-hero-tag">
            <FiZap /> <span>Padrão Ouro em Gestão Veterinária</span>
          </div>
          <h1 className="v-hero-main-title">
            Sua clínica em <br/>
            <span className="v-gradient-text-3d">alta performance.</span>
          </h1>
          <p className="v-hero-lead">
            O ecossistema Vet Care integra prontuário digital inteligente, 
            agenda domiciliar e controle financeiro em uma interface 3D fluida.
          </p>
          <div className="v-hero-btns">
            <button className="v-btn-primary-3d" onClick={() => navigate("/cadastro")}>
              Criar minha Clínica <FiArrowRight />
            </button>
            <div className="v-user-badges">
              <div className="v-avatars" style={{ gap: '10px', display: 'flex', alignItems: 'center', background: 'transparent' }}>
                 <div style={{ background: 'rgba(20, 184, 166, 0.15)', padding: '8px', borderRadius: '50%', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Segurança Avançada"><FiShield size={18} /></div>
                 <div style={{ background: 'rgba(20, 184, 166, 0.15)', padding: '8px', borderRadius: '50%', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Alta Velocidade"><FiZap size={18} /></div>
                 <div style={{ background: 'rgba(20, 184, 166, 0.15)', padding: '8px', borderRadius: '50%', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Disponível 24/7"><FiCheck size={18} /></div>
              </div>
              <span style={{ marginLeft: '12px' }}>Tecnologia em nuvem <strong>segura e ultrarápida</strong>.</span>
            </div>
          </div>
        </div>

        <div className="v-hero-visual-3d">
          <div className="v-scene-3d" style={{ 
            transform: `perspective(1200px) rotateY(${mousePos.x * 0.5}deg) rotateX(${-mousePos.y * 0.5}deg)` 
          }}>
            <div className="v-app-mockup v-glass-heavy" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%)',
              padding: '2rem'
            }}>
              <img 
                src="/logo.png" 
                alt="Vet Care Logo" 
                style={{ 
                  width: '70%', 
                  maxWidth: '280px',
                  height: 'auto', 
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 20px 40px rgba(20, 184, 166, 0.2))'
                }} 
              />
            </div>

            {/* Realistic System Data Floating Layers */}
            <div className="v-layer v-l-finance" style={{ transform: `translateZ(100px) translate(${mousePos.x * 1.2}px, ${mousePos.y * 1.2}px)` }}>
               <FiTrendingUp className="v-icon-green" />
               <div>
                  <strong>R$ 15.420,00</strong>
                  <small>Faturamento do Mês</small>
               </div>
            </div>

            <div className="v-layer v-l-agenda" style={{ transform: `translateZ(150px) translate(${-mousePos.x * 1.5}px, ${-mousePos.y * 1.5}px)` }}>
               <FiHome className="v-icon-teal" />
               <div>
                  <strong>Agenda Domiciliar</strong>
                  <small>3 visitas para hoje</small>
               </div>
            </div>

            <div className="v-layer v-l-records" style={{ transform: `translateZ(60px) translate(${mousePos.x * 0.8}px, ${-mousePos.y * 0.8}px)` }}>
               <MdOutlineMedicalServices className="v-icon-blue" />
               <div>
                  <strong>Prontuários</strong>
                  <small>Organizado por paciente</small>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEITO COM AMOR SECTION */}
      <section className="v-puppy-section v-reveal">
         <div className="v-puppy-container">
            <div className="v-puppy-content">
               <h2>Feito com amor, para quem cuida com amor.</h2>
               <p>
                 Entendemos que o seu foco deve ser totalmente voltado ao bem-estar dos animais. 
                 Nós cuidamos de todo o trabalho burocrático e repetitivo da sua clínica.
               </p>
               <button className="v-btn-secondary" onClick={() => navigate("/cadastro")}>
                 Transformar minha rotina
               </button>
            </div>
            <div className="v-puppy-image-wrapper" style={{ 
                transform: `translateY(${mousePos.y * 1.5}px)`, 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                height: '100%'
              }}>
               <div 
                  style={{
                    width: '300px',
                    height: '300px',
                    backgroundImage: 'url(/logo.png)',
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    borderRadius: '50%',
                    boxShadow: '0 20px 40px rgba(20, 184, 166, 0.15)',
                    border: '8px solid rgba(255, 255, 255, 0.5)',
                    backgroundColor: '#f0fdfa'
                  }}
                  title="Vet Care"
               />
            </div>
         </div>
      </section>

      {/* SYSTEM INFRASTRUCTURE SECTION */}
      <section className="v-infra-section" id="funcionalidades">
        <div className="v-section-label v-reveal">INFRAESTRUTURA DO SISTEMA</div>
        <h2 className="v-section-title v-reveal">O que o Vet Care oferece:</h2>
        
        <div className="v-features-3d-grid">
          <div className="v-card-3d v-reveal">
            <div className="v-card-3d-inner">
               <div className="v-card-3d-icon"><FiHome /></div>
               <h3>Agenda Inteligente</h3>
               <p>Controle todos os seus atendimentos e compromissos do dia em uma interface visual e rápida.</p>
               <div className="v-card-3d-tag">AGENDAMENTO</div>
            </div>
          </div>

          <div className="v-card-3d v-reveal">
            <div className="v-card-3d-inner">
               <div className="v-card-3d-icon"><MdOutlineMedicalServices /></div>
               <h3>Prontuário 2.0</h3>
               <p>Histórico clínico completo agrupado por paciente. Anamneses, vacinas e tratamentos em um só lugar.</p>
               <div className="v-card-3d-tag">PRONTUÁRIO</div>
            </div>
          </div>

          <div className="v-card-3d v-reveal">
            <div className="v-card-3d-inner">
               <div className="v-card-3d-icon"><FiDollarSign /></div>
               <h3>Tabela Inteligente</h3>
               <p>Catálogo dinâmico com mais de 160 itens e serviços para faturamentos rápidos e precisos.</p>
               <div className="v-card-3d-tag">FINANCEIRO</div>
            </div>
          </div>

          <div className="v-card-3d v-reveal">
            <div className="v-card-3d-inner">
               <div className="v-card-3d-icon"><FiPackage /></div>
               <h3>Estoque Crítico</h3>
               <p>Gestão automatizada de insumos com avisos de validade e alertas de reposição necessária.</p>
               <div className="v-card-3d-tag">LOGÍSTICA</div>
            </div>
          </div>
        </div>
      </section>

      {/* PREMIUM INTERFACE DEMO */}
      <section className="v-interface-section v-reveal" id="design">
        <div className="v-interface-box v-glass-heavy">
          <div className="v-interface-text">
            <h2>Design focado em performance.</h2>
            <p>
              Interface otimizada para o fluxo de trabalho veterinário. 
              Menos cliques, mais saúde para seus pacientes.
            </p>
            <div className="v-interface-features">
              <span><FiLayers /> Modo Escuro Nativo</span>
              <span><FiShield /> Dados 100% Protegidos</span>
              <span><FiZap /> Carregamento em 0.2s</span>
            </div>
          </div>
          <div className="v-interface-visual">
             <div className="v-dark-ui-preview">
               <img 
                 src="/assets/Dashboard.jpg" 
                 alt="Interface do Vet Care" 
                 style={{ width: '100%', height: '100%', objectFit: 'cover' }}
               />
             </div>
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section className="v-pricing-section v-reveal" id="planos">
        <div className="v-pricing-header">
          <div className="v-section-label">PLANOS</div>
          <h2 className="v-section-title" style={{ marginBottom: '1rem' }}>
            Escolha o seu nível de <span className="v-gradient-text-3d">Excelência</span>
          </h2>
          <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Comece gratuitamente e escale conforme sua clínica cresce. Sem surpresas, sem taxa de adesão.
          </p>
        </div>

        <div className="v-planos-grid v-planos-grid-3">
          {/* Card Gratuito / Trial */}
          <div className="v-plano-card v-glass-panel">
            <div className="v-plano-icon-wrapper"><FiHeart /></div>
            <h2>Gratuito</h2>
            <p className="v-plano-desc">Teste o sistema completo por 7 dias sem compromisso.</p>
            <div className="v-plano-price">
              R$ 0<span> /7 dias</span>
            </div>
            
            <ul className="v-plano-features">
              <li><FiCheck className="v-check-icon" /> Acesso completo por 7 dias</li>
              <li><FiCheck className="v-check-icon" /> Cadastro ilimitado de pets</li>
              <li><FiCheck className="v-check-icon" /> Prontuário e Histórico</li>
              <li className="v-feature-disabled"><FiCheck className="v-check-icon" /> Automações e CRM</li>
              <li className="v-feature-disabled"><FiCheck className="v-check-icon" /> DRE Financeiro</li>
            </ul>

            <button 
              className="v-btn-plano-secondary"
              onClick={() => navigate("/cadastro?plano=free")}
            >
              Começar Grátis
            </button>
          </div>

          {/* Card Vet Clínica */}
          <div className="v-plano-card v-glass-panel">
            <div className="v-plano-icon-wrapper"><FiZap /></div>
            <h2>Vet Clínica</h2>
            <p className="v-plano-desc">O fundamental para clínicas e consultórios operarem com excelência.</p>
            <div className="v-plano-price">
              R$ 119<span>/mês</span>
            </div>
            
            <ul className="v-plano-features">
              <li><FiCheck className="v-check-icon" /> Atendimentos Ilimitados</li>
              <li><FiCheck className="v-check-icon" /> Prontuário, Internação e Exames</li>
              <li><FiCheck className="v-check-icon" /> Controle de Estoque</li>
              <li className="v-feature-disabled"><FiCheck className="v-check-icon" /> Gestão de Comissões</li>
              <li className="v-feature-disabled"><FiCheck className="v-check-icon" /> Automações e Relatórios VIP</li>
            </ul>

            <button 
              className="v-btn-plano-secondary"
              onClick={() => navigate("/cadastro?plano=clinica")}
            >
              Assinar Vet Clínica
            </button>
          </div>

          {/* Card Vet Complete */}
          <div className="v-plano-card v-plano-premium v-glass-panel">
            <div className="v-premium-badge">RECOMENDADO PARA PETSHOPS</div>
            <div className="v-premium-glow"></div>
            
            <div className="v-plano-icon-wrapper v-premium-icon"><FiStar /></div>
            <h2>Vet Complete</h2>
            <p className="v-plano-desc">Gestão 360º para estabelecimentos mistos: Clínica + Loja + Banho & Tosa.</p>
            <div className="v-plano-price">
              R$ 189<span>/mês</span>
            </div>
            
            <ul className="v-plano-features">
              <li><FiCheck className="v-check-icon" /> Tudo do plano Clínica</li>
              <li><FiCheck className="v-check-icon" /> PDV e Comissões Inteligentes</li>
              <li><FiCheck className="v-check-icon" /> CRM e Retenção de Clientes</li>
              <li><FiCheck className="v-check-icon" /> Automações via WhatsApp</li>
              <li><FiCheck className="v-check-icon" /> Relatórios Avançados (DRE)</li>
            </ul>

            <button 
              className="v-btn-plano-primary-3d"
              onClick={() => navigate("/cadastro?plano=complete")}
            >
              Assinar Vet Complete
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="v-footer-3d">
        <div className="v-footer-content">
          <div className="v-footer-brand">
            <img src="/logo.png" alt="Vet Care" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
            <span>Vet Care</span>
          </div>
          <div className="v-footer-links">
            <a href="#">Privacidade</a>
            <a href="#">Termos</a>
            <a href="#">Contato</a>
          </div>
        </div>
        <div className="v-footer-bottom">
          &copy; 2026 Vet Care Sistemas - Tecnologia de Elite para Medicina Veterinária.
        </div>
      </footer>
    </div>
  );
}
