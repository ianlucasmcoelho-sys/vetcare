import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiPost } from '../services/api';
import { FiCheckCircle } from 'react-icons/fi';

const PagamentoSucesso = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('Processando pagamento...');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const planoId = searchParams.get('plano_id');
    const duracao = searchParams.get('duracao');

    if (sessionId?.startsWith('mock_')) {
      apiPost('/pagamento/mock-webhook-success', { session_id: sessionId, plano_id: planoId, duracao: duracao })
        .then((response) => {
          if (!response?.ok) throw new Error('Não foi possível confirmar o pagamento de demonstração.');
          setStatus('Pagamento aprovado! Redirecionando...');
          
          // Atualiza o plano no localStorage para refletir no sistema
          const usuarioStr = localStorage.getItem("usuario");
          if (usuarioStr) {
            const usuario = JSON.parse(usuarioStr);
            if (planoId) usuario.clinica.plano_id = 'complete';
            usuario.clinica.status_assinatura = 'active';
            localStorage.setItem("usuario", JSON.stringify(usuario));
          }

          setTimeout(() => {
            window.location.href = '/'; // Força recarregar o app todo para limpar estados
          }, 2000);
        })
        .catch(() => {
          setStatus('A confirmação do pagamento de demonstração falhou. Volte ao painel e tente novamente.');
        });
    } else if (sessionId) {
      setStatus('Pagamento recebido. A liberação da assinatura depende da confirmação segura do gateway; atualize o painel em instantes.');
    } else {
      setStatus('Sessão inválida.');
    }
  }, [searchParams]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      textAlign: 'center'
    }}>
      <FiCheckCircle size={80} color="var(--success-color)" style={{ marginBottom: '1.5rem' }} />
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Status do pagamento</h1>
      <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>{status}</p>
    </div>
  );
};

export default PagamentoSucesso;
