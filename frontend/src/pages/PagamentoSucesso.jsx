import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBillingStatus, syncBilling } from '../services/billing';

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
  return <main className="v-page-container" style={{maxWidth:680,margin:'60px auto',textAlign:'center'}}><h1>Status do pagamento</h1><p role="status">{message}</p><p><Link to="/checkout">Acompanhar cobrança</Link></p><Link to="/">Voltar ao início</Link></main>;
}
