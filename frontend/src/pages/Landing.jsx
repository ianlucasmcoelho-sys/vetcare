import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FiArrowRight, FiZap, FiClock, 
  FiTrendingUp, FiHome, FiClipboard, FiPackage, 
  FiDollarSign, FiSearch, FiLayers, FiShield,
  FiCheck, FiStar, FiHeart, FiActivity,
  FiUsers, FiCalendar, FiPieChart,
  FiChevronDown, FiChevronUp, FiX, FiHelpCircle, FiPhone, FiCheckCircle,
  FiSun, FiMoon
} from "react-icons/fi";
import { MdOutlinePets, MdOutlineMedicalServices } from "react-icons/md";
import { FaWhatsapp } from "react-icons/fa";
import "./Landing.css";
import "./StarsBackground.css";

// Fake dashboard data for the hero mockup
const mockAppointments = [
  { pet: "Thor", tutor: "Carlos M.", hora: "09:00", tipo: "Consulta", status: "confirmado" },
  { pet: "Luna", tutor: "Ana P.", hora: "10:30", tipo: "Vacinação", status: "confirmado" },
  { pet: "Bob", tutor: "Pedro R.", hora: "11:00", tipo: "Retorno", status: "pendente" },
  { pet: "Mel", tutor: "Sofia A.", hora: "14:00", tipo: "Retorno", status: "confirmado" },
];

const testimonials = [
  {
    nome: "Dra. Juliana Mendes",
    crmv: "CRMV-SP 34.891",
    clinica: "Clínica Pet Saúde (São Paulo - SP)",
    texto: "A emissão de receitas inteligentes e o histórico clínico digital poupam quase 2 horas do meu dia. A interface moderna é um diferencial que até os tutores reparam.",
    foto: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=150&q=80"
  },
  {
    nome: "Dr. Lucas Tavares",
    crmv: "CRMV-PR 18.240",
    clinica: "Hospital VetLife (Curitiba - PR)",
    texto: "A gestão de internações e o controle de insumos acabaram com as perdas por validade. O sistema é muito estável e rápido tanto no notebook quanto no celular.",
    foto: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=150&q=80"
  },
  {
    nome: "Renata Vasconcelos",
    crmv: "Gestora Comercial",
    clinica: "Bicho Chic Pet & Estética (Belo Horizonte - MG)",
    texto: "A gestão de pacientes, agenda e prontuário digital deixou nossa rotina muito mais organizada.",
    foto: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80"
  }
];

const faqs = [
  {
    pergunta: "Preciso instalar algum aplicativo ou programa no meu computador?",
    resposta: "Não! O VetCare funciona 100% em nuvem. Você pode acessar de qualquer computador, notebook, tablet ou celular pelo navegador web, sem necessidade de servidores locais ou instalações complexas."
  },
  {
    pergunta: "O que está incluído no plano gratuito?",
    resposta: "O Free oferece 7 dias de acesso gratuito, sem cartão, com agenda, cadastro de tutores e pets, dashboard e prontuário clínico. Depois do período, assine o VetCare Completo por R$ 97/mês para continuar usando o sistema."
  },
  {
    pergunta: "O que recebo ao assinar o plano completo?",
    resposta: "Por R$ 97 por mês, você libera os módulos avançados de estoque, internação, exames, financeiro, relatórios, CRM e comissões."
  },
  {
    pergunta: "Como faço para cancelar a assinatura?",
    resposta: "A assinatura é mensal e não tem fidelidade. Para cancelar as próximas cobranças, solicite o cancelamento ao atendimento antes do próximo vencimento."
  },
  {
    pergunta: "Os dados dos meus pacientes e da clínica estão seguros?",
    resposta: "Sim, utilizamos criptografia de ponta a ponta, isolamento estrito de dados por clínica e rotinas automáticas de backup diário, mantendo conformidade total com a LGPD e sigilo profissional veterinário."
  },
  {
    pergunta: "Vocês oferecem suporte caso eu tenha dúvidas?",
    resposta: "Com certeza! Oferecemos atendimento humanizado via WhatsApp e e-mail para ajudar você na configuração inicial, dúvidas de uso e suporte contínuo."
  }
];

