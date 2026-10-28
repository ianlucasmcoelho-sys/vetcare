import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowRight, FiZap, FiHome, FiClipboard, FiPackage, FiDollarSign,
  FiLayers, FiShield, FiCheck, FiStar, FiHeart, FiActivity, FiUsers,
  FiCalendar, FiPieChart, FiChevronDown, FiChevronUp, FiX,
  FiHelpCircle, FiSun, FiMoon, FiMail
} from "react-icons/fi";
import { MdOutlinePets, MdOutlineMedicalServices } from "react-icons/md";
import { TbPaw } from "react-icons/tb";
import "./Landing.css";
import "./StarsBackground.css";

// Product workflow: actual capabilities, without invented customer metrics.
const workflow = [
  { icon: FiUsers, title: 'Cadastre tutor e paciente', text: 'Registre o tutor e siga para o cadastro do animal, mantendo o vínculo entre eles.', tag: 'CADASTRO CONECTADO' },
  { icon: FiCalendar, title: 'Organize o atendimento', text: 'Consulte a agenda e use os atalhos do perfil do paciente para iniciar os próximos registros.', tag: 'ROTINA CLÍNICA' },
  { icon: FiClipboard, title: 'Continue o acompanhamento', text: 'Reúna consultas, vacinas, exames e retornos para consultar o histórico de cada paciente.', tag: 'HISTÓRICO DO PACIENTE' }
];

const faqs = [
  {
    pergunta: "Preciso instalar algum aplicativo ou programa no meu computador?",
    resposta: "O VetCare pode ser acessado pelo navegador no computador, notebook, tablet ou celular, sem instalar um programa para usar o sistema."
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
    resposta: "O acesso exige autenticação e os registros são associados à clínica. Sua equipe utiliza contas de acesso para trabalhar com os dados. Consulte nossa política de privacidade e fale com a equipe se precisar de informações sobre o tratamento dos dados."
  },
  {
    pergunta: "Vocês oferecem suporte caso eu tenha dúvidas?",
    resposta: "Com certeza! Você pode entrar em contato pelo e-mail equipevetcare@vetcaresistema.com para tirar dúvidas de uso e de configuração."
  }
];

