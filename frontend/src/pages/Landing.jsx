import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FiArrowRight, FiZap, FiLayout, FiClock, 
  FiTrendingUp, FiHome, FiClipboard, FiPackage, 
  FiDollarSign, FiSearch, FiLayers, FiShield
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

      <nav className="v-top-nav v-glass">
        <div className="v-brand">
          <div className="v-logo-3d-wrap">
            <MdOutlinePets size={28} />
          </div>
          <span className="v-logo-text">Vet Care</span>
        </div>
        <div className="v-nav-cta">
          <button className="v-btn-login" onClick={() => navigate("/login")}>Entrar</button>
          <button className="v-btn-signup-3d" onClick={() => navigate("/cadastro")}>Começar Agora</button>
        </div>
      </nav>

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
              <div className="v-avatars">
              
              </div>
              
            </div>
          </div>
        </div>

        <div className="v-hero-visual-3d">
          <div className="v-scene-3d" style={{ 
            transform: `perspective(1200px) rotateY(${mousePos.x * 0.5}deg) rotateX(${-mousePos.y * 0.5}deg)` 
          }}>
            <div className="v-app-mockup v-glass-heavy">
              <div className="v-mock-header">
                <div className="v-mock-dots"><span/><span/><span/></div>
                <div className="v-mock-search"><FiSearch size={12}/> Buscar animal ou tutor...</div>
              </div>
              <div className="v-mock-body">
                <div className="v-mock-sidebar"></div>
                <div className="v-mock-content">
                  <div className="v-mock-line h-20"></div>
                  <div className="v-mock-grid">
                    <div className="v-mock-card"></div>
                    <div className="v-mock-card"></div>
                  </div>
                </div>
              </div>
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
                  <small>Organizado por animal</small>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* SYSTEM INFRASTRUCTURE SECTION (REAL PAGES) */}
      <section className="v-infra-section">
        <div className="v-section-label v-reveal">INFRAESTRUTURA DO SISTEMA</div>
        <h2 className="v-section-title v-reveal">O que o Vet Care oferece:</h2>
        
        <div className="v-features-3d-grid">
          <div className="v-card-3d v-reveal">
            <div className="v-card-3d-inner">
               <div className="v-card-3d-icon"><FiHome /></div>
               <h3>Agenda Híbrida</h3>
               <p>Controle de consultas na clínica e visitas domiciliares com alertas de status em tempo real.</p>
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
      <section className="v-interface-section v-reveal">
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
             <div className="v-dark-ui-preview"></div>
          </div>
        </div>
      </section>

      <footer className="v-footer-3d">
        <div className="v-footer-content">
          <div className="v-footer-brand">
            <MdOutlinePets size={28} color="var(--primary)" />
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
