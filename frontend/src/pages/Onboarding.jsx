import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TbStethoscope, TbLayoutDashboard, TbUsers, TbCheck } from "react-icons/tb";
import { FiScissors } from "react-icons/fi";
import { apiPost } from "../services/api";
import "./Onboarding.css";

export default function Onboarding({ usuario }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isComplete = usuario?.clinica?.plano_id === 'complete';

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const finalizarOnboarding = async () => {
    setLoading(true);
    try {
      await apiPost("/auth/onboarding");
      
      // Atualiza o local storage
      const usr = JSON.parse(localStorage.getItem("usuario"));
      if (usr) {
        usr.clinica.onboarding_concluido = 1;
        localStorage.setItem("usuario", JSON.stringify(usr));
      }

      window.location.href = "/";
    } catch (error) {
      console.error("Erro ao finalizar onboarding:", error);
      alert("Erro ao finalizar. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-container v-global-mesh-layout">
      <div className="v-dash-mesh">
        <div className="v-orb-dash v-orb-primary" style={{ animation: 'float 6s infinite ease-in-out' }}></div>
        <div className="v-orb-dash v-orb-secondary" style={{ animation: 'float 8s infinite ease-in-out reverse' }}></div>
      </div>

      <div className="onboarding-card v-glass-panel reveal-fade">
        {step === 1 && (
          <div className="onboarding-step text-center">
            <div className="onboarding-icon-large">
              <TbStethoscope size={64} className="text-primary" />
            </div>
            <h1 className="onboarding-title">Bem-vindo ao Vet Care!</h1>
            <p className="onboarding-subtitle">
              Olá, <strong>{usuario?.nome?.split(' ')[0]}</strong>! Estamos muito felizes em ter a <strong>{usuario?.clinica?.nome || 'sua clínica'}</strong> conosco.
            </p>
            <p className="onboarding-text">
              Preparamos um sistema completo para facilitar o dia a dia da sua clínica, desde a recepção até o financeiro. Vamos fazer um tour rápido de 1 minuto?
            </p>
            <div className="onboarding-actions center">
              <button className="v-btn-primary-glow large-btn" onClick={nextStep}>
                Começar o Tour
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-step">
            <h2 className="onboarding-title">O que você tem acesso?</h2>
            <p className="onboarding-subtitle">Seu plano atual é o <strong>{isComplete ? "VetCare Completo" : "Free"}</strong>. Aqui estão os recursos disponíveis:</p>
            
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon"><TbLayoutDashboard size={32} /></div>
                <h4>Prontuário Inteligente</h4>
                <p>Grave a consulta por voz e nossa IA digita tudo para você magicamente.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon"><TbUsers size={32} /></div>
                <h4>Gestão de Pacientes</h4>
                <p>Controle de vacinas, retornos e histórico clínico completo.</p>
              </div>
              {isComplete && (
                <div className="feature-card highlight">
                  <div className="feature-icon"><FiScissors size={32} /></div>
                  <h4>Centro Estético & Petshop</h4>
                  <p>Acompanhe a equipe clínica e organize as comissões dos profissionais.</p>
                </div>
              )}
            </div>

            <div className="onboarding-actions split">
              <button className="btn-secondary" onClick={prevStep}>Voltar</button>
              <button className="v-btn-primary-glow" onClick={nextStep}>Próximo Passo</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="onboarding-step text-center">
            <div className="onboarding-icon-large success-icon">
              <TbCheck size={64} />
            </div>
            <h2 className="onboarding-title">Tudo Pronto!</h2>
            <p className="onboarding-subtitle">
              Sua clínica já está configurada e pronta para voar alto.
            </p>
            <p className="onboarding-text">
              <strong>Dica de ouro:</strong> Assim que entrar, comece cadastrando o seu primeiro Paciente para poder testar o Prontuário por Voz. É a nossa função favorita!
            </p>
            <div className="onboarding-actions center" style={{ marginTop: '30px' }}>
              <button className="v-btn-primary-glow large-btn bounce-hover" onClick={finalizarOnboarding} disabled={loading}>
                {loading ? "Preparando painel..." : "Ir para o meu Painel"}
              </button>
            </div>
          </div>
        )}

        <div className="onboarding-progress">
          <div className={`progress-dot ${step >= 1 ? 'active' : ''}`}></div>
          <div className={`progress-dot ${step >= 2 ? 'active' : ''}`}></div>
          <div className={`progress-dot ${step >= 3 ? 'active' : ''}`}></div>
        </div>
      </div>
    </div>
  );
}
