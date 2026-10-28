import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCreditCard, FiLock, FiCheckCircle, FiAlertCircle, FiCopy } from 'react-icons/fi';
import BackToDashboard from '../components/BackToDashboard';
import { getBillingStatus, resumeCheckout, subscribe, syncBilling } from '../services/billing';
import './Checkout.css';
import './Login.css';

export default function Checkout() {
  const navigate=useNavigate();
  const user=JSON.parse(localStorage.getItem('usuario') || 'null');
  const admin=user?.perfil==='admin';
  const [config,setConfig]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [checkout,setCheckout]=useState({state:'new'});
  const [billingType,setBillingType]=useState('PIX');
  const [payer,setPayer]=useState({nome:user?.clinica?.nome || '',email:user?.clinica?.email || user?.email || '',cpfCnpj:'',postalCode:'',addressNumber:'',phone:user?.clinica?.telefone || ''});
  const [card,setCard]=useState({holderName:'',number:'',expiryMonth:'',expiryYear:'',ccv:''});
  const submitting=useRef(false);
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try {
        const status=await getBillingStatus();
        if(cancelled) return;
        setConfig(status); syncBilling(status);
        if(status.paidActive) setCheckout({state:'active'});
        else if(status.configured && admin) {
          const saved=await resumeCheckout();
          if(!cancelled) setCheckout(saved);
        }
      } catch(e) { if(!cancelled) setError(e.message); }
      finally { if(!cancelled) setLoading(false); }
    })();
    return ()=>{cancelled=true;};
  },[admin]);
  useEffect(()=>{
    if(!['pending','processing'].includes(checkout.state)) return;
    let cancelled=false;
    let timer;
    const poll=async()=>{
      try {
        const status=await getBillingStatus(checkout.paymentId);
        if(cancelled) return;
        // Confirmation must belong to the displayed charge, not an older subscription.
        if(status.paidActive && (!checkout.paymentId || ['CONFIRMED','RECEIVED'].includes(status.paymentStatus))) {
          syncBilling(status); setCheckout({state:'active'}); setNotice(''); return;
        }
        if(['REFUSED','REFUNDED','DELETED','CHARGEBACK_REQUESTED','CHARGEBACK_DISPUTE'].includes(status.paymentStatus)) {
          setError('Esta cobrança foi cancelada ou estornada. Recupere a cobrança ou fale com o atendimento.');
          setCheckout({state:'failed'}); return;
        }
        setNotice('');
      } catch(e) { if(!cancelled) setNotice(`Não foi possível verificar agora. Tentaremos novamente. ${e.message}`); }
      if(!cancelled) timer=setTimeout(poll,5000);
    };
    poll();
    return ()=>{cancelled=true;clearTimeout(timer);};
  },[checkout.state,checkout.paymentId]);
  const recover=async()=>{
    if(submitting.current) return;
    submitting.current=true;setLoading(true);setError('');
    try { const saved=await resumeCheckout();setCheckout(saved); }
    catch(e) {setError(e.message);}
    finally {submitting.current=false;setLoading(false);}
  };
  const pay=async event=>{
    event.preventDefault();
    if(submitting.current) return;
    submitting.current=true;setLoading(true);setError('');
    try {
      const result=await subscribe({...payer,planoId:'complete',billingType,...(billingType==='CREDIT_CARD'?{creditCard:card}:{})});
      setCard({holderName:'',number:'',expiryMonth:'',expiryYear:'',ccv:''});
      setCheckout(result);
      if(result.state==='active') syncBilling(await getBillingStatus());
    } catch(e) {setError(e.message);}
    finally {submitting.current=false;setLoading(false);}
  };
  const copy=async()=>{
    try {await navigator.clipboard.writeText(checkout.pix.payload);setNotice('Código Pix copiado.');}
    catch {setNotice('Selecione e copie o código Pix no campo abaixo.');}
  };
  const field=(name,label,options={})=><label className="billing-field" key={name}>{label}<input className="v-input" name={name} value={payer[name]} onChange={e=>setPayer({...payer,[name]:e.target.value})} required {...options}/></label>;
  const cardField=(name,label,options={})=><label className="billing-field" key={name}>{label}<input className="v-input" name={name} value={card[name]} onChange={e=>setCard({...card,[name]:e.target.value})} required {...options}/></label>;
  return <div className="v-checkout-page">
    <nav className="v-checkout-nav"><strong>VetCare</strong><BackToDashboard/></nav>
    <main className="v-checkout-container">
      <section className="v-checkout-form-section v-glass-panel" aria-busy={loading}>
        <div className="v-checkout-header"><h1>Assinatura VetCare</h1><p>VetCare Completo · R$ 97,00 por mês</p></div>
        {config?.sandbox && <p className="billing-notice" role="status">Ambiente de testes: não utilize dados ou cartões reais.</p>}
        {error && <div className="v-checkout-error" role="alert"><FiAlertCircle/>{error}</div>}
        {notice && <p className="billing-notice" role="status">{notice}</p>}
        {loading && <p role="status">Consultando pagamento…</p>}
        {!admin ? <p>Somente o administrador da clínica pode contratar ou recuperar uma cobrança.</p> : config && !config.configured ? <p className="billing-notice">Os pagamentos ainda não estão disponíveis. A integração com o Asaas precisa ser configurada antes de contratar o plano.</p> : checkout.state==='active' ? <div className="billing-result"><FiCheckCircle size={48}/><h2>Assinatura ativa</h2><p>Seu acesso ao VetCare Completo está liberado.</p><button className="v-btn-pay" onClick={()=>{window.location.href='/';}}>Acessar o sistema</button></div> : ['pending','processing'].includes(checkout.state) ? <div className="billing-result" aria-live="polite">
          <FiLock size={40}/><h2>Aguardando confirmação</h2><p>A liberação acontece após a confirmação do pagamento.</p>
          {checkout.dueDate && <p>Vencimento: {checkout.dueDate.split('-').reverse().join('/')}</p>}
          {checkout.pix ? <><img className="billing-qr" src={`data:image/png;base64,${checkout.pix.encodedImage}`} alt="QR Code para pagamento Pix"/><label className="billing-field">Pix copia e cola<textarea readOnly value={checkout.pix.payload} rows={3}/></label><button className="v-btn-pay" onClick={copy}><FiCopy/>Copiar código Pix</button></> : <p>{checkout.notice || 'O pagamento está sendo processado. Acompanhe a confirmação nesta tela.'}</p>}
          <button className="billing-secondary" onClick={recover} disabled={loading}>Recuperar cobrança / verificar novamente</button>
        </div> : checkout.state==='failed' ? <div className="billing-result"><h2>Pagamento não concluído</h2><p>{checkout.notice || 'A cobrança precisa ser verificada pelo atendimento antes de uma nova tentativa.'}</p><button className="billing-secondary" onClick={recover} disabled={loading}>Recuperar cobrança</button></div> : <form onSubmit={pay}>
          <p className="v-checkout-monthly-note">Cobrança mensal de R$ 97,00, sem fidelidade. No Pix, pague a cobrança de cada mês; o valor não é debitado automaticamente. Para cancelar as próximas cobranças, fale com o atendimento antes do próximo vencimento.</p>
          <fieldset className="billing-methods"><legend>Forma de pagamento</legend>{['PIX','CREDIT_CARD'].map(type=><label key={type}><input type="radio" name="billingType" value={type} checked={billingType===type} onChange={()=>setBillingType(type)}/>{type==='PIX'?'Pix':'Cartão de crédito'}</label>)}</fieldset>
          <div className="billing-fields">
            {field('nome','Nome completo do pagador',{autoComplete:'name',minLength:3,maxLength:160})}
            {field('email','E-mail',{type:'email',autoComplete:'email',maxLength:160})}
            {field('cpfCnpj','CPF ou CNPJ',{inputMode:'numeric',maxLength:18})}
            {field('phone','Telefone com DDD',{type:'tel',autoComplete:'tel',maxLength:20})}
            {field('postalCode','CEP',{inputMode:'numeric',autoComplete:'postal-code',maxLength:9})}
            {field('addressNumber','Número do endereço',{autoComplete:'address-line2',maxLength:20})}
          </div>
          {billingType==='CREDIT_CARD' && <fieldset className="billing-card"><legend><FiCreditCard/>Dados do cartão</legend><div className="billing-fields">
            {cardField('holderName','Nome impresso no cartão',{autoComplete:'cc-name',maxLength:160})}
            {cardField('number','Número do cartão',{inputMode:'numeric',autoComplete:'cc-number',maxLength:23})}
            {cardField('expiryMonth','Mês de validade',{inputMode:'numeric',autoComplete:'cc-exp-month',pattern:'0?[1-9]|1[0-2]',maxLength:2})}
            {cardField('expiryYear','Ano de validade',{inputMode:'numeric',autoComplete:'cc-exp-year',pattern:'[0-9]{4}',maxLength:4})}
            {cardField('ccv','Código de segurança',{type:'password',inputMode:'numeric',autoComplete:'off',pattern:'[0-9]{3,4}',maxLength:4})}
          </div></fieldset>}
          <button className="v-btn-pay" type="submit" disabled={loading || !config?.configured}><FiLock/>{loading?'Processando…':'Assinar por R$ 97,00/mês'}</button>
          <button className="billing-secondary" type="button" disabled={loading || !config?.configured} onClick={recover}>Já iniciei o pagamento: recuperar cobrança</button>
        </form>}
      </section>
      <aside className="v-checkout-summary-section v-glass-panel"><h2>VetCare Completo</h2><p>Prontuários, agenda clínica, vacinas, exames, internação e gestão da sua clínica.</p><div className="v-summary-total"><span>Mensalidade</span><strong>R$ 97,00</strong></div><p>O acesso pago é liberado após a confirmação do gateway.</p><button className="billing-secondary" onClick={()=>navigate('/planos')}>Ver detalhes do plano</button></aside>
    </main>
  </div>;
}
