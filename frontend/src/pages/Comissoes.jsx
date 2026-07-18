import React, { useState, useEffect } from "react";
import { FiPercent, FiDollarSign, FiCheckSquare, FiSave } from "react-icons/fi";
import { apiGet, apiPost } from "../services/api";
import { useToast } from "../hooks/useToast";
import "./Comissoes.css";

export default function Comissoes() {
  const { showToast, ToastContainer } = useToast();
  const [activeTab, setActiveTab] = useState("regras");
  const [usuarios, setUsuarios] = useState([]);
  const [regras, setRegras] = useState([]);
  const [comissoes, setComissoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selecionados, setSelecionados] = useState([]);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resUsers, resRegras, resComissoes] = await Promise.all([
        apiGet("/auth/usuarios"),
        apiGet("/comissoes/regras"),
        apiGet("/comissoes")
      ]);

      if (resUsers?.ok) {
        const users = await resUsers.json();
        setUsuarios(users.filter(u => u.perfil === "veterinario" && u.ativo));
      }
      if (resRegras?.ok) {
        setRegras(await resRegras.json());
      }
      if (resComissoes?.ok) {
        setComissoes(await resComissoes.json());
      }
    } catch (error) {
      console.error(error);
      showToast("Erro ao carregar dados", "error");
    }
    setLoading(false);
  };

  const handleSalvarRegra = async (usuarioId, tipo, valor) => {
    try {
      const res = await apiPost("/comissoes/regras", { usuario_id: usuarioId, tipo_comissao: tipo, valor: Number(valor) });
      if (res?.ok) {
        showToast("Regra salva com sucesso!", "success");
        carregarDados();
      } else {
        showToast("Erro ao salvar regra", "error");
      }
    } catch (error) {
      showToast("Erro de conexão", "error");
    }
  };

  const handleToggleSelect = (id) => {
    setSelecionados(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handlePagar = async () => {
    if (selecionados.length === 0) return;
    if (!window.confirm(`Deseja pagar ${selecionados.length} comissões selecionadas?`)) return;

    try {
      const res = await apiPost("/comissoes/pagar", { comissao_ids: selecionados, gerar_saida: true });
      if (res?.ok) {
        showToast("Comissões pagas com sucesso!", "success");
        setSelecionados([]);
        carregarDados();
      } else {
        showToast("Erro ao pagar comissões", "error");
      }
    } catch (error) {
      showToast("Erro de conexão", "error");
    }
  };

  const getRegraDoUsuario = (usuarioId) => regras.find(r => r.usuario_id === usuarioId);

  const formatarValor = (valor) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(valor || 0);

  const totalSelecionado = comissoes
    .filter(c => selecionados.includes(c.id))
    .reduce((acc, c) => acc + c.valor_comissao, 0);

  return (
    <div className="comissoes-container">
      <div className="page-header">
        <div className="header-info">
          <h1 className="page-title">Comissões</h1>
          <p className="page-subtitle">Gerencie o repasse e regras de comissionamento de profissionais</p>
        </div>
      </div>

      <div className="comissoes-tabs">
        <button className={`tab-btn ${activeTab === 'regras' ? 'active' : ''}`} onClick={() => setActiveTab('regras')}>
          <FiPercent /> Regras de Comissão
        </button>
        <button className={`tab-btn ${activeTab === 'extrato' ? 'active' : ''}`} onClick={() => setActiveTab('extrato')}>
          <FiCheckSquare /> Extrato / Fechamento
        </button>
      </div>

      <div className="comissoes-card">
        {loading ? (
          activeTab === 'regras' ? (
            <div className="regras-grid">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton-card" style={{ height: '200px', background: 'var(--bg-primary)', borderRadius: '12px', animation: 'shimmer 1.5s infinite' }} />
              ))}
            </div>
          ) : (
            <div className="comissoes-table-wrapper" style={{ padding: '16px' }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton-card" style={{ height: '45px', background: 'var(--bg-primary)', borderRadius: '8px', animation: 'shimmer 1.5s infinite', marginBottom: '12px' }} />
              ))}
            </div>
          )
        ) : activeTab === 'regras' ? (
          <div className="regras-grid">
            {usuarios.map(user => {
              const regra = getRegraDoUsuario(user.id);
              return (
                <RegraCard 
                  key={user.id} 
                  usuario={user} 
                  regra={regra} 
                  onSave={handleSalvarRegra} 
                />
              );
            })}
            {usuarios.length === 0 && <p style={{ color: "var(--text-muted)" }}>Nenhum veterinário cadastrado e ativo.</p>}
          </div>
        ) : (
          <div>
            {selecionados.length > 0 && (
              <div className="pagar-bar reveal-up">
                <span className="total-selecionado">Total Selecionado: <strong>R$ {formatarValor(totalSelecionado)}</strong></span>
                <button className="btn-primary" onClick={handlePagar}>
                  <FiDollarSign /> Pagar Comissões
                </button>
              </div>
            )}
            
            <div className="comissoes-table-wrapper">
              <table className="comissoes-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input 
                        type="checkbox" 
                        onChange={(e) => {
                          const pendentes = comissoes.filter(c => c.status === 'pendente').map(c => c.id);
                          setSelecionados(e.target.checked ? pendentes : []);
                        }}
                        checked={selecionados.length > 0 && selecionados.length === comissoes.filter(c => c.status === 'pendente').length}
                      />
                    </th>
                    <th>Profissional</th>
                    <th>Serviço / Referência</th>
                    <th>Data</th>
                    <th>Valor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {comissoes.length === 0 ? (
                    <tr><td colSpan="6" style={{textAlign:'center', padding:'20px'}}>Nenhuma comissão registrada.</td></tr>
                  ) : comissoes.map(c => (
                    <tr key={c.id}>
                      <td>
                        {c.status === 'pendente' && (
                          <input 
                            type="checkbox" 
                            checked={selecionados.includes(c.id)}
                            onChange={() => handleToggleSelect(c.id)}
                          />
                        )}
                      </td>
                      <td>{c.veterinario_nome}</td>
                      <td>{c.servico_descricao}</td>
                      <td>{new Date(c.data_venda).toLocaleDateString()}</td>
                      <td>R$ {formatarValor(c.valor_comissao)}</td>
                      <td>
                        <span className={`status-badge status-${c.status}`}>{c.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <ToastContainer />
    </div>
  );
}

function RegraCard({ usuario, regra, onSave }) {
  const [tipo, setTipo] = useState(regra ? regra.tipo_comissao : 'percentual');
  const [valor, setValor] = useState(regra ? regra.valor : '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(usuario.id, tipo, valor);
  };

  return (
    <div className="regra-card">
      <div className="regra-header">
        <div className="regra-avatar"><FiDollarSign /></div>
        <div className="regra-info">
          <h3>{usuario.nome}</h3>
          <p>{usuario.email}</p>
        </div>
      </div>
      <form className="regra-form" onSubmit={handleSubmit}>
        <select className="form-input" value={tipo} onChange={e => setTipo(e.target.value)}>
          <option value="percentual">Porcentagem (%)</option>
          <option value="fixo">Valor Fixo (R$)</option>
        </select>
        <input 
          type="number" 
          step="0.01" 
          className="form-input" 
          placeholder={tipo === 'percentual' ? 'Ex: 30' : 'Ex: 50.00'}
          value={valor}
          onChange={e => setValor(e.target.value)}
          required
        />
        <button type="submit" className="btn-primary" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <FiSave /> Salvar
        </button>
      </form>
    </div>
  );
}
