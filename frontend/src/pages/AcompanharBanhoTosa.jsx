import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiGet } from '../services/api';
import './BanhoTosa.css';

const etapas = ['Agendado', 'Chegou', 'Banho', 'Tosa', 'Secagem', 'Finalizado', 'Indo até você'];

export default function AcompanharBanhoTosa() {
  const { token } = useParams();
  const [atendimento, setAtendimento] = useState(null);
  const [erro, setErro] = useState(false);
  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      try {
        const response = await apiGet(`/banhotosa/acompanhar/${encodeURIComponent(token)}`);
        if (!response?.ok) { if (ativo) setErro(true); return; }
        if (ativo) setAtendimento(await response.json());
      } catch { if (ativo) setErro(true); }
    };
    carregar();
    const interval = window.setInterval(carregar, 30000);
    return () => { ativo = false; window.clearInterval(interval); };
  }, [token]);

  if (erro) return <main className="tutor-tracking"><section><h1>Link indisponível</h1><p>Não encontramos esse acompanhamento. Peça à clínica um link atualizado.</p></section></main>;
  if (!atendimento) return <main className="tutor-tracking"><section><p>Carregando o atendimento…</p></section></main>;
  const etapaAtual = Math.max(0, etapas.indexOf(atendimento.status));
  return <main className="tutor-tracking"><section className="tutor-tracking-card">
    <span className="banho-eyebrow">ACOMPANHAMENTO DO PET</span>
    <h1>{atendimento.animal_nome}</h1>
    <p>Banho e tosa · {new Date(`${atendimento.data}T12:00:00`).toLocaleDateString('pt-BR')} às {atendimento.horario}</p>
    <div className="tutor-current-stage"><span>Etapa atual</span><strong>{atendimento.status}</strong></div>
    <ol className="tutor-stage-list">{etapas.map((etapa, index) => <li key={etapa} className={index < etapaAtual ? 'done' : index === etapaAtual ? 'current' : ''}><span>{index < etapaAtual ? '✓' : index + 1}</span><b>{etapa}</b></li>)}</ol>
    {atendimento.servicos && <p className="tutor-services"><strong>Serviços:</strong> {atendimento.servicos}</p>}
    <small>Esta página é atualizada automaticamente.</small>
  </section></main>;
}
