import { formatDate } from "../utils/date";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiHome, FiPhone, FiMail, FiFileText, FiClock, FiCalendar, FiUser, FiInfo, FiCheckCircle, FiAlertCircle, FiStar } from "react-icons/fi";
import { usePermission } from "../hooks/usePermission";
import { useToast } from "../hooks/useToast";
import { apiGet, apiPut } from "../services/api";
import "./Configuracoes.css";

export default function Configuracoes() {
  const navigate = useNavigate();
  const { can, isAdmin, perfil } = usePermission();
  const { showToast, ToastContainer } = useToast();
  const [loading, setLoading] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [assinatura, setAssinatura] = useState(null);
  const [config, setConfig] = useState({
    nome_clinica: "VetCare",
    logo: "",
    endereco: "",
    telefone: "",
    email: "",
    cnpj: "",
    crmv: "",
    assinatura_digital: "",
    horario_funcionamento: "08:00 às 18:00",
    dias_funcionamento: "Segunda a Sexta"
  });

  const [meuNome, setMeuNome] = useState(() => {
    const user = JSON.parse(localStorage.getItem('usuario') || '{}');
    return user.nome || '';
  });
  const [savingPerfil, setSavingPerfil] = useState(false);

  const podeEditar = can("editarConfiguracoes");

  const carregarConfiguracoes = async () => {
    try {
      const response = await apiGet("/configuracoes");
      if (response && response.ok) {
        const data = await response.json();
        
        // Normalizar dados para evitar avisos de inputs controlados (null -> "")
        const normalizedData = {
          nome_clinica: data.nome_clinica || "",
          logo: data.logo || "",
          endereco: data.endereco || "",
          telefone: data.telefone || "",
          email: data.email || "",
          cnpj: data.cnpj || "",
          crmv: data.crmv || "",
          assinatura_digital: data.assinatura_digital || "",
          horario_funcionamento: data.horario_funcionamento || "",
          dias_funcionamento: data.dias_funcionamento || ""
        };
        
        setConfig(normalizedData);
        if (data.assinatura) {
          setAssinatura(data.assinatura);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    }
  };

  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!podeEditar) {
      showToast("Você não tem permissão para editar configurações", "error");
      return;
    }
    
    setLoading(true);
    setSalvo(false);
    
    try {
      const response = await apiPut("/configuracoes", config);
      
      if (response && response.ok) {
        setSalvo(true);
        showToast("Configurações salvas com sucesso!", "success");
        setTimeout(() => setSalvo(false), 3000);
      } else {
        showToast("Erro ao salvar configurações", "error");
      }
    } catch (error) {
      showToast("Erro ao conectar com o servidor", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePerfil = async () => {
    if (!meuNome.trim()) {
      showToast("O nome não pode ficar vazio", "error");
      return;
    }
    setSavingPerfil(true);
    try {
      const response = await apiPut('/auth/meu-perfil', { nome: meuNome });
      if (response && response.ok) {
        showToast("Perfil atualizado com sucesso!", "success");
        const user = JSON.parse(localStorage.getItem('usuario') || '{}');
        user.nome = meuNome;
        localStorage.setItem('usuario', JSON.stringify(user));
        window.dispatchEvent(new Event('usuarioAtualizado'));
      } else {
        showToast("Erro ao atualizar perfil", "error");
      }
    } catch (e) {
      showToast("Erro de conexão", "error");
    } finally {
      setSavingPerfil(false);
    }
  };

  return (
    <div className="configuracoes-container">
      <div className="configuracoes-header">
        <h1 className="page-title">Configurações</h1>
        <p className="page-subtitle">Configure os dados da sua clínica</p>
        {!podeEditar && (
          <div className="info-banner">
            <FiAlertCircle />
            <span>Modo de visualização apenas. Apenas administradores podem editar configurações.</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="config-form">
        <div className="config-grid">
          <div className="config-card">
            <h3 className="config-title"><FiUser /> Meu Perfil</h3>
            <div className="form-group">
              <label>Nome do Usuário *</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  value={meuNome} 
                  onChange={(e) => setMeuNome(e.target.value)} 
                  required 
                />
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={handleSavePerfil} 
                  disabled={savingPerfil}
                  style={{ width: 'auto', padding: '0 20px', whiteSpace: 'nowrap' }}
                >
                  {savingPerfil ? "..." : "Atualizar"}
                </button>
              </div>
            </div>
            <div className="info-box" style={{ marginTop: '10px' }}><FiInfo /><span>Este é o seu nome pessoal de acesso.</span></div>
          </div>

          <div className="config-card">
            <h3 className="config-title"><FiHome /> Dados da Clínica</h3>
            <div className="form-group">
              <label>Nome da Clínica *</label>
              <input type="text" name="nome_clinica" value={config.nome_clinica} onChange={handleChange} required disabled={!podeEditar} />
            </div>
            <div className="form-group">
              <label>Endereço</label>
              <input type="text" name="endereco" value={config.endereco || ""} onChange={handleChange} disabled={!podeEditar} />
            </div>
            <div className="form-row">
              <div className="form-group"><label>Telefone</label><input type="text" name="telefone" value={config.telefone || ""} onChange={handleChange} disabled={!podeEditar} /></div>
              <div className="form-group"><label>E-mail</label><input type="email" name="email" value={config.email || ""} onChange={handleChange} disabled={!podeEditar} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>CNPJ</label><input type="text" name="cnpj" value={config.cnpj || ""} onChange={handleChange} disabled={!podeEditar} /></div>
              <div className="form-group"><label>CRMV</label><input type="text" name="crmv" value={config.crmv || ""} onChange={handleChange} disabled={!podeEditar} /></div>
            </div>
          </div>

          <div className="config-card">
            <h3 className="config-title"><FiClock /> Horário de Funcionamento</h3>
            <div className="form-group">
              <label>Horário</label>
              <input type="text" name="horario_funcionamento" value={config.horario_funcionamento} onChange={handleChange} disabled={!podeEditar} />
            </div>
            <div className="form-group">
              <label>Dias de Funcionamento</label>
              <input type="text" name="dias_funcionamento" value={config.dias_funcionamento} onChange={handleChange} disabled={!podeEditar} />
            </div>
          </div>

          <div className="config-card">
            <h3 className="config-title"><FiFileText /> Assinatura Digital</h3>
            <div className="form-group">
              <label>Nome do Responsável</label>
              <input type="text" name="assinatura_digital" value={config.assinatura_digital || ""} onChange={handleChange} disabled={!podeEditar} />
            </div>
            <div className="info-box"><FiInfo /><span>A assinatura digital será usada em prescrições e receituários.</span></div>
          </div>

          {/* NOVO: CARD DE ASSINATURA */}
          {assinatura && (
            <div className="config-card">
              <h3 className="config-title"><FiStar /> Meu Plano</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Plano Atual:</span>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--primary)', textTransform: 'capitalize' }}>
                    {assinatura.plano_id}
                  </strong>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                  <span style={{ 
                    padding: '4px 12px', 
                    borderRadius: '20px', 
                    fontSize: '0.85rem', 
                    fontWeight: 'bold',
                    background: assinatura.status_assinatura === 'ativo' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    color: assinatura.status_assinatura === 'ativo' ? '#10b981' : '#f59e0b',
                    textTransform: 'uppercase'
                  }}>
                    {assinatura.status_assinatura}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Vencimento:</span>
                  <strong style={{ color: 'var(--text-main)' }}>
                    {formatDate(assinatura.data_expiracao)}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Dias Restantes:</span>
                  <strong style={{ color: 'var(--text-main)' }}>
                    {Math.ceil((new Date(assinatura.data_expiracao) - new Date()) / (1000 * 60 * 60 * 24))} dias
                  </strong>
                </div>

                <button 
                  type="button" 
                  className="v-btn-pill-secondary" 
                  style={{ width: '100%', marginTop: '1rem', padding: '0.8rem', display: 'flex', justifyContent: 'center', fontWeight: 'bold' }}
                  onClick={() => navigate('/planos')}
                >
                  Fazer Upgrade ou Alterar Plano
                </button>
              </div>
            </div>
          )}
        </div>

        {podeEditar && (
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              <FiSave /> {loading ? "Salvando..." : "Salvar Configurações"}
            </button>
          </div>
        )}
      </form>

      {config.assinatura_digital && (
        <div className="assinatura-preview">
          <h4>Preview da Assinatura</h4>
          <div className="assinatura-box">
            <p>{config.nome_clinica}</p>
            <p className="assinatura-nome">{config.assinatura_digital}</p>
            <p>CRMV: {config.crmv || "_____"}</p>
          </div>
        </div>
      )}
      <ToastContainer />
    </div>
  );
}