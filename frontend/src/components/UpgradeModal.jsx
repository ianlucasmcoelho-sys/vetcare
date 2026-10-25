import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLock, FiStar, FiX } from 'react-icons/fi';
import './UpgradeModal.css';

export default function UpgradeModal({ isOpen, onClose, featureName }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="v-modal-overlay" onClick={onClose}>
      <div className="v-modal-content v-upgrade-modal" onClick={e => e.stopPropagation()}>
        <button className="v-modal-close" onClick={onClose}><FiX /></button>
        
        <div className="v-upgrade-icon">
          <FiLock />
        </div>
        
        <h2>Recurso Premium</h2>
        <p>O módulo de <strong>{featureName}</strong> está incluído no plano <strong>VetCare Completo</strong>, por R$ 97 ao mês.</p>
        
        <div className="v-upgrade-features">
          <div className="v-upgrade-badge"><FiStar /> Gestão Ilimitada</div>
        </div>
        
        <p className="v-upgrade-desc">Faça o upgrade agora para desbloquear todos os recursos avançados e elevar o nível da sua clínica.</p>
        
        <div className="v-upgrade-actions">
          <button className="v-btn-cancelar" onClick={onClose}>Agora não</button>
          <button className="v-btn-upgrade" onClick={() => {
            onClose();
            navigate('/planos');
          }}>
            Fazer Upgrade
          </button>
        </div>
      </div>
    </div>
  );
}
