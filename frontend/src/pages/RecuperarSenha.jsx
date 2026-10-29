import { TbPaw } from 'react-icons/tb';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCheckCircle, FiMail, FiShield } from 'react-icons/fi';
import { API_URL } from '../services/api';
import './RecuperarSenha.css';

export default function RecuperarSenha() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/auth/recuperar-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível enviar o e-mail agora. Tente novamente.');
      setSent(true);
    } catch (requestError) {
      setError(requestError.message || 'Erro ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="recovery-page">
      <div className="recovery-glow recovery-glow-one" />
      <div className="recovery-glow recovery-glow-two" />
      <button type="button" className="recovery-back" onClick={() => navigate('/login')}>
        <FiArrowLeft /> Voltar ao login
      </button>

      <section className="recovery-card" aria-labelledby="recovery-title">
        <div className="recovery-brand">
          <TbPaw aria-hidden="true" />
          <span>Vet<span>Care</span></span>
        </div>
        <div className="recovery-icon"><FiShield /></div>
        {sent ? (
          <div className="recovery-result" role="status" aria-live="polite">
            <FiCheckCircle className="recovery-success-icon" />
            <h1 id="recovery-title">Verifique seu e-mail</h1>
            <p>Se houver uma conta associada a esse endereço, enviaremos um link para criar uma nova senha. Confira também a pasta de spam.</p>
            <button type="button" className="recovery-submit" onClick={() => navigate('/login')}>Voltar ao login</button>
          </div>
        ) : (
          <>
            <h1 id="recovery-title">Recuperar acesso</h1>
            <p className="recovery-intro">Informe o e-mail da sua conta. Enviaremos um link seguro para redefinir sua senha.</p>
            <form onSubmit={submit} className="recovery-form">
              {error && <div className="recovery-error" role="alert">{error}</div>}
              <label htmlFor="recovery-email">E-mail cadastrado</label>
              <div className="recovery-input-wrap">
                <FiMail aria-hidden="true" />
                <input
                  id="recovery-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@clinica.com.br"
                  autoComplete="email"
                  autoCapitalize="none"
                  required
                />
              </div>
              <button type="submit" className="recovery-submit" disabled={loading}>
                {loading ? 'Enviando link…' : 'Enviar link de recuperação'}
              </button>
            </form>
            <p className="recovery-expiry">Por segurança, o link expira após 1 hora e só pode ser usado uma vez.</p>
          </>
        )}
      </section>
      <p className="recovery-footer">© 2026 VetCare · Gestão veterinária</p>
    </main>
  );
}
