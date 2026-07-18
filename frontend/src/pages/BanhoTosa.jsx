import React, { useState, useEffect } from "react";
import { FiPlus, FiX, FiCheckCircle, FiSearch, FiClock, FiScissors } from "react-icons/fi";
import { MdOutlinePets } from "react-icons/md";
import { apiGet, apiPost, apiPatch, apiDelete } from "../services/api";
import "./BanhoTosa.css";

export default function BanhoTosa() {
  const [registros, setRegistros] = useState([]);
  const [animais, setAnimais] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [busca, setBusca] = useState("");

  const colunas = ["Aguardando", "No Banho", "Secagem", "Finalizado"];

  const [form, setForm] = useState({
    animal_id: "",
    data: new Date().toISOString().split("T")[0],
    horario: "",
    pacote_mensal: false,
    observacoes: ""
  });

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [resBT, resAnim] = await Promise.all([
        apiGet("/banhotosa"),
        apiGet("/animais")
      ]);
      
      if (resBT.ok && resAnim.ok) {
        setRegistros(await resBT.json());
        setAnimais(await resAnim.json());
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await apiPost("/banhotosa", form);
      if (response && response.ok) {
        setShowModal(false);
        resetForm();
        carregarDados();
      } else {
        const error = await response.json();
        alert(error.error || "Erro ao adicionar");
      }
    } catch (err) {
      alert("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      animal_id: "", data: new Date().toISOString().split("T")[0], horario: "", pacote_mensal: false, observacoes: ""
    });
  };

  // Drag and Drop
  const handleDragStart = (e, id) => {
    e.dataTransfer.setData("card_id", id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, novaColuna) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("card_id");
    if (!id) return;

    // Atualiza localmente rápido para UX
    setRegistros(prev => prev.map(r => r.id === parseInt(id) ? { ...r, status: novaColuna } : r));

    try {
      const response = await apiPatch(`/banhotosa/${id}/status`, { status: novaColuna });
      if (!response.ok) {
        // reverte se falhar
        carregarDados();
      }
    } catch (err) {
      carregarDados();
    }
  };

  const removerRegistro = async (id) => {
    if (window.confirm("Deseja excluir este registro do centro estético?")) {
      const res = await apiDelete(`/banhotosa/${id}`);
      if (res.ok) carregarDados();
    }
  };

  const getNomeAnimal = (animalId) => {
    const animal = animais.find(a => a.id === animalId);
    return animal ? animal.nome : "Pet";
  };

  const filtrados = registros.filter(r => getNomeAnimal(r.animal_id).toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="banho-tosa-container reveal-fade">
      <div className="page-header">
        <div className="header-info">
          <h1 className="page-title">Centro Estético</h1>
          <p className="page-subtitle">Controle o fluxo do Banho & Tosa em tempo real</p>
        </div>
        <div className="header-actions">
          <button className="v-btn-primary-glow" onClick={() => setShowModal(true)}>
            <FiPlus size={18} />
            <span>Adicionar Pet à Fila</span>
          </button>
        </div>
      </div>

      <div className="kanban-board">
        {colunas.map((coluna) => (
          <div 
            key={coluna} 
            className="kanban-column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, coluna)}
          >
            <div className="kanban-column-header">
              <h3>{coluna}</h3>
              <span className="kanban-count">
                {filtrados.filter(r => r.status === coluna).length}
              </span>
            </div>
            <div className="kanban-cards">
              {filtrados.filter(r => r.status === coluna).map(r => (
                <div 
                  key={r.id} 
                  className="kanban-card v-glass-panel"
                  draggable
                  onDragStart={(e) => handleDragStart(e, r.id)}
                >
                  <div className="card-header">
                    <h4>{getNomeAnimal(r.animal_id)}</h4>
                    <button className="delete-btn" onClick={() => removerRegistro(r.id)}><FiX /></button>
                  </div>
                  <div className="card-info">
                    <span className="card-horario"><FiClock size={12} /> {r.horario}</span>
                    {r.pacote_mensal === 1 && <span className="card-tag pacote">Pacote</span>}
                  </div>
                  {r.observacoes && <p className="card-obs">{r.observacoes}</p>}
                  
                  {/* Controles para Mobile onde D&D é difícil */}
                  <div className="card-mobile-actions">
                    {colunas.map(c => (
                       c !== coluna && (
                        <button 
                          key={c} 
                          className="move-btn" 
                          onClick={() => handleDrop({preventDefault:()=>{}, dataTransfer:{getData:()=>r.id}}, c)}
                        >
                          → {c}
                        </button>
                       )
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <FiScissors size={24} style={{color: 'var(--primary)'}} />
                <h2>Adicionar à Fila</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="modal-close"><FiX /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid full-width">
                <div className="input-group">
                  <label>PET *</label>
                  <select 
                    className="form-input" 
                    required 
                    value={form.animal_id} 
                    onChange={e => setForm({...form, animal_id: e.target.value})}
                  >
                    <option value="">Selecione o pet...</option>
                    {animais.map(a => (
                      <option key={a.id} value={a.id}>{a.nome}</option>
                    ))}
                  </select>
                </div>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', gridColumn: '1 / -1'}}>
                  <div className="input-group" style={{gridColumn: 'auto'}}>
                    <label>DATA *</label>
                    <input type="date" className="form-input" required value={form.data} onChange={e => setForm({...form, data: e.target.value})} />
                  </div>
                  <div className="input-group" style={{gridColumn: 'auto'}}>
                    <label>HORÁRIO *</label>
                    <input type="time" className="form-input" required value={form.horario} onChange={e => setForm({...form, horario: e.target.value})} />
                  </div>
                </div>
                <div className="input-group checkbox-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={form.pacote_mensal} onChange={e => setForm({...form, pacote_mensal: e.target.checked})} />
                    <span>Faz parte de Pacote Mensal?</span>
                  </label>
                </div>
                <div className="input-group" style={{ gridColumn: "1 / -1" }}>
                  <label>OBSERVAÇÕES (Ex: Tosa higiênica, alergia)</label>
                  <textarea className="form-input" rows="2" value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})}></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="v-btn-primary-glow" disabled={loading}>Adicionar à Fila</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
