import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBillingStatus, syncBilling } from '../services/billing';
import { FiArrowLeft, FiCreditCard } from 'react-icons/fi';
import './PagamentoSucesso.css';

export default function PagamentoSucesso() {
  const [message,setMessage]=useState('Consultando a confirmação do pagamento…');
  useEffect(()=>{
    let cancelled=false,timer;
    const check=async()=>{
      try {
        const status=await getBillingStatus();
        if(cancelled) return;
        syncBilling(status);
        if(status.paidActive) {setMessage('Sua assinatura está ativa. O acesso ao sistema está liberado.');return;}
        setMessage('Aguardando a confirmação segura do pagamento. Você pode acompanhar a cobrança no checkout.');
      } catch {if(!cancelled) setMessage('Não foi possível consultar agora. Volte ao checkout para acompanhar seu pagamento.');}
      if(!cancelled) timer=setTimeout(check,5000);
    };
    check();
    return ()=>{cancelled=true;clearTimeout(timer);};
  },[]);
  return <main className="billing-result-page"><section className="billing-result-card"><span className="billing-result-icon" aria-hidden="true"><FiCreditCard /></span><h1>Status do pagamento</h1><p role="status" aria-live="polite">{message}</p><div className="billing-result-actions"><Link to="/checkout">Acompanhar cobrança</Link><Link to="/"><FiArrowLeft />Voltar ao início</Link></div></section></main>;
}
