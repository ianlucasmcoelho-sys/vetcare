import React, { useState, useEffect } from "react";
import { FiUser, FiMail, FiLock, FiSave, FiAlertCircle, FiCheckCircle, FiRefreshCw } from "react-icons/fi";
import { apiPut } from "../services/api";
import { useToast } from "../hooks/useToast";
import "./MeuPerfil.css";

export default function MeuPerfil() {
  const { showToast, ToastContainer } = useToast();
  const [loading, setLoading] = useState(false);
  const [usuario, setUsuario] = useState(null);
  
  const [dadosForm, setDadosForm] = useState({
    nome: "",
    email: ""
  });

  const [senhaForm, setSenhaForm] = useState({
    senhaAtual: "",
    novaSenha: "",
    confirmarSenha: ""
  });

  useEffect(() => {
    const userStr = localStorage.getItem("usuario");
    if (userStr) {
      const user = JSON.parse(userStr);
      setUsuario(user);
      setDadosForm({
        nome: user.nome || "",
        email: user.email || ""
      });
    }
  }, []);

  const handleDadosChange = (e) => {
    const { name, value } = e.target;
    setDadosForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSenhaChange = (e) => {
    const { name, value } = e.target;
    setSenhaForm(prev => ({ ...prev, [name]: value }));
  };

  const atualizarDados = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiPut(`/auth/usuarios/${usuario?.id}`, {
        ...dadosForm,
        perfil: usuario?.perfil,
        ativo: 1
      });

      if (res && res.ok) {
        const novosDados = { ...usuario, ...dadosForm };
        localStorage.setItem("usuario", JSON.stringify(novosDados));
        setUsuario(novosDados);
        showToast("Dados atualizados com sucesso!", "success");
      } else {
        showToast("Erro ao atualizar dados.", "error");
      }
    } catch (err) {
      showToast("Erro de conexão.", "error");
    }
    setLoading(false);
  };

  const alterarSenha = async (e) => {
    e.preventDefault();
    if (senhaForm.novaSenha !== senhaForm.confirmarSenha) {
      showToast("As senhas não coincidem!", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await apiPut(`/auth/usuarios/${usuario?.id}/senha`, {
        senhaAtual: senhaForm.senhaAtual,
        novaSenha: senhaForm.novaSenha
      });

      if (res && res.ok) {
        showToast("Senha alterada com sucesso!", "success");
        setSenhaForm({ senhaAtual: "", novaSenha: "", confirmarSenha: "" });
      } else {
        const error = await res.json();
        showToast(error.error || "Erro ao alterar senha.", "error");
      }
    } catch (err) {
      showToast("Erro de conexão.", "error");
    }
    setLoading(false);
  };

  return (
    <div className="meuperfil-container fade-in">
      <div className="page-header">
        <div className="header-info">
          <h1 className="page-title">Meu Perfil</h1>
          <p className="page-subtitle">Gerencie suas informações pessoais e segurança da conta</p>
        </div>
      </div>

      <div className="meuperfil-grid">
        {/* Card de Dados Pessoais */}
        <div className="perfil-card">
          <div className="card-header-perfil">
            <FiUser />
            <h3>Dados Pessoais</h3>
          </div>
          <form className="perfil-form" onSubmit={atualizarDados}>
            <div className="form-group">
              <label>Nome Completo</label>
              <input 
                type="text" 
                name="nome" 
                value={dadosForm.nome} 
                onChange={handleDadosChange}
                required 
              />
            </div>
            <div className="form-group">
              <label>E-mail</label>
              <input 
                type="email" 
                name="email" 
                value={dadosForm.email} 
                onChange={handleDadosChange}
                required 
              />
            </div>
            <div className="form-group">
              <label>Perfil de Acesso</label>
              <input type="text" value={usuario?.perfil?.toUpperCase() || ""} disabled className="input-disabled" />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              <FiSave /> {loading ? "Salvando..." : "Salvar Alterações"}
            </button>
          </form>
        </div>

        {/* Card de Alterar Senha */}
        <div className="perfil-card">
          <div className="card-header-perfil">
            <FiLock />
            <h3>Segurança e Senha</h3>
          </div>
          <form className="perfil-form" onSubmit={alterarSenha}>
            <div className="form-group">
              <label>Senha Atual</label>
              <input 
                type="password" 
                name="senhaAtual" 
                value={senhaForm.senhaAtual} 
                onChange={handleSenhaChange}
                required 
              />
            </div>
            <div className="form-group">
              <label>Nova Senha</label>
              <input 
                type="password" 
                name="novaSenha" 
                value={senhaForm.novaSenha} 
                onChange={handleSenhaChange}
                required 
                minLength="6"
              />
            </div>
            <div className="form-group">
              <label>Confirmar Nova Senha</label>
              <input 
                type="password" 
                name="confirmarSenha" 
                value={senhaForm.confirmarSenha} 
                onChange={handleSenhaChange}
                required 
              />
            </div>
            <button type="submit" className="btn-outline" disabled={loading}>
              <FiRefreshCw /> {loading ? "Alterando..." : "Alterar Senha"}
            </button>
          </form>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
