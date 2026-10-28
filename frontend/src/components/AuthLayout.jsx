import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiArrowRight, FiCalendar, FiClipboard, FiMoon, FiSun, FiUsers, FiCheck } from 'react-icons/fi';
import { TbPaw } from 'react-icons/tb';
import './AuthLayout.css';

const features = [
  {Icon:FiCalendar,title:'Planeje os atendimentos',description:'Agenda com horários, profissionais e compromissos da clínica.'},
  {Icon:TbPaw,title:'Acompanhe cada paciente',description:'Tutores, animais e histórico clínico no mesmo sistema.'},
  {Icon:FiClipboard,title:'Dê continuidade ao cuidado',description:'Consulte prontuários, vacinas e retornos durante a rotina.'}
];

export default function AuthLayout({children,signup=false,complete=false}) {
  const [theme,setTheme]=useState(()=>localStorage.getItem('vetcare_theme') || localStorage.getItem('theme') || 'light');
  useEffect(()=>{
    document.documentElement.setAttribute('data-theme',theme);
    localStorage.setItem('vetcare_theme',theme);
    localStorage.setItem('theme',theme);
  },[theme]);
  return <div className={`vc-auth ${signup?'vc-auth-signup':''}`}>
    <nav className="vc-auth-nav" aria-label="Navegação de acesso">
      <Link className="vc-auth-brand" to="/" aria-label="VetCare — voltar ao site"><span><TbPaw aria-hidden="true"/></span>Vet<span className="vc-auth-brand-care">Care</span></Link>
      <div className="vc-auth-nav-actions"><Link to="/"><FiArrowLeft aria-hidden="true"/>Voltar ao site</Link><button type="button" className="vc-auth-theme" aria-label={theme==='light'?'Ativar modo escuro':'Ativar modo claro'} onClick={()=>setTheme(t=>t==='light'?'dark':'light')}>{theme==='light'?<FiMoon/>:<FiSun/>}</button></div>
    </nav>
    <main className="vc-auth-stage">
      <aside className="vc-auth-story" aria-label="Conheça o VetCare">
        <div className="vc-auth-story-top"><span className="vc-auth-kicker"><span/>GESTÃO VETERINÁRIA</span><span className="vc-auth-story-mark" aria-hidden="true"><TbPaw/></span></div>
        <div className="vc-auth-story-main"><h2>{signup?<>Sua clínica.<br/>Seu jeito de <em>cuidar.</em></>:<>Tudo conectado<br/>à sua rotina de <em>cuidado.</em></>}</h2><p>{signup?'Comece pelo cadastro da sua clínica e reúna as informações que acompanham cada atendimento.':'Acesse sua clínica para organizar os atendimentos e continuar o acompanhamento dos seus pacientes.'}</p></div>
        <div className="vc-auth-feature-list">{features.map(({Icon,title,description})=><div className="vc-auth-feature" key={title}><span><Icon aria-hidden="true"/></span><div><h3>{title}</h3><p>{description}</p></div></div>)}</div>
        <div className="vc-auth-story-footer">{signup?<><FiCheck aria-hidden="true"/><div><strong>{complete?'VetCare Completo · R$ 97/mês':'7 dias para conhecer o VetCare'}</strong><p>{complete?'Após criar a conta, você segue para a contratação mensal.':'Teste gratuito sem cartão. Depois, continue com o plano mensal.'}</p></div></>:<><FiUsers aria-hidden="true"/><div><strong>Um espaço para a sua equipe</strong><p>Agenda, pacientes e registros da clínica reunidos.</p></div></>}</div>
      </aside>
      <section className="vc-auth-form-panel" aria-label={signup?'Cadastro da clínica':'Acesso à clínica'}>{children}</section>
    </main>
    <footer className="vc-auth-footer"><span>© {new Date().getFullYear()} VetCare</span><Link to={signup?'/login':'/cadastro'}>{signup?'Já tem uma conta? Entrar':'Quer conhecer? Criar conta'}<FiArrowRight aria-hidden="true"/></Link></footer>
  </div>;
}
