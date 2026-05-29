import React from "react";
import "./TopMessage.css";

export default function TopMessage({ usuario }) {
  return (
    <div className="top-message">
      <h2>Bem-vindo, {usuario}!</h2>
      <p>Tenha um ótimo dia de trabalho no Sistema Vet Care.</p>
    </div>
  );
}
