import BackToDashboard from "../components/BackToDashboard";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCreditCard, FiLock, FiCheckCircle, FiShield, FiAlertCircle, FiCopy, FiUser, FiMapPin, FiCalendar, FiFileText } from 'react-icons/fi';
import { MdOutlinePix } from 'react-icons/md';
import axios from 'axios';
import { API_URL } from '../services/api';
import './Checkout.css';
import './Login.css';

export default function Checkout() {
  const navigate = useNavigate();
  const [plano, setPlano] = useState('complete');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [pixData, setPixData] = useState(null);
  const [sucessoCC, setSucessoCC] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);

  // Novos estados
  const [billingType, setBillingType] = useState('PIX');
  const duracao = 1;

  const [formData, setFormData] = useState({
    nome: '',
    cpfCnpj: '',
    email: '',
    postalCode: '',
    addressNumber: '',
    phone: ''
  });

  const [ccData, setCcData] = useState({
    holderName: '',
    number: '',
    expiryMonth: '',
    expiryYear: '',
    ccv: ''
  });

  const planos_info = {
    complete: { nome: 'VetCare Completo', preco: 97.00 }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('plano');
    setPlano('complete');

    const usuarioStr = localStorage.getItem('usuario');
    if (usuarioStr) {
       const userObj = JSON.parse(usuarioStr);
       setFormData(prev => ({
         ...prev,
         nome: userObj.clinica?.nome || '',
         email: userObj.clinica?.email || userObj.email || '',
         phone: userObj.clinica?.telefone || ''
       }));
    }
  }, []);

  useEffect(() => {
    if (!paymentPending) return undefined;
    let cancelled = false;

    const checkPayment = async () => {
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get(`${API_URL}/asaas/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (cancelled || !['active', 'vitalicio'].includes(data.status_assinatura) || data.plano_id !== 'complete') return;

        const usuarioStr = localStorage.getItem('usuario');
        if (usuarioStr) {
          const usuario = JSON.parse(usuarioStr);
          usuario.clinica = { ...usuario.clinica, status_assinatura: data.status_assinatura, data_expiracao: data.data_expiracao, plano_id: 'complete' };
          localStorage.setItem('usuario', JSON.stringify(usuario));
        }
        setPaymentPending(false);
        setPixData(null);
        setSucessoCC(true);
      } catch {
        // Uma falha temporária de rede não encerra a verificação; a página tenta novamente.
      }
    };

    checkPayment();
    const interval = setInterval(checkPayment, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [paymentPending]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleCcChange = (e) => setCcData({ ...ccData, [e.target.name]: e.target.value });

  const handlePagamento = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      const token = localStorage.getItem('token');
      const usuarioStr = localStorage.getItem('usuario');
      const userObj = usuarioStr ? JSON.parse(usuarioStr) : null;
      const clinicaId = userObj?.clinica_id || userObj?.clinica?.id;

      const payload = {
        clinicaId,
        planoId: plano,
        billingType,
        duracao,
        ...formData
      };

      if (billingType === 'CREDIT_CARD') {
         payload.creditCard = ccData;
         payload.creditCardHolderInfo = {
            name: formData.nome || ccData.holderName,
            email: formData.email,
            cpfCnpj: formData.cpfCnpj,
            postalCode: formData.postalCode,
            addressNumber: formData.addressNumber,
            phone: formData.phone
         };
      }

      const response = await axios.post(`${API_URL}/asaas/subscribe`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (billingType === 'PIX') {
        if (response.data.pix) {
          setPixData(response.data.pix);
          setPaymentPending(true);
        }
        else setErro(response.data.message || 'Erro ao gerar Pix.');
      } else {
        setPaymentPending(true);
      }
    } catch (error) {
      setErro(error.response?.data?.error || 'Erro de conexão ao processar pagamento.');
    } finally {
      setLoading(false);
    }
  };

  const copiarPix = () => {
    if (pixData?.payload) {
      navigator.clipboard.writeText(pixData.payload);
      alert('Código Pix copiado!');
    }
  };

  const planoAtual = planos_info[plano] || planos_info['clinica'];
  const valorMultiplicado = planoAtual.preco * duracao; // Multiplica pelo número de meses

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
      <BackToDashboard />
        </nav>

      <div className="v-checkout-container reveal-up">
        {sucessoCC ? (
          <div className="v-checkout-success-box v-glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
            <FiCheckCircle size={64} color="#10B981" />
            <h2>Pagamento Aprovado!</h2>
            <p>Sua assinatura <strong>{planoAtual.nome}</strong> foi ativada com sucesso.</p>
            <button className="v-btn-pay" onClick={() => navigate('/')} style={{ marginTop: '20px' }}>Acessar o Sistema</button>
          </div>
        ) : pixData ? (
          <div className="v-checkout-success-box v-glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
            <FiCheckCircle size={64} color="#10B981" />
            <h2>Pagamento Gerado!</h2>
            <p>Escaneie o QR Code abaixo para ativar sua assinatura <strong>{planoAtual.nome}</strong> via Pix.</p>
            
            <img 
              src={`data:image/jpeg;base64,${pixData.encodedImage}`} 
              alt="QR Code Pix" 
              style={{ width: '250px', height: '250px', margin: '20px auto', display: 'block', borderRadius: '12px' }} 
            />
            
            <button type="button" className="v-btn-pay" onClick={copiarPix} style={{ width: '100%', maxWidth: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '0 auto' }}>
              <FiCopy /> Copiar Código Pix
            </button>
            <p style={{ marginTop: '20px', fontSize: '14px', color: '#64748b' }}>A liberação do sistema acontece automaticamente após o pagamento.</p>
          </div>
        ) : paymentPending ? (
          <div className="v-checkout-success-box v-glass-panel" style={{ textAlign: 'center', padding: '40px' }} role="status" aria-live="polite">
            <FiLock size={48} color="var(--primary)" />
            <h2>Pagamento em processamento</h2>
            <p>Estamos aguardando a confirmação do pagamento. Esta página será atualizada automaticamente assim que o banco confirmar.</p>
          </div>
        ) : (
          <>
            <div className="v-checkout-form-section v-glass-panel">
              <div className="v-checkout-header">
                <h2>Finalizar Assinatura</h2>
                <p>Ambiente seguro e criptografado.</p>
              </div>

              {erro && <div className="v-checkout-error"><FiAlertCircle /> {erro}</div>}

              <p className="v-checkout-monthly-note">Assinatura mensal de R$ 97,00, sem fidelidade. Para cancelar as próximas cobranças, fale com o atendimento antes do próximo vencimento.</p>

              {/* PAYMENT TYPE TABS */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                 <button type="button" onClick={() => setBillingType('PIX')} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid', borderColor: billingType === 'PIX' ? '#10B981' : '#e2e8f0', background: billingType === 'PIX' ? 'rgba(16, 185, 129, 0.1)' : 'transparent', color: billingType === 'PIX' ? '#10B981' : 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                    <MdOutlinePix size={20} /> Pix
                 </button>
                 <button type="button" onClick={() => setBillingType('CREDIT_CARD')} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid', borderColor: billingType === 'CREDIT_CARD' ? 'var(--primary)' : '#e2e8f0', background: billingType === 'CREDIT_CARD' ? 'rgba(20, 184, 166, 0.1)' : 'transparent', color: billingType === 'CREDIT_CARD' ? 'var(--primary)' : 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                    <FiCreditCard size={20} /> Cartão de Crédito
                 </button>
              </div>

              <form onSubmit={handlePagamento} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <h3 style={{ fontSize: '1.1rem', marginTop: '10px' }}>Dados do Pagador</h3>
                <div className="v-input-pill-group">
                  <FiFileText className="v-pill-icon" />
                  <input type="text" name="cpfCnpj" className="v-input" placeholder="CPF ou CNPJ (Somente números)" value={formData.cpfCnpj} onChange={handleChange} required />
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <div className="v-input-pill-group" style={{ flex: 1 }}>
                    <FiMapPin className="v-pill-icon" />
                    <input type="text" name="postalCode" className="v-input" placeholder="CEP" value={formData.postalCode} onChange={handleChange} required />
                  </div>
                  <div className="v-input-pill-group" style={{ flex: 1 }}>
                    <FiMapPin className="v-pill-icon" />
                    <input type="text" name="addressNumber" className="v-input" placeholder="Número" value={formData.addressNumber} onChange={handleChange} required />
                  </div>
                </div>

                {billingType === 'CREDIT_CARD' && (
                  <>
                    <h3 style={{ fontSize: '1.1rem', marginTop: '20px' }}>Dados do Cartão</h3>
                    <div className="v-input-pill-group">
                      <FiUser className="v-pill-icon" />
                      <input type="text" name="holderName" className="v-input" placeholder="Nome impresso no Cartão" value={ccData.holderName} onChange={handleCcChange} required />
                    </div>
                    <div className="v-input-pill-group">
                      <FiCreditCard className="v-pill-icon" />
                      <input type="text" name="number" className="v-input" placeholder="Número do Cartão (sem espaços)" value={ccData.number} onChange={handleCcChange} required />
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div className="v-input-pill-group" style={{ flex: 1 }}>
                        <FiCalendar className="v-pill-icon" />
                        <input type="text" name="expiryMonth" className="v-input" placeholder="Mês" maxLength="2" value={ccData.expiryMonth} onChange={handleCcChange} required />
                      </div>
                      <div className="v-input-pill-group" style={{ flex: 1 }}>
                        <FiCalendar className="v-pill-icon" />
                        <input type="text" name="expiryYear" className="v-input" placeholder="Ano" maxLength="4" value={ccData.expiryYear} onChange={handleCcChange} required />
                      </div>
                      <div className="v-input-pill-group" style={{ flex: 1 }}>
                        <FiLock className="v-pill-icon" />
                        <input type="text" name="ccv" className="v-input" placeholder="CVV" maxLength="4" value={ccData.ccv} onChange={handleCcChange} required />
                      </div>
                    </div>
                  </>
                )}

                <div className="v-checkout-footer" style={{ justifyContent: 'center', marginTop: '20px' }}>
                  <button type="submit" className="v-btn-pay" disabled={loading} style={{ width: '100%' }}>
                    <FiLock /> {loading ? 'Processando...' : 'Assinar por R$ 97,00/mês'}
                  </button>
                </div>
              </form>
            </div>

            <div className="v-checkout-summary-section v-glass-panel">
              <h3>Resumo do Pedido</h3>
              
              <div className="v-summary-item">
                <span>{planoAtual.nome}</span>
                <span>R$ {planoAtual.preco.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="v-summary-item">
                <span>Faturamento</span>
                <span>Mensal</span>
              </div>
              
              <hr className="v-summary-divider" />
              
              <div className="v-summary-total">
                <span>Valor Recorrente</span>
                <strong>R$ {valorMultiplicado.toFixed(2).replace('.', ',')}</strong>
              </div>

              <div className="v-summary-benefits">
                <ul>
                  <li><FiCheckCircle /> Acesso imediato à plataforma</li>
                  <li><FiCheckCircle /> Ambiente 100% Seguro</li>
                  <li><FiCheckCircle /> Cancelamento descomplicado</li>
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
