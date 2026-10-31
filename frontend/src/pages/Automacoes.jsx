import React, { useState, useEffect, useRef } from "react";
import { FiMessageCircle, FiSave, FiSettings, FiCheckCircle, FiClock, FiCalendar, FiGift, FiLogOut, FiRefreshCw } from "react-icons/fi";
import { useToast } from "../hooks/useToast";
import { apiGet, apiPut, apiPost } from "../services/api";
import "./Automacoes.css";

export default function Automacoes() {
  const { showToast, ToastContainer } = useToast();
  const [loading, setLoading] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [gerandoQr, setGerandoQr] = useState(false);
  
  const [statusWpp, setStatusWpp] = useState("DESCONECTADO"); // INICIANDO, AGUARDANDO_LEITURA, CONECTADO, DESCONECTADO
  const [qrCodeImg, setQrCodeImg] = useState(null);
  const [numeroConectado, setNumeroConectado] = useState(null);
  const [progressoConexao, setProgressoConexao] = useState(null);

  const [config, setConfig] = useState({
    ativo: false,
    lembrete_consulta: true,
    lembrete_vacina: true,
    lembrete_aniversario: true,
    mensagem_consulta: "Olá! Este é um lembrete da sua consulta agendada.",
    mensagem_vacina: "Olá! A vacina do seu pet está perto do vencimento.",
    mensagem_aniversario: "Feliz Aniversário!"
  });

  const pollInterval = useRef(null);

  useEffect(() => {
    carregarConfiguracoes();
    checkWppStatus();

    // Iniciar o Polling
    pollInterval.current = setInterval(() => {
      checkWppStatus();
    }, 5000);

    return () => clearInterval(pollInterval.current);
  }, []);

  const carregarConfiguracoes = async () => {
    try {
      const response = await apiGet("/whatsapp/configuracao");
      if (response && response.ok) {
        const data = await response.json();
        setConfig({
          ativo: Boolean(data.ativo),
          lembrete_consulta: Boolean(data.lembrete_consulta),
          lembrete_vacina: Boolean(data.lembrete_vacina),
          lembrete_aniversario: Boolean(data.lembrete_aniversario),
          mensagem_consulta: data.mensagem_consulta || "",
          mensagem_vacina: data.mensagem_vacina || "",
          mensagem_aniversario: data.mensagem_aniversario || ""
        });
      }
    } catch (error) {
      showToast("Erro ao carregar configurações de automação.", "error");
    }
  };

  const checkWppStatus = async () => {
    try {
      const res = await apiGet("/whatsapp/status");
      if (res && res.ok) {
        const data = await res.json();
        setStatusWpp(data.status);
        setNumeroConectado(data.phone || null);
        setProgressoConexao(Number.isFinite(data.progress) ? data.progress : null);
        setQrCodeImg(data.qr || null);
      }
    } catch (err) {
      console.log("Erro ao checar status", err);
    }
  };

  const desconectar = async () => {
    try {
      const response = await apiPost("/whatsapp/desconectar", {});
      const result = response ? await response.json() : {};
      if (!response?.ok || result.success === false) {
        throw new Error(result.error || "Não foi possível desconectar o WhatsApp.");
      }
      showToast("WhatsApp Desconectado.", "success");
      setStatusWpp("DESCONECTADO");
      setQrCodeImg(null);
      setNumeroConectado(null);
      setProgressoConexao(null);
    } catch (err) {
      showToast(err.message || "Erro ao desconectar.", "error");
    }
  };

  const gerarNovoQr = async () => {
    if (gerandoQr) return;
    setGerandoQr(true);
    setQrCodeImg(null);
    setStatusWpp("INICIANDO");
    setProgressoConexao(null);
    try {
      const response = await apiPost("/whatsapp/gerar-qr", {});
      const result = response ? await response.json() : {};
      if (!response?.ok) throw new Error(result.error || "Não foi possível gerar outro QR Code.");
      showToast("Novo QR Code solicitado. Aguarde alguns segundos.", "success");
    } catch (error) {
      showToast(error.message || "Erro ao gerar outro QR Code.", "error");
    } finally {
      setGerandoQr(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSalvo(false);
    
    try {
      const payload = {
        ...config,
        ativo: config.ativo ? 1 : 0,
        lembrete_consulta: config.lembrete_consulta ? 1 : 0,
        lembrete_vacina: config.lembrete_vacina ? 1 : 0,
        lembrete_aniversario: config.lembrete_aniversario ? 1 : 0
      };
      
      const res = await apiPut("/whatsapp/configuracao", payload);
      if (res && res.ok) {
        setSalvo(true);
        showToast("Automações atualizadas com sucesso!", "success");
        setTimeout(() => setSalvo(false), 3000);
      } else {
        showToast("Erro ao salvar automações.", "error");
      }
    } catch (error) {
      showToast("Erro de comunicação com o servidor.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="v-automacoes-container">
      <div className="v-automacoes-header">
        <div>
          <h1><FiMessageCircle /> Automações de WhatsApp</h1>
          <p>Configure disparos automáticos para fidelizar seus clientes e reduzir faltas.</p>
        </div>
      </div>

      <form className="v-automacoes-form" onSubmit={handleSave}>
        
        {/* Seção 1: Conexão QR Code */}
        <div className="v-automacoes-section">
          <h2><FiSettings /> Conexão do WhatsApp</h2>
          <p className="v-automacoes-hint">Conecte o WhatsApp da clínica lendo o QR Code. As mensagens serão enviadas por este número para o telefone do tutor cadastrado no perfil do pet.</p>
          
          <div className="v-automacoes-switch-wrapper">
            <label className="v-switch">
              <input 
                type="checkbox" 
                name="ativo"
                checked={config.ativo}
                onChange={handleChange}
              />
              <span className="v-slider round"></span>
            </label>
            <span style={{ fontWeight: 'bold' }}>
              {config.ativo ? "Automações Ativadas" : "Automações Desativadas"}
            </span>
          </div>

          <div className="qr-code-panel">
            {statusWpp === "CONECTADO" ? (
              <div className="status-conectado">
                <FiCheckCircle size={48} color="#25D366" />
                <h3>WhatsApp Conectado!</h3>
                <p>Mensagens enviadas pelo sistema sairão de {numeroConectado || "este número conectado"}.</p>
                <button type="button" onClick={desconectar} className="btn-desconectar">
                  <FiLogOut /> Desconectar WhatsApp
                </button>
              </div>
            ) : statusWpp === "AGUARDANDO_LEITURA" && qrCodeImg ? (
              <div className="status-qr">
                <h3>Escaneie o QR Code</h3>
                <p>Abra o WhatsApp que deseja usar, acesse Aparelhos conectados e leia este QR Code. Esse será o número remetente do sistema.</p>
                <img src={qrCodeImg} alt="QR Code" className="qr-image" />
              </div>
            ) : statusWpp === "DESCONECTADO" ? (
              <div className="status-desconectado" role="status">
                <FiLogOut size={32} />
                <h3>WhatsApp Desconectado</h3>
                <p>Conecte novamente para receber e enviar mensagens pelo sistema.</p>
              </div>
            ) : statusWpp === "AUTENTICADO" || statusWpp === "SINCRONIZANDO" ? (
              <div className="status-loading" role="status" aria-live="polite">
                <FiRefreshCw className="spin" size={32} />
                <p>{statusWpp === "AUTENTICADO" ? "Sessão reconhecida. Sincronizando WhatsApp..." : "Carregando conversas do WhatsApp..."}</p>
                {progressoConexao !== null && <p className="status-progress">{progressoConexao}%</p>}
              </div>
            ) : statusWpp === "FALHA" ? (
              <div className="status-falha" role="status">
                <FiMessageCircle size={32} />
                <p>Não foi possível iniciar o WhatsApp. Gere outro QR Code para tentar novamente.</p>
              </div>
            ) : (
              <div className="status-loading">
                <FiRefreshCw className="spin" size={32} />
                <p>Gerando QR Code do WhatsApp...</p>
              </div>
            )}
          </div>
          {statusWpp !== "CONECTADO" && (
            <button type="button" className="btn-gerar-qr" onClick={gerarNovoQr} disabled={gerandoQr}>
              <FiRefreshCw className={gerandoQr ? "spin" : ""} />
              {gerandoQr ? "Gerando novo QR Code..." : statusWpp === "DESCONECTADO" ? "Conectar WhatsApp" : "Gerar outro QR Code"}
            </button>
          )}
        </div>

        {/* Seção 2: Gatilhos */}
        <div className="v-automacoes-section">
          <h2><FiClock /> Regras de Disparo</h2>
          
          <div className="v-automacao-card">
            <div className="v-automacao-card-header">
              <label className="v-switch">
                <input 
                  type="checkbox" 
                  name="lembrete_consulta"
                  checked={config.lembrete_consulta}
                  onChange={handleChange}
                />
                <span className="v-slider round"></span>
              </label>
              <div>
                <h3><FiCalendar /> Lembrete de Consulta (1 Dia Antes)</h3>
                <p>Envia uma mensagem no dia anterior avisando o tutor do agendamento.</p>
              </div>
            </div>
            {config.lembrete_consulta && (
              <textarea 
                name="mensagem_consulta"
                value={config.mensagem_consulta}
                onChange={handleChange}
                placeholder="Digite a mensagem padrão..."
                rows={3}
              />
            )}
          </div>

          <div className="v-automacao-card">
            <div className="v-automacao-card-header">
              <label className="v-switch">
                <input 
                  type="checkbox" 
                  name="lembrete_vacina"
                  checked={config.lembrete_vacina}
                  onChange={handleChange}
                />
                <span className="v-slider round"></span>
              </label>
              <div>
                <h3><FiCheckCircle /> Lembrete de Vacina (7 Dias Antes)</h3>
                <p>Avisa o dono que a vacina do pet vai vencer na próxima semana.</p>
              </div>
            </div>
            {config.lembrete_vacina && (
              <textarea 
                name="mensagem_vacina"
                value={config.mensagem_vacina}
                onChange={handleChange}
                placeholder="Digite a mensagem padrão..."
                rows={3}
              />
            )}
          </div>

          <div className="v-automacao-card">
            <div className="v-automacao-card-header">
              <label className="v-switch">
                <input 
                  type="checkbox" 
                  name="lembrete_aniversario"
                  checked={config.lembrete_aniversario}
                  onChange={handleChange}
                />
                <span className="v-slider round"></span>
              </label>
              <div>
                <h3><FiGift /> Lembrete de Aniversário (No dia)</h3>
                <p>Deseja um feliz aniversário automático para o Pet.</p>
              </div>
            </div>
            {config.lembrete_aniversario && (
              <textarea 
                name="mensagem_aniversario"
                value={config.mensagem_aniversario}
                onChange={handleChange}
                placeholder="Digite a mensagem padrão..."
                rows={3}
              />
            )}
          </div>
        </div>

        <button type="submit" className={`v-btn-salvar ${salvo ? 'salvo' : ''}`} disabled={loading}>
          {loading ? "Salvando..." : salvo ? <><FiCheckCircle /> Salvo!</> : <><FiSave /> Salvar Automações</>}
        </button>
      </form>
      <ToastContainer />
    </div>
  );
}
