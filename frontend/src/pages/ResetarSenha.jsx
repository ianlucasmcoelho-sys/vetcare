import { TbPaw } from 'react-icons/tb';
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiArrowLeft, FiCheckCircle, FiEye, FiEyeOff, FiLock, FiShield } from 'react-icons/fi';
import { API_URL } from '../services/api';
import './RecuperarSenha.css';
import './ResetarSenha.css';

export default function ResetarSenha() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = new URLSearchParams(location.hash.slice(1)).get('token') || new URLSearchParams(location.search).get('token');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErro('');
    if (senha !== confirmarSenha) return setErro('As senhas não coincidem.');

    const senhaForte = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{8,}$/;
    if (!senhaForte.test(senha)) return setErro('Use ao menos 8 caracteres, com maiúscula, minúscula, número e símbolo.');
    if (!token) return setErro('Este link é inválido ou expirou. Solicite um novo link de recuperação.');

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/resetar-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, novaSenha: senha }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível alterar a senha.');
      setSucesso(true);
      window.setTimeout(() => navigate('/login'), 2200);
    } catch (requestError) {
      setErro(requestError.message || 'Erro ao conectar com o servidor.');
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
      <section className="recovery-card" aria-labelledby="reset-title">
        <div className="recovery-brand"><TbPaw aria-hidden="true" /><span>Vet<span>Care</span></span></div>
        <div className="recovery-icon"><FiShield /></div>
        {!token ? (
          <div className="recovery-result">
            <h1 id="reset-title">Link inválido ou expirado</h1>
            <p>Solicite outro link para criar uma nova senha.</p>
            <button type="button" className="recovery-submit" onClick={() => navigate('/recuperar-senha')}>Solicitar novo link</button>
          </div>
        ) : sucesso ? (
          <div className="recovery-result" role="status" aria-live="polite">
            <FiCheckCircle className="recovery-success-icon" />
            <h1 id="reset-title">Senha alterada</h1>
            <p>Sua senha foi atualizada. Você será encaminhado para entrar na sua conta.</p>
            <button type="button" className="recovery-submit" onClick={() => navigate('/login')}>Ir para o login</button>
          </div>
        ) : (
          <>
            <h1 id="reset-title">Crie uma nova senha</h1>
            <p className="recovery-intro">Escolha uma senha forte para proteger sua conta.</p>
            <form onSubmit={handleSubmit} className="recovery-form">
              {erro && <div className="recovery-error" role="alert">{erro}</div>}
              <label htmlFor="new-password">Nova senha</label>
              <div className="recovery-input-wrap">
                <FiLock aria-hidden="true" />
                <input id="new-password" type={showSenha ? 'text' : 'password'} value={senha} onChange={(event) => setSenha(event.target.value)} autoComplete="new-password" minLength={8} required />
                <button type="button" className="recovery-password-toggle" aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowSenha((visible) => !visible)}>{showSenha ? <FiEyeOff /> : <FiEye />}</button>
              </div>
              <label htmlFor="confirm-password">Confirme a nova senha</label>
              <div className="recovery-input-wrap">
                <FiLock aria-hidden="true" />
                <input id="confirm-password" type={showConfirmar ? 'text' : 'password'} value={confirmarSenha} onChange={(event) => setConfirmarSenha(event.target.value)} autoComplete="new-password" minLength={8} required />
                <button type="button" className="recovery-password-toggle" aria-label={showConfirmar ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowConfirmar((visible) => !visible)}>{showConfirmar ? <FiEyeOff /> : <FiEye />}</button>
              </div>
              <p className="recovery-expiry">Use 8 caracteres ou mais, incluindo maiúscula, minúscula, número e símbolo.</p>
              <button type="submit" className="recovery-submit" disabled={loading}>{loading ? 'Salvando nova senha…' : 'Salvar nova senha'}</button>
            </form>
          </>
        )}
      </section>
      <p className="recovery-footer">© 2026 VetCare · Gestão veterinária</p>
    </main>
  );
}
