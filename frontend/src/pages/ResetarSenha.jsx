import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiLock, FiEye, FiEyeOff, FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import { FaPaw } from "react-icons/fa";
import { API_URL } from "../services/api";
import "./ResetarSenha.css";

export default function ResetarSenha() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = new URLSearchParams(location.search).get("token");
  
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro("");
    setSucesso("");

    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem");
      setLoading(false);
      return;
    }

    if (senha.length < 6) {
      setErro("A senha deve ter no mínimo 6 caracteres");
      setLoading(false);
      return;
    }

    if (!token) {
      setErro("Token inválido ou expirado");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/resetar-senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, novaSenha: senha }),
      });

      const data = await response.json();

      if (response.ok) {
        setSucesso("Senha alterada com sucesso! Redirecionando para o login...");
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } else {
        setErro(data.error || "Erro ao alterar senha");
      }
    } catch (error) {
      setErro("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="resetar-container">
        <div className="resetar-card">
          <div className="resetar-header">
            <FaPaw size={48} color="#14b8a6" />
            <h2>Link inválido</h2>
            <p>O link de recuperação é inválido ou expirou.</p>
            <button className="btn-primary" onClick={() => navigate("/login")}>Voltar ao login</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="resetar-container">
      <div className="resetar-card">
        <div className="resetar-header">
          <FaPaw size={48} color="#14b8a6" />
          <h2>Criar nova senha</h2>
          <p>Digite sua nova senha abaixo</p>
        </div>

        <form onSubmit={handleSubmit} className="resetar-form">
          {erro && <div className="error-message"><FiAlertCircle />{erro}</div>}
          {sucesso && <div className="success-message"><FiCheckCircle />{sucesso}</div>}

          <div className="input-field">
            <label>Nova Senha</label>
            <div className="password-wrapper">
              <FiLock className="input-icon" />
              <input type={showSenha ? "text" : "password"} value={senha} onChange={(e) => setSenha(e.target.value)} required />
              <button type="button" onClick={() => setShowSenha(!showSenha)}>{showSenha ? <FiEyeOff /> : <FiEye />}</button>
            </div>
          </div>

          <div className="input-field">
            <label>Confirmar Nova Senha</label>
            <div className="password-wrapper">
              <FiLock className="input-icon" />
              <input type={showConfirmar ? "text" : "password"} value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} required />
              <button type="button" onClick={() => setShowConfirmar(!showConfirmar)}>{showConfirmar ? <FiEyeOff /> : <FiEye />}</button>
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Alterando..." : "Alterar Senha"}
          </button>

          <button type="button" className="btn-secondary" onClick={() => navigate("/login")}>Voltar ao login</button>
        </form>
      </div>
    </div>
  );
}