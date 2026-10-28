import useQuickCreate from '../hooks/useQuickCreate';
import { loadPatientContext } from '../services/patientContext';
import React, { useState, useEffect } from "react";
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiFileText, FiCheckCircle, FiClock, FiX } from "react-icons/fi";
import { apiGet, apiPost, apiPut, apiDelete } from "../services/api";
import "./Exames.css";

export default function Exames() {
  const [exames, setExames] = useState([]);
  const [animais, setAnimais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingExame, setEditingExame] = useState(null);
  const [formData, setFormData] = useState({
    animal_id: "",
    tipo_exame: "",
    data_solicitacao: new Date().toISOString().split('T')[0],
    laboratorio: "",
    resultado: "",
    status: "pendente"
  });

  useQuickCreate(async context => { const {animal} = await loadPatientContext(context); if (animal) setFormData(previous => ({...previous, animal_id: String(animal.id)})); setShowModal(true); });

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [examesRes, animaisRes] = await Promise.all([
        apiGet("/exames"),
        apiGet("/animais")
      ]);
      setExames(await examesRes.json());
      setAnimais(await animaisRes.json());
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = editingExame ? await apiPut(`/exames/${editingExame.id}`, formData) : await apiPost("/exames", formData);
      if (!response?.ok) {
        const error = response ? await response.json() : {};
        throw new Error(error.error || 'Não foi possível salvar o exame.');
      }
      setShowModal(false);
      setEditingExame(null);
      setFormData({ animal_id: "", tipo_exame: "", data_solicitacao: new Date().toISOString().split('T')[0], laboratorio: "", resultado: "", status: "pendente" });
      carregarDados();
    } catch (err) {
      console.error("Erro ao salvar exame:", err);
      alert(err.message || "Não foi possível salvar o exame.");
    }
  };

  const handleEdit = (exame) => {
    setEditingExame(exame);
    setFormData({
      animal_id: exame.animal_id,
      tipo_exame: exame.tipo_exame,
      data_solicitacao: exame.data_solicitacao,
      laboratorio: exame.laboratorio || "",
      resultado: exame.resultado || "",
      status: exame.status
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Deseja realmente excluir este exame?")) {
      await apiDelete(`/exames/${id}`);
      carregarDados();
    }
  };

  const examesFiltrados = exames.filter(e => 
    e.tipo_exame.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.animal_nome && e.animal_nome.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="exames-container reveal-fade">
      <div className="page-header">
        <div className="header-info">
          <h1 className="page-title">Exames Laboratoriais</h1>
          <p className="page-subtitle">Gerencie solicitações e resultados de exames</p>
        </div>
        <div className="header-actions">
          <button className="v-btn-primary-glow" onClick={() => setShowModal(true)}>
            <FiPlus /> Novo Exame
          </button>
        </div>
      </div>

      <div className="search-bar v-glass-panel">
        <FiSearch />
        <input 
          type="text" 
          placeholder="Buscar por pet ou tipo de exame..." 
          value={searchTerm}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading">Carregando exames...</div>
      ) : (
        <div className="exames-grid">
          {examesFiltrados.map(exame => (
            <div key={exame.id} className={`exame-card v-glass-panel reveal-up ${exame.status}`} style={{animationDelay: `${0.1 + (0.05 * (exame.id % 10))}s`}}>
              <div className="exame-status-icon">
                {exame.status === 'concluido' ? <FiCheckCircle color="#10b981" /> : <FiClock color="#f59e0b" />}
              </div>
              <div className="exame-info">
                <h3>{exame.tipo_exame}</h3>
                <p><strong>Pet:</strong> {exame.animal_nome}</p>
                <p><strong>Solicitado em:</strong> {new Date(exame.data_solicitacao).toLocaleDateString()}</p>
                <p><strong>Laboratório:</strong> {exame.laboratorio || "Não informado"}</p>
              </div>
              <div className="exame-actions">
                <button onClick={() => handleEdit(exame)} title="Editar"><FiEdit2 /></button>
                <button onClick={() => handleDelete(exame.id)} title="Excluir"><FiTrash2 /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingExame ? "Editar Exame" : "Solicitar Novo Exame"}</h2>
              <button onClick={() => setShowModal(false)} className="modal-close"><FiX /></button>
            </div>

            <form onSubmit={handleSubmit} className="form-scroll">
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Animal</label>
                  <select 
                    value={formData.animal_id} 
                    onChange={(e) => setFormData({...formData, animal_id: e.target.value})}
                    required
                  >
                    <option value="">Selecione o pet</option>
                    {animais.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tipo de Exame</label>
                  <input 
                    type="text" 
                    value={formData.tipo_exame}
                    onChange={(e) => setFormData({...formData, tipo_exame: e.target.value})}
                    placeholder="Ex: Hemograma, Raio-X"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="concluido">Concluído</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Data Solicitação</label>
                  <input 
                    type="date" 
                    value={formData.data_solicitacao}
                    onChange={(e) => setFormData({...formData, data_solicitacao: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Laboratório</label>
                  <input 
                    type="text" 
                    value={formData.laboratorio}
                    onChange={(e) => setFormData({...formData, laboratorio: e.target.value})}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Resultado / Observações</label>
                  <textarea 
                    value={formData.resultado}
                    onChange={(e) => setFormData({...formData, resultado: e.target.value})}
                    rows="3"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="v-btn-primary-glow">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
