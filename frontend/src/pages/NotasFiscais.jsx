import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiClock, FiFileText, FiShield } from 'react-icons/fi';
import './NotasFiscais.css';

export default function NotasFiscais() {
  return <main className="fiscal-coming-soon" aria-labelledby="fiscal-coming-soon-title">
    <header className="fiscal-coming-soon-header"><span>GESTÃO DA CLÍNICA</span><h1 id="fiscal-coming-soon-title">Notas fiscais</h1><p>Estamos preparando este recurso para a sua clínica.</p></header>
    <section className="fiscal-coming-soon-card" aria-labelledby="fiscal-coming-soon-message">
      <div className="fiscal-coming-soon-icon" aria-hidden="true"><FiFileText/><span><FiClock/></span></div>
      <span className="fiscal-coming-soon-badge"><FiClock aria-hidden="true"/>Em breve</span>
      <h2 id="fiscal-coming-soon-message">Emissão de notas fiscais em preparação</h2>
      <p>A emissão de notas fiscais está temporariamente indisponível enquanto concluímos a regularização e a configuração fiscal necessárias para disponibilizar o recurso.</p>
      <div className="fiscal-coming-soon-detail"><FiShield aria-hidden="true"/><div><h3>Liberação após a configuração fiscal</h3><p>O módulo será disponibilizado após a conclusão das configurações e validações necessárias para a emissão. A data de lançamento ainda não foi definida.</p></div></div>
      <p className="fiscal-coming-soon-note">Por enquanto, não é possível emitir, cancelar ou configurar notas fiscais pelo VetCare. Seus registros existentes permanecem preservados.</p>
      <Link className="fiscal-coming-soon-back" to="/dashboard"><FiArrowLeft aria-hidden="true"/>Voltar ao dashboard</Link>
    </section>
  </main>;
}
