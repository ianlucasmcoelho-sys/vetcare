import { formatDate } from "../utils/date";
import useQuickCreate from '../hooks/useQuickCreate';
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiPlus, FiSearch, FiEdit2, FiTrash2, FiX, FiUser,
  FiCalendar, FiPackage, FiInfo, FiAlertCircle, FiEye
} from "react-icons/fi";
import { MdOutlinePets } from "react-icons/md";
import { apiGet, apiPost, apiPut, apiDelete } from "../services/api";
import Pagination from "../components/Pagination";
import "./Animais.css";

export default function Animais() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [animais, setAnimais] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);
  const [busca, setBusca] = useState("");
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [idadeModo, setIdadeModo] = useState("nascimento");

  // Estados de Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const initialForm = {
    nome: "",
    microchip: "",
    especie: "",
    raca: "",
    sexo: "",
    nascimento: "",
    idade: "",
    idade_unidade: "anos",
    temperamento: "",
    porte: "",
    pelagem: "",
    castrado: false,
    doencas_cronicas: "",
    responsavel_id: "",
    obito: false,
    data_obito: ""
  };

  const [form, setForm] = useState(initialForm);
  useQuickCreate(context => { setEditId(null); setForm({ ...initialForm, responsavel_id: context.tutor_id || '' }); setShowModal(true); });

  const carregarAnimais = async () => {
    try {
      setLoading(true);
      const res = await apiGet("/animais");
      if (res && res.ok) {
        const data = await res.json();
        setAnimais(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Erro ao carregar animais:", err);
    } finally {
      setLoading(false);
    }
  };

  const carregarResponsaveis = async () => {
    try {
      const res = await apiGet("/responsaveis");
      if (res && res.ok) {
        const data = await res.json();
        setResponsaveis(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Erro ao carregar responsáveis:", err);
    }
  };

  useEffect(() => {
    carregarAnimais();
    carregarResponsaveis();
  }, []);

  // Resetar página ao buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [busca]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    e.target.setCustomValidity("");
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (idadeModo === "nascimento" && !form.nascimento) {
      alert("Informe a data de nascimento ou escolha informar a idade do pet.");
      return;
    }
    if (idadeModo === "idade" && form.idade === "") {
      alert("Informe a idade do pet.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        nascimento: idadeModo === "nascimento" ? form.nascimento : null,
        idade: idadeModo === "idade" ? Number(form.idade) : null,
        idade_unidade: idadeModo === "idade" ? form.idade_unidade : null,
        responsavel_id: Number(form.responsavel_id),
        castrado: form.castrado ? 1 : 0,
        obito: form.obito ? 1 : 0
      };

      const res = editId
        ? await apiPut(`/animais/${editId}`, payload)
        : await apiPost("/animais", payload);

      if (res && res.ok) {
        fecharModal();
        carregarAnimais();
        // Feedback visual poderia ser um Toast aqui
      } else if (res) {
        const errorData = await res.json();
        const details = Array.isArray(errorData.details)
          ? errorData.details.map(detail => detail.message).join("\n")
          : "";
        alert([errorData.error || "Erro ao salvar animal.", details].filter(Boolean).join("\n"));
      }
    } catch (err) {
      alert("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const fecharModal = () => {
    setForm(initialForm);
    setIdadeModo("nascimento");
    setEditId(null);
    setShowModal(false);
  };

  const abrirEdicao = (animal) => {
    setIdadeModo(animal.nascimento ? "nascimento" : animal.idade != null ? "idade" : "nascimento");
    setForm({
      nome: animal.nome || "",
      microchip: animal.microchip || "",
      especie: animal.especie || "",
      raca: animal.raca || "",
      sexo: animal.sexo || "",
      nascimento: animal.nascimento || "",
      idade: animal.idade ?? "",
      idade_unidade: animal.idade_unidade || "anos",
      temperamento: animal.temperamento || "",
      porte: animal.porte || "",
      pelagem: animal.pelagem || "",
      castrado: animal.castrado === 1,
      alergias: animal.alergias || "",
      doencas_cronicas: animal.doencas_cronicas || "",
      responsavel_id: animal.responsavel_id || "",
      obito: animal.obito === 1,
      data_obito: animal.data_obito || ""
    });
    setEditId(animal.id);
    setShowModal(true);
  };

  const deletarAnimal = async (id) => {
    if (window.confirm("Deseja excluir este animal?")) {
      try {
        const res = await apiDelete(`/animais/${id}`);
        if (res && res.ok) {
          carregarAnimais();
        }
      } catch (err) {
        console.error("Erro ao deletar:", err);
      }
    }
  };

  const responsaveisPorId = useMemo(() => new Map(responsaveis.map(r => [String(r.id), r.nome])), [responsaveis]);

  const getResponsavelNome = (id) => {
    if (!id || id === 0 || id === "0") return "Não vinculado";
    return responsaveisPorId.get(String(id)) || "Não vinculado";
  };

  const animaisFiltrados = useMemo(() => animais.filter(a =>
    a.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    a.raca?.toLowerCase().includes(busca.toLowerCase()) ||
    a.especie?.toLowerCase().includes(busca.toLowerCase()) ||
    getResponsavelNome(a.responsavel_id).toLowerCase().includes(busca.toLowerCase())
  ), [animais, responsaveis, busca]);

  // Lógica de Paginação
  const totalPages = Math.ceil(animaisFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const animaisExibidos = animaisFiltrados.slice(startIndex, endIndex);

  return (
    <div className="animais-container reveal-fade">
      <div className="page-header">
        <div className="header-info">
          <h1 className="page-title">Animais</h1>
          <p className="page-subtitle">Gerencie os pacientes da clínica</p>
        </div>
        <div className="header-actions">
          <button className="v-btn-primary-glow" onClick={() => setShowModal(true)}>
            <FiPlus size={18} />
            <span>Novo Animal</span>
          </button>
        </div>
      </div>

      <div className="animais-card reveal-up" style={{animationDelay: '0.1s'}}>
        <div className="search-section v-glass-panel reveal-up" style={{animationDelay: "0.1s"}}>
          <div className="search-wrapper">
            <FiSearch className="search-icon" />
            <input
              className="search-input"
              placeholder="Pesquisar por nome, raça, espécie ou tutor..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            {busca && (
              <button className="search-clear" onClick={() => setBusca("")} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#94a3b8' }}>
                <FiX size={16} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="animais-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton-card" style={{ height: '200px', background: '#f1f5f9', borderRadius: '14px', animation: 'shimmer 1.5s infinite' }} />
            ))}
          </div>
        ) : animaisFiltrados.length === 0 ? (
          <div className="empty-state">
            <MdOutlinePets size={48} />
            <p>Nenhum animal encontrado</p>
            <button className="v-btn-primary-glow" onClick={() => setShowModal(true)}>
              <FiPlus size={16} />
              Cadastrar primeiro animal
            </button>
          </div>
        ) : (
          <>
            <div className="animais-grid">
              {animaisExibidos.map((animal) => {
                const tutorNome = getResponsavelNome(animal.responsavel_id);

                return (
                  <div key={animal.id} className="animal-card-item v-glass-panel" onClick={() => navigate(`/perfil-animal/${animal.id}`)} style={{ cursor: 'pointer', animationDelay: `${0.1 + (0.05 * (animal.id % 10))}s` }}>
                    <div className="animal-card-header">
                      <div className="animal-avatar">
                        <MdOutlinePets size={28} />
                      </div>
                      <div className="animal-info">
                        <h3 className="animal-nome">
                          {animal.nome}
                          {animal.sexo && (
                            <span className={`animal-sexo ${animal.sexo === "M" ? "sexo-m" : "sexo-f"}`}>
                              {animal.sexo === "M" ? "♂" : "♀"}
                            </span>
                          )}
                        </h3>
                        <p className="animal-detalhes">
                          {animal.especie} {animal.raca && `• ${animal.raca}`}
                        </p>
                      </div>
                    </div>

                    <div className="animal-card-body">
                      <div className="info-row">
                        <FiUser className="info-icon" size={14} />
                        <span className="info-label">Tutor:</span>
                        <span className="info-value">{tutorNome}</span>
                      </div>

                      <div className="info-row">
                        <FiCalendar className="info-icon" size={14} />
                        <span className="info-label">{animal.nascimento ? "Nascimento:" : "Idade:"}</span>
                        <span className="info-value">
                          {animal.nascimento
                            ? formatDate(animal.nascimento)
                            : animal.idade !== null && animal.idade !== undefined
                              ? `${animal.idade} ${animal.idade_unidade || "anos"}`
                              : "Não informado"}
                        </span>
                      </div>

                      {animal.microchip && (
                        <div className="info-row">
                          <FiPackage className="info-icon" size={14} />
                          <span className="info-label">Microchip:</span>
                          <span className="info-value">{animal.microchip}</span>
                        </div>
                      )}
                    </div>

                    <div className="animal-card-footer">
                      {animal.obito === 1 && (
                        <span className="badge-obito" style={{ marginRight: '8px', background: '#fee2e2', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>Óbito</span>
                      )}
                      {animal.castrado === 1 && (
                        <span className="badge-castrado" style={{ marginRight: 'auto' }}>Castrado</span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/perfil-animal/${animal.id}`); }}
                        className="action-btn view-btn"
                        title="Ver Perfil"
                      >
                        <FiEye size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); abrirEdicao(animal); }}
                        className="action-btn edit-btn"
                        title="Editar"
                      >
                        <FiEdit2 size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deletarAnimal(animal.id); }}
                        className="action-btn delete-btn"
                        title="Excluir"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={animaisFiltrados.length}
              itemsPerPage={itemsPerPage}
            />
          </>
        )}
      </div>


      {showModal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                <MdOutlinePets size={22} />
                {editId ? "Editar Animal" : "Novo Animal"}
              </h2>
              <button onClick={fecharModal} className="modal-close">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-scroll">
                <div className="form-grid">
                  <h3 className="form-section-title">Informações Básicas</h3>

                  <div className="input-group full-width">
                    <label className="input-label">NOME *</label>
                    <input
                      type="text"
                      name="nome"
                      className="form-input"
                      value={form.nome}
                      onChange={handleChange}
                      placeholder="Nome do animal"
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">ESPÉCIE *</label>
                    <select
                      name="especie"
                      className="form-input"
                      value={form.especie}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Selecione</option>
                      <option value="Cão">Cão</option>
                      <option value="Gato">Gato</option>
                      <option value="Ave">Ave</option>
                      <option value="Roedor">Roedor</option>
                      <option value="Réptil">Réptil</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label">RAÇA</label>
                    <input
                      type="text"
                      name="raca"
                      className="form-input"
                      value={form.raca}
                      onChange={handleChange}
                      placeholder="Raça do animal"
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">SEXO</label>
                    <select
                      name="sexo"
                      className="form-input"
                      value={form.sexo}
                      onChange={handleChange}
                    >
                      <option value="">Selecione</option>
                      <option value="M">Macho</option>
                      <option value="F">Fêmea</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label">TUTOR *</label>
                    <select
                      name="responsavel_id"
                      className="form-input"
                      value={form.responsavel_id}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Selecione o tutor</option>
                      {responsaveis.map(r => (
                        <option key={r.id} value={r.id}>{r.nome}</option>
                      ))}
                    </select>
                  </div>

                  <h3 className="form-section-title">Saúde e Identificação</h3>

                  <div className="input-group full-width">
                    <label className="input-label" htmlFor="idadeModo">COMO INFORMAR A IDADE</label>
                    <select
                      id="idadeModo"
                      className="form-input"
                      value={idadeModo}
                      onChange={(e) => {
                        const modo = e.target.value;
                        setIdadeModo(modo);
                        setForm(prev => ({
                          ...prev,
                          nascimento: modo === "idade" ? "" : prev.nascimento,
                          idade: modo === "nascimento" ? "" : prev.idade
                        }));
                      }}
                    >
                      <option value="nascimento">Data de nascimento</option>
                      <option value="idade">Idade aproximada</option>
                    </select>
                  </div>

                  {idadeModo === "nascimento" ? (
                    <div className="input-group">
                      <label className="input-label">DATA NASCIMENTO</label>
                      <input
                        type="date"
                        name="nascimento"
                        className="form-input"
                        value={form.nascimento}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  ) : (
                    <>
                      <div className="input-group">
                        <label className="input-label" htmlFor="idadePet">IDADE DO PET</label>
                        <input
                          id="idadePet"
                          type="number"
                          name="idade"
                          className="form-input"
                          min="0"
                          step="1"
                          value={form.idade}
                          onChange={handleChange}
                          placeholder="Informe a idade"
                          required
                        />
                      </div>
                      <div className="input-group">
                        <label className="input-label" htmlFor="idadeUnidade">UNIDADE</label>
                        <select
                          id="idadeUnidade"
                          name="idade_unidade"
                          className="form-input"
                          value={form.idade_unidade}
                          onChange={handleChange}
                        >
                          <option value="anos">Anos</option>
                          <option value="meses">Meses</option>
                        </select>
                      </div>
                    </>
                  )}

                  <div className="input-group">
                    <label className="input-label">MICROCHIP</label>
                    <input
                      type="text"
                      name="microchip"
                      className="form-input"
                      value={form.microchip}
                      onChange={handleChange}
                      placeholder="Número do microchip"
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">PORTE</label>
                    <select
                      name="porte"
                      className="form-input"
                      value={form.porte}
                      onChange={handleChange}
                    >
                      <option value="">Selecione</option>
                      <option value="Pequeno">Pequeno</option>
                      <option value="Médio">Médio</option>
                      <option value="Grande">Grande</option>
                    </select>
                  </div>

                  <div className="input-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
                    <input
                      type="checkbox"
                      name="castrado"
                      id="castrado"
                      checked={form.castrado}
                      onChange={handleChange}
                      style={{ width: '18px', height: '18px', accentColor: '#14b8a6' }}
                    />
                    <label htmlFor="castrado" className="input-label" style={{ cursor: 'pointer', margin: 0 }}>Animal Castrado</label>
                  </div>

                  <div className="input-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
                    <input
                      type="checkbox"
                      name="obito"
                      id="obito"
                      checked={form.obito}
                      onChange={handleChange}
                      style={{ width: '18px', height: '18px', accentColor: '#ef4444' }}
                    />
                    <label htmlFor="obito" className="input-label" style={{ cursor: 'pointer', margin: 0 }}>Óbito</label>
                  </div>

                  {form.obito && (
                    <div className="input-group">
                      <label className="input-label">DATA DO ÓBITO</label>
                      <input
                        type="date"
                        name="data_obito"
                        className="form-input"
                        value={form.data_obito}
                        onChange={handleChange}
                      />
                    </div>
                  )}

                  <div className="input-group full-width">
                    <label className="input-label">ALERGIAS / OBSERVAÇÕES</label>
                    <textarea
                      name="alergias"
                      className="form-textarea"
                      rows="3"
                      value={form.alergias}
                      onChange={handleChange}
                      placeholder="Informe alergias ou doenças crônicas..."
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={fecharModal} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="v-btn-primary-glow" disabled={loading}>
                  {loading ? "Salvando..." : (editId ? "Atualizar" : "Salvar Animal")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
