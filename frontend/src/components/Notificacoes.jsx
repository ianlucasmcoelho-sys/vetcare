import React, { useState, useEffect } from "react";
import { 
  FiBell, FiX, FiCalendar, FiAlertCircle,
  FiPackage, FiActivity
} from "react-icons/fi";
import { MdOutlineVaccines } from "react-icons/md";
import { apiGet } from "../services/api";
import "./Notificacoes.css";

export default function Notificacoes({ isOpen, onClose }) {
  const [notificacoes, setNotificacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  const carregarNotificacoes = async () => {
    setLoading(true);
    try {
      const response = await apiGet("/notificacoes");
      if (response && response.ok) {
        const data = await response.json();
        
        const notificacoesComIcones = data.map(notif => {
          let icone = <FiBell size={18} />;
          let cor = "#64748b";
          
          switch (notif.tipo) {
            case "vacina":
              icone = <MdOutlineVaccines size={18} />;
              cor = "#f59e0b";
              break;
            case "vacina_vencida":
              icone = <FiAlertCircle size={18} />;
              cor = "#ef4444";
              break;
            case "retorno":
              icone = <FiActivity size={18} />;
              cor = "#f59e0b";
              break;
            case "consulta":
              icone = <FiCalendar size={18} />;
              cor = "#14b8a6";
              break;
            case "estoque":
              icone = <FiPackage size={18} />;
              cor = "#f59e0b";
              break;
            default:
              icone = <FiBell size={18} />;
              cor = "#64748b";
          }
          
          return { ...notif, icone, cor };
        });
        
        const lidasStorage = JSON.parse(localStorage.getItem("notificacoes_lidas") || "[]");
        const notificacoesComStatus = notificacoesComIcones.map(n => ({
          ...n,
          lida: lidasStorage.includes(n.id)
        }));
        
        setNotificacoes(notificacoesComStatus);

        // Sincronizar contagem com a TopBar
        const count = notificacoesComStatus.filter(n => !n.lida).length;
        window.dispatchEvent(new CustomEvent('notificacoesAtualizadas', { detail: count }));
      }
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) carregarNotificacoes();
  }, [isOpen]);

  const marcarComoLida = (id) => {
    const lidasStorage = JSON.parse(localStorage.getItem("notificacoes_lidas") || "[]");
    if (!lidasStorage.includes(id)) {
      lidasStorage.push(id);
      localStorage.setItem("notificacoes_lidas", JSON.stringify(lidasStorage));
      
      setNotificacoes(prev => prev.map(n => 
        n.id === id ? { ...n, lida: true } : n
      ));
      
      const novasNaoLidas = notificacoes.filter(n => n.id !== id && !n.lida).length;
      localStorage.setItem("notificacoes_naoLidas", novasNaoLidas);
      window.dispatchEvent(new CustomEvent('notificacoesAtualizadas', { detail: novasNaoLidas }));
    }
  };

  const marcarTodasComoLidas = () => {
    const todosIds = notificacoes.map(n => n.id);
    localStorage.setItem("notificacoes_lidas", JSON.stringify(todosIds));
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
    localStorage.setItem("notificacoes_naoLidas", 0);
    window.dispatchEvent(new CustomEvent('notificacoesAtualizadas', { detail: 0 }));
  };

  const naoLidasCount = notificacoes.filter(n => !n.lida).length;

  return (
    <div className={`notificacoes-dropdown ${isOpen ? "open" : ""}`}>
      <div className="notificacoes-header">
        <h3>Notificações {naoLidasCount > 0 && `(${naoLidasCount})`}</h3>
        {notificacoes.length > 0 && (
          <button className="marcar-todas" onClick={marcarTodasComoLidas}>
            Marcar todas como lidas
          </button>
        )}
        <button className="close-btn" onClick={onClose}>
          <FiX size={18} />
        </button>
      </div>
      
      <div className="notificacoes-list">
        {loading ? (
          <div className="notificacao-loading">Carregando...</div>
        ) : notificacoes.length === 0 ? (
          <div className="notificacao-vazia">
            <FiBell size={32} />
            <p>Nenhuma notificação</p>
          </div>
        ) : (
          notificacoes.map(notif => (
            <div 
              key={notif.id} 
              className={`notificacao-item ${!notif.lida ? "nao-lida" : "lida"}`}
              onClick={() => marcarComoLida(notif.id)}
            >
              <div className="notificacao-icon" style={{ backgroundColor: `${notif.cor}15`, color: notif.cor }}>
                {notif.icone}
              </div>
              <div className="notificacao-conteudo">
                <div className="notificacao-titulo">{notif.titulo}</div>
                <div className="notificacao-mensagem">{notif.mensagem}</div>
                <div className="notificacao-data">{notif.data}</div>
              </div>
              {!notif.lida && <div className="notificacao-badge"></div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