export default function Landing() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [openFaq, setOpenFaq] = useState(0);
  const [activeModal, setActiveModal] = useState(null);
  const sceneRef = useRef(null);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("vetcare_theme") || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("vetcare_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  };

  const handleOpenWhatsApp = () => {
    const mensagem = encodeURIComponent("Olá! Gostaria de tirar dúvidas sobre o sistema VetCare.");
    window.open(`https://wa.me/5511999999999?text=${mensagem}`, "_blank");
  };

  useEffect(() => {
    let rAF = null;
    const handleMouseMove = (e) => {
      if (rAF) return;
      rAF = requestAnimationFrame(() => {
        if (sceneRef.current) {
          const x = (e.clientX / window.innerWidth - 0.5) * 20;
          const y = (e.clientY / window.innerHeight - 0.5) * 20;
          sceneRef.current.style.transform = `perspective(1200px) rotateY(${x * 0.4}deg) rotateX(${-y * 0.4}deg)`;
        }
        rAF = null;
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('v-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.v-reveal').forEach(el => {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('v-immediate');
      else observer.observe(el);
    });

    // Auto-rotate tabs in mockup
    const interval = setInterval(() => {
      setActiveTab(prev => (prev + 1) % 3);
    }, 2500);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (rAF) cancelAnimationFrame(rAF);
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="v-landing-page">
      {/* Interactive Background */}
      <div className="v-ambient-space">
        <div className="v-stars-container">
          <div id="stars" />
          <div id="stars2" />
          <div id="stars3" />
        </div>
        <div className="v-orb v-orb-1"></div>
        <div className="v-orb v-orb-2"></div>
        <div className="v-orb v-orb-3"></div>
      </div>

      {/* NAVBAR */}
      <nav className="v-top-nav v-glass">
        <div className="v-brand">
          <div className="v-logo-3d-wrap">
            <img src="/logo.png" alt="Vet Care Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <span className="v-logo-text">Vet Care</span>
        </div>
        <div className="v-nav-links">
          <a href="#funcionalidades">Funcionalidades</a>
          <a href="#depoimentos">Depoimentos</a>
          <a href="#planos" className="v-nav-link-highlight">Planos</a>
          <a href="#faq">Dúvidas</a>
        </div>
        <div className="v-nav-cta">
          <button 
            className="v-theme-toggle-pill" 
            onClick={toggleTheme} 
            title={theme === "dark" ? "Alternar para Modo Claro" : "Alternar para Modo Cosmos Escuro"}
            aria-label="Alternar tema"
          >
            {theme === "dark" ? <FiSun size={17} /> : <FiMoon size={17} />}
          </button>
          <button className="v-btn-login" onClick={() => navigate("/login")}>Entrar</button>
          <button className="v-btn-signup-3d" onClick={() => navigate("/cadastro")}>Começar Agora</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="v-hero-grid">
        <div className="v-hero-info">
          <div className="v-hero-tag">
            <FiZap /> <span>Padrão Ouro em Gestão Veterinária</span>
          </div>
          <h1 className="v-hero-main-title">
            Sua clínica em <br/>
            <span className="v-gradient-text-3d">alta performance.</span>
          </h1>
          <p className="v-hero-lead">
            O ecossistema Vet Care integra prontuário digital inteligente, 
            agenda domiciliar e controle financeiro em uma interface fluida e moderna.
          </p>
          <div className="v-hero-btns">
            <button className="v-btn-primary-3d" onClick={() => navigate("/cadastro")}>
              Criar minha Clínica <FiArrowRight />
            </button>
            <div className="v-trust-row">
              <div className="v-trust-badges">
                <div className="v-trust-badge" title="Segurança Avançada"><FiShield size={15} /><span>Seguro</span></div>
                <div className="v-trust-badge" title="Alta Velocidade"><FiZap size={15} /><span>Rápido</span></div>
                <div className="v-trust-badge" title="Disponível 24/7"><FiActivity size={15} /><span>24/7</span></div>
              </div>
              <span className="v-trust-text">Tecnologia em nuvem <strong>sem interrupções.</strong></span>
            </div>
          </div>
        </div>

        {/* HERO VISUAL — Rich Dashboard Mockup */}
        <div className="v-hero-visual-3d">
          <div className="v-scene-3d" ref={sceneRef}>
            {/* Main App Window */}
            <div className="v-app-mockup v-glass-heavy">
              {/* Window Chrome */}
              <div className="v-mockup-chrome">
                <div className="v-chrome-dots">
                  <span className="v-dot v-dot-red"></span>
                  <span className="v-dot v-dot-yellow"></span>
                  <span className="v-dot v-dot-green"></span>
                </div>
                <div className="v-chrome-tabs">
                  {["Agenda", "Prontuário", "Financeiro"].map((tab, i) => (
                    <button key={tab} className={`v-chrome-tab ${activeTab === i ? 'v-tab-active' : ''}`}
                      onClick={() => setActiveTab(i)}>{tab}</button>
                  ))}
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="v-mockup-body">
                {/* Stats Row */}
                <div className="v-mockup-stats">
                  <div className="v-stat-mini">
                    <div className="v-stat-mini-icon" style={{ background: 'rgba(20, 184, 166, 0.12)', color: '#14b8a6' }}><FiUsers size={14}/></div>
                    <div><strong>248</strong><small>Tutores</small></div>
                  </div>
                  <div className="v-stat-mini">
                    <div className="v-stat-mini-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}><MdOutlinePets size={14}/></div>
                    <div><strong>391</strong><small>Pacientes</small></div>
                  </div>
                  <div className="v-stat-mini">
                    <div className="v-stat-mini-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}><FiTrendingUp size={14}/></div>
                    <div><strong>R$15.4k</strong><small>Mês</small></div>
                  </div>
                  <div className="v-stat-mini">
                    <div className="v-stat-mini-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}><FiCalendar size={14}/></div>
                    <div><strong>12</strong><small>Hoje</small></div>
                  </div>
                </div>

                {/* Appointments List */}
                <div className="v-mockup-section-label">Agenda de Hoje</div>
                <div className="v-mockup-list">
                  {mockAppointments.map((ap, i) => (
                    <div key={i} className="v-mockup-row">
                      <div className="v-mockup-avatar"><MdOutlinePets size={12}/></div>
                      <div className="v-mockup-row-info">
                        <strong>{ap.pet}</strong>
                        <small>{ap.tutor} • {ap.tipo}</small>
                      </div>
                      <div className="v-mockup-row-time">{ap.hora}</div>
                      <div className={`v-mockup-badge ${ap.status === 'confirmado' ? 'v-badge-ok' : 'v-badge-pending'}`}>
                        {ap.status}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mini Chart Bar */}
                <div className="v-mockup-section-label" style={{ marginTop: '0.75rem' }}>Faturamento Semanal</div>
                <div className="v-mini-chart">
                  {[45, 70, 55, 90, 65, 80, 72].map((h, i) => (
                    <div key={i} className="v-mini-bar-wrap">
                      <div className="v-mini-bar" style={{ height: `${h}%` }}></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating Data Layers */}
            <div className="v-layer v-l-finance">
               <FiTrendingUp className="v-icon-green" />
               <div>
                  <strong>+18% MoM</strong>
                  <small>Crescimento da Receita</small>
               </div>
            </div>

            <div className="v-layer v-l-agenda">
               <FiHome className="v-icon-teal" />
               <div>
                  <strong>Agenda Domiciliar</strong>
                  <small>3 visitas para hoje</small>
               </div>
            </div>

            <div className="v-layer v-l-records">
               <MdOutlineMedicalServices className="v-icon-blue" />
               <div>
                  <strong>Prontuário Digital</strong>
                  <small>Atualizado em tempo real</small>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS SECTION — substituiu "feito com amor" genérico */}
      <section className="v-stats-section v-reveal">
        <div className="v-stats-inner">
          <div className="v-stats-header">
            <div className="v-section-label">IMPACTO REAL</div>
            <h2 className="v-stats-title">Feito com amor, para quem cuida com amor.</h2>
            <p>Entendemos que seu foco deve ser totalmente nos animais. Nós cuidamos do resto.</p>
          </div>
          <div className="v-stats-grid">
            <div className="v-stat-card v-reveal">
              <div className="v-stat-icon"><FiUsers /></div>
              <div className="v-stat-number">2.400<span>+</span></div>
              <div className="v-stat-label">Atendimentos Registrados</div>
            </div>
            <div className="v-stat-card v-reveal">
              <div className="v-stat-icon"><FiActivity /></div>
              <div className="v-stat-number">99.9<span>%</span></div>
              <div className="v-stat-label">Uptime do Sistema</div>
            </div>
            <div className="v-stat-card v-reveal">
              <div className="v-stat-icon"><FiClock /></div>
              <div className="v-stat-number">4h<span>/dia</span></div>
              <div className="v-stat-label">Economizadas por Clínica</div>
            </div>
            <div className="v-stat-card v-reveal">
              <div className="v-stat-icon"><FiShield /></div>
              <div className="v-stat-number">100<span>%</span></div>
              <div className="v-stat-label">Dados Protegidos e Seguros</div>
            </div>
          </div>
          <button className="v-btn-secondary" onClick={() => navigate("/cadastro")}>
            Transformar minha rotina <FiArrowRight />
          </button>
        </div>
      </section>

      {/* FEATURES SECTION */}
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

      {/* INTERFACE SECTION */}
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
                 loading="lazy"
                 decoding="async"
                 style={{ width: '100%', height: '100%', objectFit: 'cover' }}
               />
             </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS / PROVA SOCIAL */}
      <section className="v-testimonials-section v-reveal" id="depoimentos">
        <div className="v-section-header">
          <div className="v-section-label">PROVA SOCIAL</div>
          <h2 className="v-section-title">
            Aprovado por quem <span className="v-gradient-text-3d">cuida de vidas</span>
          </h2>
          <p className="v-section-subtitle">
            Veja o que médicos veterinários e gestores de clínicas dizem sobre a experiência Vet Care.
          </p>
        </div>

        <div className="v-testimonials-grid">
          {testimonials.map((item, idx) => (
            <div key={idx} className="v-testimonial-card v-glass-panel">
              <div className="v-testimonial-stars">
                {[...Array(5)].map((_, i) => (
                  <FiStar key={i} className="v-star-icon" />
                ))}
              </div>
              <p className="v-testimonial-quote">"{item.texto}"</p>
              <div className="v-testimonial-author">
                <img 
                  src={item.foto} 
                  alt={item.nome} 
                  className="v-testimonial-avatar"
                  loading="lazy"
                />
                <div className="v-testimonial-info">
                  <strong>{item.nome}</strong>
                  <span>{item.crmv}</span>
                  <small>{item.clinica}</small>
                </div>
              </div>
            </div>
          ))}
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

        <div className="v-planos-grid">
          {/* Card Gratuito */}
          <div className="v-plano-card v-glass-panel">
            <div className="v-plano-icon-wrapper"><FiHeart /></div>
            <h2>Gratuito</h2>
            <p className="v-plano-desc">Experimente os recursos essenciais por 7 dias, sem informar cartão.</p>
            <div className="v-plano-price-wrap">
              <div className="v-plano-price">Grátis<span> por 7 dias</span></div>
              <div className="v-plano-price-line"></div>
            </div>
            <ul className="v-plano-features">
              <li><FiCheck className="v-check-icon" /> Dashboard e agenda</li>
              <li><FiCheck className="v-check-icon" /> Cadastro de tutores e pacientes</li>
              <li><FiCheck className="v-check-icon" /> Prontuário e histórico clínico</li>
              <li><FiCheck className="v-check-icon" /> Sem cartão durante o período de teste</li>
            </ul>
            <button className="v-btn-plano-secondary" onClick={() => navigate("/cadastro?plano=free")}>
              Começar Grátis
            </button>
          </div>

          {/* Plano pago único */}
          <div className="v-plano-card v-plano-premium v-glass-panel">
            <div className="v-premium-badge">TODOS OS RECURSOS</div>
            <div className="v-premium-glow"></div>
            <div className="v-plano-icon-wrapper v-premium-icon"><FiStar /></div>
            <h2>VetCare Completo</h2>
            <p className="v-plano-desc">Todos os módulos de gestão para clínicas veterinárias e pet shops, em uma assinatura simples.</p>
            <div className="v-plano-price-wrap">
              <div className="v-plano-price">R$ 97<span>/mês</span></div>
              <div className="v-plano-price-line v-price-line-premium"></div>
            </div>
            <ul className="v-plano-features">
              <li><FiCheck className="v-check-icon" /> Tudo do plano Free</li>
              <li><FiCheck className="v-check-icon" /> Estoque, internação e exames</li>
              <li><FiCheck className="v-check-icon" /> Financeiro, relatórios e comissões</li>
              <li><FiCheck className="v-check-icon" /> CRM e acompanhamento de pacientes</li>
              <li><FiCheck className="v-check-icon" /> Cobrança mensal sem fidelidade</li>
            </ul>
            <button className="v-btn-plano-primary-3d" onClick={() => navigate("/cadastro?plano=complete")}>
              Assinar por R$ 97/mês
            </button>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="v-faq-section v-reveal" id="faq">
        <div className="v-section-header">
          <div className="v-section-label">TIRA-DÚVIDAS</div>
          <h2 className="v-section-title">
            Perguntas <span className="v-gradient-text-3d">Frequentes</span>
          </h2>
          <p className="v-section-subtitle">
            Tudo o que você precisa saber para começar com total tranquilidade.
          </p>
        </div>

        <div className="v-faq-list">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div 
                key={index} 
                className={`v-faq-item v-glass-panel ${isOpen ? "v-faq-open" : ""}`}
                onClick={() => setOpenFaq(isOpen ? null : index)}
              >
                <div className="v-faq-question">
                  <span className="v-faq-q-text">{faq.pergunta}</span>
                  <div className="v-faq-icon-wrap">
                    {isOpen ? <FiChevronUp /> : <FiChevronDown />}
                  </div>
                </div>
                {isOpen && (
                  <div className="v-faq-answer">
                    <p>{faq.resposta}</p>
                  </div>
                )}
              </div>
            );
          })}
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
            <button type="button" className="v-footer-link-btn" onClick={() => setActiveModal('privacidade')}>Privacidade</button>
            <button type="button" className="v-footer-link-btn" onClick={() => setActiveModal('termos')}>Termos</button>
            <button type="button" className="v-footer-link-btn" onClick={() => setActiveModal('contato')}>Contato</button>
          </div>
        </div>
        <div className="v-footer-bottom">
          &copy; {new Date().getFullYear()} Vet Care Sistemas - Tecnologia de Elite para Medicina Veterinária.
        </div>
      </footer>

      {/* Floating WhatsApp CTA */}
      <button 
        type="button" 
        className="v-whatsapp-float" 
        onClick={handleOpenWhatsApp} 
        aria-label="Falar conosco no WhatsApp"
        title="Falar no WhatsApp"
      >
        <FaWhatsapp className="v-whatsapp-icon" />
        <span className="v-whatsapp-tooltip">Dúvidas? Fale com a gente!</span>
      </button>

      {/* Legal & Contact Modals */}
      {activeModal && (
        <div className="v-legal-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="v-legal-modal-box v-glass-heavy" onClick={(e) => e.stopPropagation()}>
            <div className="v-legal-modal-header">
              <h3>
                {activeModal === 'privacidade' && "Política de Privacidade"}
                {activeModal === 'termos' && "Termos de Uso do Vet Care"}
                {activeModal === 'contato' && "Contato & Suporte Especializado"}
              </h3>
              <button 
                type="button" 
                className="v-modal-close-btn" 
                onClick={() => setActiveModal(null)}
                aria-label="Fechar"
              >
                <FiX />
              </button>
            </div>
            <div className="v-legal-modal-body">
              {activeModal === 'privacidade' && (
                <>
                  <p><strong>1. Coleta e Finalidade dos Dados:</strong> O Vet Care coleta apenas as informações estritamente necessárias para a operação da clínica, prontuário médico-veterinário dos pacientes e faturamento.</p>
                  <p><strong>2. Proteção e Sigilo:</strong> Os dados armazenados são isolados por clínica (arquitetura multi-tenant) e protegidos. Suas informações e as de seus clientes nunca serão comercializadas com terceiros.</p>
                  <p><strong>3. Conformidade com a LGPD:</strong> Você tem o direito de solicitar a exportação ou exclusão definitiva das suas bases de dados a qualquer momento através do nosso canal de suporte.</p>
                </>
              )}
              {activeModal === 'termos' && (
                <>
                  <p><strong>1. Licença de Uso:</strong> O Vet Care é uma plataforma SaaS (Software como Serviço) disponibilizada mediante assinatura mensal ou teste gratuito autorizado.</p>
                  <p><strong>2. Responsabilidade Médica:</strong> O sistema fornece ferramentas de prontuário, prescrições e controle clínico, mas a responsabilidade técnica e diagnóstica sobre qualquer conduta médica veterinária permanece integralmente com o médico veterinário registrado no CRMV.</p>
                    <p><strong>3. Cancelamento:</strong> Não exigimos contrato de fidelidade. Para interromper as próximas cobranças, solicite o cancelamento ao atendimento antes do próximo vencimento.</p>
                </>
              )}
              {activeModal === 'contato' && (
                <div className="v-modal-contact-content">
                  <p>Nosso time de atendimento está pronto para atender sua clínica:</p>
                  <div className="v-contact-badge-list">
                    <div className="v-contact-badge" onClick={handleOpenWhatsApp} style={{ cursor: 'pointer' }}>
                      <FaWhatsapp style={{ color: '#22c55e', fontSize: '1.4rem' }} />
                      <div>
                        <strong>WhatsApp Comercial & Suporte</strong>
                        <span>(11) 99999-9999 • Atendimento Rápido</span>
                      </div>
                    </div>
                    <div className="v-contact-badge">
                      <FiHelpCircle style={{ color: '#3b82f6', fontSize: '1.4rem' }} />
                      <div>
                        <strong>E-mail de Suporte</strong>
                        <span>suporte@vetcare.com.br</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="v-legal-modal-footer">
              <button type="button" className="v-btn-modal-close" onClick={() => setActiveModal(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
