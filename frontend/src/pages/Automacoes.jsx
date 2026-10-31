import React from "react";
import { FiMessageCircle, FiExternalLink } from "react-icons/fi";
import "./Automacoes.css";

export default function Automacoes() {
  return (
    <main className="v-automacoes-container">
      <section className="v-automacoes-section whatsapp-link-info">
        <div className="whatsapp-link-icon"><FiMessageCircle /></div>
        <h1>Mensagens pelo WhatsApp Web</h1>
        <p>
          O VetCare abre uma conversa no WhatsApp Web com o telefone do tutor e a mensagem preenchidos.
          Revise e envie a mensagem pelo próprio WhatsApp.
        </p>
        <ul>
          <li>Na Agenda, clique no ícone do WhatsApp para abrir o lembrete da consulta.</li>
          <li>No perfil do tutor, use o botão WhatsApp para iniciar uma conversa.</li>
          <li>Em Banho &amp; Tosa, use Enviar WhatsApp para compartilhar o acompanhamento do pet.</li>
        </ul>
        <div className="whatsapp-link-note"><FiExternalLink /> Não é necessário conectar uma sessão ou ler QR Code no VetCare.</div>
      </section>
    </main>
  );
}