export default function Landing() {
  const navigate = useNavigate();
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

  const handleOpenContact = () => {
    window.location.href = 'mailto:equipevetcare@vetcaresistema.com?subject=D%C3%BAvidas%20sobre%20o%20VetCare';
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

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (rAF) cancelAnimationFrame(rAF);
      observer.disconnect();
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
            <TbPaw aria-hidden="true" size={25} />
          </div>
          <span className="v-logo-text">VetCare</span>
        </div>
        <div className="v-nav-links">
          <a href="#funcionalidades">Funcionalidades</a>
          <a href="#rotina">Na prática</a>
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
            O ecossistema VetCare integra prontuário digital inteligente,
            agenda domiciliar e controle financeiro em uma interface fluida e moderna.
          </p>
          <div className="v-hero-btns">
            <button className="v-btn-primary-3d" onClick={() => navigate("/cadastro")}>
              Criar minha Clínica <FiArrowRight />
            </button>
            <div className="v-trust-row">
              <div className="v-trust-badges">
                <div className="v-trust-badge" title="Acesso com sua conta"><FiShield size={15} /><span>Sua conta</span></div>
                <div className="v-trust-badge" title="Módulos conectados"><FiZap size={15} /><span>Integrado</span></div>
                <div className="v-trust-badge" title="Acesso pelo navegador"><FiActivity size={15} /><span>Online</span></div>
              </div>
              <span className="v-trust-text">Acesse pelo navegador, <strong>sem instalar programas.</strong></span>
            </div>
          </div>
        </div>

        <div className="v-hero-visual-3d">
          <div className="v-scene-3d" ref={sceneRef}>
            <div className="v-product-overview">
              <div className="v-product-overview-header"><span><TbPaw />VetCare</span><small>ROTINA DA CLÍNICA</small></div>
              <h2>Cada etapa do cuidado,<br/><span>no mesmo lugar.</span></h2>
              <div className="v-product-resource-grid">
                {[{Icon:FiCalendar,title:'Agenda',description:'Horários e profissionais'},{Icon:MdOutlinePets,title:'Pacientes',description:'Cadastro e responsáveis'},{Icon:FiClipboard,title:'Prontuários',description:'Consultas e histórico'},{Icon:FiPackage,title:'Gestão',description:'Financeiro e estoque'}].map(({Icon,title,description})=><div key={title}><span><Icon aria-hidden="true"/></span><h3>{title}</h3><p>{description}</p></div>)}
              </div>
              <div className="v-product-overview-flow"><span>Tutor</span><FiArrowRight/><span>Paciente</span><FiArrowRight/><span>Atendimento</span></div>
              <p className="v-product-overview-note">Recursos para organizar o trabalho da sua equipe.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="v-stats-section v-reveal">
        <div className="v-stats-inner">
          <div className="v-stats-header"><div className="v-section-label">O QUE VOCÊ ENCONTRA</div><h2 className="v-stats-title">Ferramentas para a rotina veterinária.</h2><p>Conheça os recursos e avalie como eles se encaixam na sua clínica.</p></div>
          <div className="v-capability-grid">
            {[{Icon:FiCalendar,title:'Agenda da equipe',text:'Visualize dias, horários e compromissos.'},{Icon:MdOutlinePets,title:'Pacientes e tutores',text:'Mantenha os cadastros vinculados.'},{Icon:FiClipboard,title:'Histórico clínico',text:'Consulte os registros de cada paciente.'},{Icon:FiPieChart,title:'Gestão da clínica',text:'Acompanhe financeiro, estoque e relatórios.'}].map(({Icon,title,text})=><article key={title}><Icon aria-hidden="true"/><h3>{title}</h3><p>{text}</p></article>)}
          </div>
          <button className="v-btn-secondary" onClick={()=>navigate('/cadastro')}>Conhecer com o teste gratuito<FiArrowRight/></button>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="v-infra-section" id="funcionalidades">
        <div className="v-section-label v-reveal">INFRAESTRUTURA DO SISTEMA</div>
        <h2 className="v-section-title v-reveal">O que o VetCare oferece:</h2>

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
              <span><FiShield /> Acesso com sua conta</span>
              <span><FiZap /> Módulos conectados à rotina</span>
            </div>
          </div>
          <div className="v-interface-visual">
             <div className="v-dark-ui-preview">
               <img
                 src="/assets/dashboard-clinico-20261028.webp"
                 alt="Dashboard clínico atual do VetCare com indicadores de pacientes, consultas e equipe, usando dados fictícios"
                 width="1269"
                 height="717"
                 loading="lazy"
                 decoding="async"
               />
             </div>
             <p className="v-interface-caption">Captura ilustrativa do sistema com dados fictícios.</p>
          </div>
        </div>
      </section>

      <section className="v-workflow-section v-reveal" id="rotina">
        <div className="v-section-header"><div className="v-section-label">NA PRÁTICA</div><h2 className="v-section-title">Do primeiro cadastro ao <span className="v-gradient-text-3d">próximo atendimento.</span></h2><p className="v-section-subtitle">Um fluxo de trabalho que você pode conhecer durante o teste gratuito.</p></div>
        <div className="v-workflow-grid">{workflow.map(({icon:Icon,title,text,tag},index)=><article className="v-workflow-card" key={title}><div className="v-workflow-card-top"><span><Icon aria-hidden="true"/></span><small>ETAPA {index+1}</small></div><h3>{title}</h3><p>{text}</p><span className="v-workflow-card-tag">{tag}</span></article>)}</div>
        <div className="v-workflow-cta"><p>Veja o fluxo com os cadastros e a rotina da sua própria clínica.</p><button className="v-btn-secondary" onClick={()=>navigate('/cadastro')}>Experimentar por 7 dias<FiArrowRight/></button></div>
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
            <div className="v-premium-badge">GESTÃO CLÍNICA E ADMINISTRATIVA</div>
            <div className="v-premium-glow"></div>
            <div className="v-plano-icon-wrapper v-premium-icon"><FiStar /></div>
            <h2>VetCare Completo</h2>
            <p className="v-plano-desc">Recursos clínicos e administrativos em uma assinatura mensal. Notas fiscais estão em preparação.</p>
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
            <img src="/logo.png" alt="VetCare" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
            <span>VetCare</span>
          </div>
          <div className="v-footer-links">
            <button type="button" className="v-footer-link-btn" onClick={() => setActiveModal('privacidade')}>Privacidade</button>
            <button type="button" className="v-footer-link-btn" onClick={() => setActiveModal('termos')}>Termos</button>
            <button type="button" className="v-footer-link-btn" onClick={() => setActiveModal('contato')}>Contato</button>
          </div>
        </div>
        <div className="v-footer-bottom">
          &copy; {new Date().getFullYear()} VetCare Sistemas - Gestão para a rotina veterinária.
        </div>
      </footer>

      {/* Floating email contact */}
      <button
        type="button"
        className="v-whatsapp-float"
        onClick={handleOpenContact}
        aria-label="Entrar em contato por e-mail"
        title="Falar por e-mail"
      >
        <FiMail className="v-whatsapp-icon" />
        <span className="v-whatsapp-tooltip">Dúvidas? Fale com a gente!</span>
      </button>

      {/* Legal & Contact Modals */}
      {activeModal && (
        <div className="v-legal-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="v-legal-modal-box v-glass-heavy" onClick={(e) => e.stopPropagation()}>
            <div className="v-legal-modal-header">
              <h3>
                {activeModal === 'privacidade' && "Política de Privacidade"}
                {activeModal === 'termos' && "Termos de Uso do VetCare"}
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
                  <p><strong>1. Coleta e Finalidade dos Dados:</strong> O VetCare coleta apenas as informações estritamente necessárias para a operação da clínica, prontuário médico-veterinário dos pacientes e faturamento.</p>
                  <p><strong>2. Proteção e Sigilo:</strong> Os dados armazenados são isolados por clínica (arquitetura multi-tenant) e protegidos. Suas informações e as de seus clientes nunca serão comercializadas com terceiros.</p>
                  <p><strong>3. Conformidade com a LGPD:</strong> Você tem o direito de solicitar a exportação ou exclusão definitiva das suas bases de dados a qualquer momento através do nosso canal de suporte.</p>
                </>
              )}
              {activeModal === 'termos' && (
                <>
                  <p><strong>1. Licença de Uso:</strong> O VetCare é uma plataforma SaaS (Software como Serviço) disponibilizada mediante assinatura mensal ou teste gratuito autorizado.</p>
                  <p><strong>2. Responsabilidade Médica:</strong> O sistema fornece ferramentas de prontuário, prescrições e controle clínico, mas a responsabilidade técnica e diagnóstica sobre qualquer conduta médica veterinária permanece integralmente com o médico veterinário registrado no CRMV.</p>
                    <p><strong>3. Cancelamento:</strong> Não exigimos contrato de fidelidade. Para interromper as próximas cobranças, solicite o cancelamento ao atendimento antes do próximo vencimento.</p>
                </>
              )}
              {activeModal === 'contato' && (
                <div className="v-modal-contact-content">
                  <p>Nosso time de atendimento está pronto para atender sua clínica:</p>
                  <div className="v-contact-badge-list">
                    <div className="v-contact-badge">
                      <FiHelpCircle style={{ color: '#3b82f6', fontSize: '1.4rem' }} />
                      <div>
                        <strong>E-mail de Suporte</strong>
                        <span>equipevetcare@vetcaresistema.com</span>
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
