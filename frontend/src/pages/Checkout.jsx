import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCreditCard, FiLock, FiCheckCircle, FiShield, FiAlertCircle } from 'react-icons/fi';
import { API_URL, apiPost } from '../services/api';
import './Checkout.css';

export default function Checkout() {
  const navigate = useNavigate();
  const [plano, setPlano] = useState('clinica');
  const [duracao, setDuracao] = useState(1);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  const planos_info = {
    clinica: { nome: 'Plano Vet Clínica', preco: 119.00 },
    complete: { nome: 'Plano Vet Complete', preco: 189.00 }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('plano');
    if (p && (p === 'clinica' || p === 'complete')) {
      setPlano(p);
    }
  }, []);

  const handlePagamento = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      const response = await apiPost('/pagamento/checkout', { plano_id: plano, duracao: duracao });
      const data = await response.json();
      
      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        setErro(data.error || 'Erro ao gerar link de pagamento do Stripe');
        setLoading(false);
      }
    } catch (error) {
      setErro('Erro de conexão ao processar pagamento.');
      setLoading(false);
    }
  };

  const planoAtual = planos_info[plano];

  return (
    <div className="v-checkout-page">
      <div className="v-checkout-mesh">
        <div className="v-checkout-orb v-orb-purple"></div>
        <div className="v-checkout-orb v-orb-blue"></div>
      </div>

      <nav className="v-checkout-nav">
        <div className="v-nav-brand" onClick={() => navigate("/")}>
          <FiShield size={24} color="var(--primary)" />
          <span>Vet Care Secure Checkout</span>
        </div>
      </nav>

      <div className="v-checkout-container reveal-up">
        {sucesso ? (
          <div className="v-checkout-success-box">
            <FiCheckCircle size={64} color="var(--primary)" />
            <h2>Pagamento Aprovado!</h2>
            <p>Sua assinatura {planoAtual.nome} está ativa. Redirecionando...</p>
          </div>
        ) : (
          <>
            <div className="v-checkout-form-section v-glass-panel">
              <div className="v-checkout-header">
                <h2>Confirmação de Assinatura</h2>
                <p>Personalize seu plano e siga para o ambiente seguro do Stripe.</p>
              </div>

              {erro && <div className="v-checkout-error"><FiAlertCircle /> {erro}</div>}

              <div className="v-checkout-duration-section">
                <label className="v-duration-label">Duração da Assinatura</label>
                <div className="v-duration-options">
                  {[1, 3, 6, 12, 48].map((meses) => (
                    <button
                      key={meses}
                      type="button"
                      className={`v-duration-btn ${duracao === meses ? 'active' : ''}`}
                      onClick={() => setDuracao(meses)}
                    >
                      {meses} {meses === 1 ? 'mês' : 'meses'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="v-checkout-stripe-info" style={{ marginTop: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
                <FiShield size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                <h3>Ambiente de Pagamento Seguro</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', marginTop: '1rem' }}>
                  A Vet Care utiliza o <strong>Stripe</strong>, a plataforma líder mundial em pagamentos online, para garantir a segurança dos seus dados. 
                  Nós não armazenamos nenhuma informação do seu cartão de crédito.
                </p>
              </div>

              <div className="v-checkout-footer" style={{ justifyContent: 'center' }}>
                <button className="v-btn-pay" onClick={handlePagamento} disabled={loading} style={{ width: '100%', maxWidth: '400px' }}>
                  {loading ? 'Redirecionando...' : 'Prosseguir para Pagamento Seguro'}
                </button>
              </div>
            </div>

            <div className="v-checkout-summary-section v-glass-panel">
              <h3>Resumo do Pedido</h3>
              
              <div className="v-summary-item">
                <span>{planoAtual.nome}</span>
                <span>R$ {planoAtual.preco.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="v-summary-item">
                <span>Faturamento</span>
                <span>{duracao === 1 ? 'Mensal' : `${duracao} Meses`}</span>
              </div>
              
              <hr className="v-summary-divider" />
              
              <div className="v-summary-total">
                <span>Total a Pagar Hoje</span>
                <strong>R$ {(planoAtual.preco * duracao).toFixed(2).replace('.', ',')}</strong>
              </div>

              <div className="v-summary-benefits">
                <ul>
                  <li><FiCheckCircle /> Acesso imediato à plataforma</li>
                  <li><FiCheckCircle /> Cancelamento fácil a qualquer momento</li>
                  <li><FiCheckCircle /> Suporte técnico dedicado</li>
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
