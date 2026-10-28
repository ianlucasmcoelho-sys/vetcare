import React, { useState, useEffect } from 'react';
import { FiCheckCircle, FiShield, FiStar } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import '../Global.css';
import { getBillingStatus, syncBilling } from '../services/billing';
import BackToDashboard from '../components/BackToDashboard';

export default function Assinatura() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [billingError,setBillingError] = useState('');
  const [checking,setChecking] = useState(true);

  useEffect(() => {
    const usuarioStr = localStorage.getItem('usuario');
    if (usuarioStr) {
      setUser(JSON.parse(usuarioStr));
      getBillingStatus().then(status=>{
        syncBilling(status);
        setUser(JSON.parse(localStorage.getItem('usuario')));
      }).catch(error=>setBillingError(error.message)).finally(()=>setChecking(false));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  if (!user) return null;

  const status = (user.clinica?.status_assinatura || 'trial').toLowerCase();
  const dataExpiracao = user.clinica?.data_expiracao ? new Date(user.clinica.data_expiracao) : null;
  const isFree = ['free','trial'].includes(status) && dataExpiracao && dataExpiracao > new Date();
  const isVitalicio = status === 'vitalicio';
  const isActive = isVitalicio || (['active','ativo','ativa'].includes(status) && dataExpiracao && dataExpiracao > new Date());

  return (
    <div className="v-page-container" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Background Mesh (Symmetry with Checkout/Onboarding) */}
      <div className="v-dash-mesh">
        <div className="v-orb-dash v-orb-primary" style={{ animation: 'float 6s infinite ease-in-out' }}></div>
        <div className="v-orb-dash v-orb-secondary" style={{ animation: 'float 8s infinite ease-in-out reverse' }}></div>
      </div>

      <div className="v-page-header" style={{ position: 'relative', zIndex: 1 }}>
        <BackToDashboard />
        <h1 className="v-page-title">Meu Plano</h1>
        <p className="v-page-subtitle">Gerencie o status da sua assinatura VetCare</p>
        {checking && <p role="status">Atualizando assinatura…</p>}
        {billingError && <p role="alert">{billingError}</p>}
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px', margin: '0 auto', marginTop: '40px' }}>
        <div className="v-glass-panel" style={{ padding: '40px', textAlign: 'center', borderRadius: '24px' }}>
          
          {isFree ? (
            <div className="reveal-up">
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(20, 184, 166, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <FiCheckCircle size={50} color="var(--primary)" />
              </div>
              <h2 style={{ fontSize: '2rem', color: 'var(--text-primary)', marginBottom: '10px' }}>Teste gratuito ativo</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginBottom: '30px' }}>Seu acesso gratuito vai até {dataExpiracao?.toLocaleDateString('pt-BR') || 'o fim do período de teste'}. Assine o VetCare Completo por R$ 97/mês para continuar usando o sistema.</p>
              <button className="v-btn-primary-glow" onClick={() => navigate('/planos')} style={{ width: '100%', justifyContent: 'center' }}>Conhecer o plano completo</button>
            </div>
          ) : isActive ? (
            <div className="reveal-up">
              <div style={{ 
                width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
                boxShadow: '0 0 30px rgba(16, 185, 129, 0.2)'
              }}>
                <FiCheckCircle size={50} color="#10B981" />
              </div>
              
              <h2 style={{ fontSize: '2rem', color: 'var(--text-primary)', marginBottom: '10px' }}>{isVitalicio ? 'Acesso vitalício' : 'Assinatura ativa'}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '30px' }}>
                Você tem acesso ilimitado a todas as ferramentas do sistema.
              </p>
              {!isVitalicio && dataExpiracao && <p>Acesso pago até {dataExpiracao.toLocaleDateString('pt-BR')}.</p>}

              <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '16px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                  <FiShield size={24} color="var(--primary)" />
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Pagamento Seguro</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                  <FiStar size={24} color="#F59E0B" />
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>{isVitalicio ? 'Acesso permanente' : 'VetCare Completo · R$ 97/mês'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="reveal-up">
              <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginBottom: '10px' }}>Sua Assinatura está Inativa</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '30px' }}>
                Parece que o seu plano expirou ou o pagamento não foi concluído.
              </p>
              <button className="v-btn-primary-glow" onClick={() => navigate('/planos')} style={{ width: '100%', justifyContent: 'center' }}>
                Regularizar Assinatura
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
