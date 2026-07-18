import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiPost } from '../services/api';
import { FiCheckCircle } from 'react-icons/fi';

const PagamentoSucesso = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processando pagamento...');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const planoId = searchParams.get('plano_id');
    const duracao = searchParams.get('duracao');

    if (sessionId) {
      // Se for ambiente de testes (MOCK) ou ainda sem webhook configurado:
      // Vamos acionar a rota mock para liberar a conta agora.
      apiPost('/pagamento/mock-webhook-success', { session_id: sessionId, plano_id: planoId, duracao: duracao })
        .then(() => {
          setStatus('Pagamento aprovado! Redirecionando...');
          
          // Atualiza o plano no localStorage para refletir no sistema
          const usuarioStr = localStorage.getItem("usuario");
          if (usuarioStr && planoId) {
            const usuario = JSON.parse(usuarioStr);
            usuario.clinica.plano_id = planoId;
            usuario.clinica.status_assinatura = 'ativa';
            localStorage.setItem("usuario", JSON.stringify(usuario));
          }

          setTimeout(() => {
            window.location.href = '/'; // Força recarregar o app todo para limpar estados
          }, 2000);
        })
        .catch(() => {
          setStatus('Erro ao confirmar pagamento. Contate o suporte.');
        });
    } else {
      setStatus('Sessão inválida.');
    }
  }, [searchParams, navigate]);

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
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Oba! Tudo certo.</h1>
      <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>{status}</p>
    </div>
  );
};

export default PagamentoSucesso;
