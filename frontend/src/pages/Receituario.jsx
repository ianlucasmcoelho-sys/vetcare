import { loadPatientContext } from '../services/patientContext';
import useQuickCreate from '../hooks/useQuickCreate';
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FiPlus, FiPrinter, FiSearch, FiTrash2, FiEdit2, FiFileText, 
  FiUser, FiCalendar, FiActivity, FiX, FiSave
} from "react-icons/fi";
import { MdOutlinePets } from "react-icons/md";
import { apiGet, apiPost, apiPut, apiDelete } from "../services/api";
import { useToast } from "../context/ToastContext";
import { usePermission } from "../hooks/usePermission";
import { useAuth } from "../context/AuthContext";
import DocumentPreview from "../components/DocumentPreview";
import Pagination from "../components/Pagination";
import "./Receituario.css";

export default function Receituario() {
  const navigate = useNavigate();
  const { clinica } = useAuth();
  const { can } = usePermission();
  const podeEditar = can("editarReceituario");
  const { showToast } = useToast();
  
  const [receitas, setReceitas] = useState([]);
  const [animais, setAnimais] = useState([]);
  const [tutores, setTutores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);

  // Estados de Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Preview State
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [template, setTemplate] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    animal_id: "",
    tutor_id: "",
    data_emissao: new Date().toISOString().split('T')[0],
    medicamentos: "",
    posologia: "",
    observacoes: "",
    validade: "30",
    medico_responsavel: "",
    crmv: ""
  });

  useEffect(() => {
    carregarDados();
    carregarTemplate();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [resRec, resAnim, resTut] = await Promise.all([
        apiGet("/receituario"),
        apiGet("/animais"),
        apiGet("/responsaveis")
      ]);

      if (resRec.ok) setReceitas(await resRec.json());
      if (resAnim.ok) setAnimais(await resAnim.json());
      if (resTut.ok) setTutores(await resTut.json());
    } catch (error) {
      showToast("Erro ao carregar dados", "error");
    } finally {
      setLoading(false);
    }
  };

  const carregarTemplate = async () => {
    try {
      const res = await apiGet("/templates/ativo/receituario");
      if (res.ok) {
        setTemplate(await res.json());
      }
    } catch (error) {
      console.error("Erro ao carregar template:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      if (name === "animal_id" && value) {
        const animal = animais.find(a => a.id === parseInt(value));
        if (animal && animal.responsavel_id) {
          newData.tutor_id = animal.responsavel_id;
        }
      }
      
      return newData;
    });
  };

  const abrirNovo = async (context = {}) => {
    const { animal, tutor } = await loadPatientContext(context);
    setEditando(null);
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    setFormData({
      animal_id: animal ? String(animal.id) : "",
      tutor_id: tutor ? String(tutor.id) : "",
      data_emissao: new Date().toISOString().split('T')[0],
      medicamentos: "",
      posologia: "",
      observacoes: "",
      validade: "30",
      medico_responsavel: usuario.nome || "",
      crmv: clinica?.crmv || ""
    });
    setShowModal(true);
  };

  useQuickCreate(abrirNovo, podeEditar);

  const abrirEdicao = (receita) => {
    setEditando(receita.id);
    setFormData({
      animal_id: receita.animal_id,
      tutor_id: receita.tutor_id,
      data_emissao: receita.data_emissao,
      medicamentos: receita.medicamentos,
      posologia: receita.posologia,
      observacoes: receita.observacoes || "",
      validade: receita.validade || "30",
      medico_responsavel: receita.medico_responsavel,
      crmv: receita.crmv || ""
    });
    setShowModal(true);
  };

  const salvarReceita = async (e) => {
    e.preventDefault();
    try {
      const res = editando 
        ? await apiPut(`/receituario/${editando}`, formData)
        : await apiPost("/receituario", formData);

      if (res.ok) {
        showToast(editando ? "Receita atualizada!" : "Receita criada!", "success");
        setShowModal(false);
        carregarDados();
      } else {
        const error = await res.json();
        showToast(error.error || "Erro ao salvar", "error");
      }
    } catch (error) {
      showToast("Erro de conexão", "error");
    }
  };

  const deletarReceita = async (id) => {
    if (!window.confirm("Deseja realmente excluir esta receita?")) return;
    try {
      const res = await apiDelete(`/receituario/${id}`);
      if (res.ok) {
        showToast("Receita excluída!", "success");
        carregarDados();
      }
    } catch (error) {
      showToast("Erro ao excluir", "error");
    }
  };

  const handlePreview = (receita) => {
    const animal = animais.find(a => a.id === receita.animal_id);
    const tutor = tutores.find(t => t.id === receita.tutor_id);
    
    const dados = {
      ...receita,
      pet_nome: animal?.nome,
      pet_especie: animal?.especie,
      pet_raca: animal?.raca,
      tutor_nome: tutor?.nome,
      clinica_nome: clinica?.nome_clinica || "Sistema Vet Care",
      clinica_endereco: clinica?.endereco || "",
      clinica_telefone: clinica?.telefone || "",
      clinica_email: clinica?.email || "",
      veterinario: receita.medico_responsavel,
      crmv: receita.crmv
    };

    setPreviewData(dados);
    setShowPreview(true);
  };

  // Resetar página ao buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [busca]);

  const receitasFiltradas = receitas.filter(r =>
    r.medico_responsavel?.toLowerCase().includes(busca.toLowerCase()) ||
    animais.find(a => a.id === r.animal_id)?.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    tutores.find(t => t.id === r.tutor_id)?.nome?.toLowerCase().includes(busca.toLowerCase())
  );

  // Lógica de Paginação
  const totalPages = Math.ceil(receitasFiltradas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const receitasExibidas = receitasFiltradas.slice(startIndex, endIndex);

  return (
    <div className="receituario-container reveal-fade">
      <div className="page-header">
        <div className="header-info">
          <h1 className="page-title">Receituário</h1>
          <p className="page-subtitle">Gestão de prescrições e orientações médicas</p>
        </div>
        <div className="header-actions">
          <button className="v-btn-primary-glow" onClick={abrirNovo}>
            <FiPlus size={18} /> Nova Receita
          </button>
        </div>
      </div>

      <div className="receituario-card reveal-up" style={{animationDelay: '0.1s'}}>
        <div className="filters-section v-glass-panel reveal-up" style={{animationDelay: "0.1s"}}>
          <div className="search-wrapper">
            <FiSearch className="search-icon" />
            <input 
              className="search-input"
              type="text" 
              placeholder="Buscar por paciente, tutor ou médico..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton-card" style={{ height: '200px', background: '#f1f5f9', borderRadius: '14px', animation: 'shimmer 1.5s infinite', margin: '20px' }} />
            ))}
          </div>
        ) : (
          <>
            <div className="receitas-grid">
              {receitasFiltradas.length === 0 ? (
                <div className="empty-state">
                  <FiFileText size={48} />
                  <p>Nenhuma receita encontrada</p>
                </div>
              ) : (
                receitasExibidas.map(r => {
                  const animal = animais.find(a => a.id === r.animal_id);
                  const tutor = tutores.find(t => t.id === r.tutor_id);

                  return (
                    <div key={r.id} className="receita-card-item v-glass-panel fade-in" style={{animationDelay: `${0.1 + (0.05 * (r.id % 10))}s`}}>
                      <div className="receita-card-header">
                        <div className="receita-avatar">
                          <FiFileText size={24} />
                        </div>
                        <div className="receita-info">
                          <h3 className="receita-nome">{animal?.nome || "Paciente"}</h3>
                          <p className="receita-tutor"><FiUser size={12} /> {tutor?.nome || "Tutor"}</p>
                        </div>
                        <div className="receita-date-badge">
                          {new Date(r.data_emissao).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="receita-card-body">
                        <div className="prescricao-preview">
                          <label>Medicamentos:</label>
                          <p>{r.medicamentos?.substring(0, 100)}{r.medicamentos?.length > 100 ? "..." : ""}</p>     
                        </div>
                        <div className="medico-footer">
                          <div className="medico-info-mini">
                            <FiActivity size={14} />
                            <span>{r.medico_responsavel}</span>
                          </div>
                        </div>
                      </div>

                      <div className="receita-card-footer">
                        <div className="action-buttons">
                          <button className="action-btn-print" onClick={() => handlePreview(r)}>
                            <FiPrinter size={14} /> Imprimir / PDF
                          </button>
                        </div>
                        <div className="action-icons">
                          <button className="action-icon" onClick={() => navigate(`/perfil-animal/${r.animal_id}`)} title="Ver Pet">
                            <MdOutlinePets size={16} />
                          </button>
                          {podeEditar && (
                            <>
                              <button className="action-icon" onClick={() => abrirEdicao(r)} title="Editar">      
                                <FiEdit2 size={14} />
                              </button>
                              <button className="action-icon delete-btn" onClick={() => deletarReceita(r.id)} title="Excluir">
                                <FiTrash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {receitasFiltradas.length > 0 && (
              <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={receitasFiltradas.length}
                itemsPerPage={itemsPerPage}
              />
            )}
          </>
        )}
      </div>

      {showPreview && template && (
        <DocumentPreview 
          html={template.conteudo_html}
          css={template.conteudo_css}
          dados={previewData}
          onClose={() => setShowPreview(false)}
        />
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title"><FiFileText size={22} /> {editando ? "Editar Receita" : "Nova Receita"}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <FiX size={20} />
              </button>
            </div>
            
            <form onSubmit={salvarReceita} className="modal-form">
              <div className="form-scroll">
                <div className="form-grid">
                  <h3 className="form-section-title">Dados do Paciente</h3>
                  <div className="input-group">
                    <label className="input-label">Paciente *</label>
                    <select 
                      name="animal_id" 
                      className="form-input"
                      value={formData.animal_id} 
                      onChange={handleInputChange} 
                      required
                    >
                      <option value="">Selecione o Animal</option>
                      {animais.map(a => (
                        <option key={a.id} value={a.id}>{a.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Tutor *</label>
                    <select 
                      name="tutor_id" 
                      className="form-input"
                      value={formData.tutor_id} 
                      onChange={handleInputChange} 
                      required
                    >
                      <option value="">Selecione o Tutor</option>
                      {tutores.map(t => (
                        <option key={t.id} value={t.id}>{t.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Data de Emissão *</label>
                    <input 
                      type="date" 
                      name="data_emissao" 
                      className="form-input"
                      value={formData.data_emissao} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Validade (Dias)</label>
                    <input 
                      type="number" 
                      name="validade" 
                      className="form-input"
                      value={formData.validade} 
                      onChange={handleInputChange} 
                    />
                  </div>

                  <h3 className="form-section-title">Prescrição</h3>
                  <div className="input-group full-width">
                    <label className="input-label">Medicamentos *</label>
                    <textarea 
                      name="medicamentos" 
                      className="form-input"
                      value={formData.medicamentos} 
                      onChange={handleInputChange} 
                      placeholder="Ex: Amoxicilina 250mg..."
                      required
                      rows="3"
                    ></textarea>
                  </div>
                  <div className="input-group full-width">
                    <label className="input-label">Posologia / Instruções *</label>
                    <textarea 
                      name="posologia" 
                      className="form-input"
                      value={formData.posologia} 
                      onChange={handleInputChange} 
                      placeholder="Ex: Dar 1 comprimido a cada 12 horas..."
                      required
                      rows="3"
                    ></textarea>
                  </div>
                  <div className="input-group full-width">
                    <label className="input-label">Observações Adicionais</label>
                    <textarea 
                      name="observacoes" 
                      className="form-input"
                      value={formData.observacoes} 
                      onChange={handleInputChange} 
                      rows="2"
                    ></textarea>
                  </div>

                  <h3 className="form-section-title">Responsável</h3>
                  <div className="input-group">
                    <label className="input-label">Médico Veterinário *</label>
                    <input 
                      type="text" 
                      name="medico_responsavel" 
                      className="form-input"
                      value={formData.medico_responsavel} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">CRMV</label>
                    <input 
                      type="text" 
                      name="crmv" 
                      className="form-input"
                      value={formData.crmv} 
                      onChange={handleInputChange} 
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="v-btn-primary-glow">
                  <FiSave /> {editando ? "Atualizar" : "Salvar Receita"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
