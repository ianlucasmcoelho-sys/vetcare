import React, { useState, useEffect } from "react";
import { 
  FiPlus, FiSearch, FiPrinter, FiEdit2, FiTrash2, 
  FiX, FiCalendar, FiUser, FiActivity, FiFileText, 
  FiInfo, FiThermometer, FiBarChart 
} from "react-icons/fi";
import { MdOutlinePets } from "react-icons/md";
import { apiGet, apiPost, apiPut, apiDelete } from "../services/api";
import { usePermission } from "../hooks/usePermission";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Pagination from "../components/Pagination";
import "./HistoricoMedico.css";

export default function Prontuarios() {
  const { can } = usePermission();
  const podeEditar = can("editarProntuarios");
  
  // Estados de Controle
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [editId, setEditId] = useState(null);
  const [animalSelecionado, setAnimalSelecionado] = useState(null);
  
  // Estados de Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Estados de Dados
  const [prontuarios, setProntuarios] = useState([]);
  const [animais, setAnimais] = useState([]);
  const [veterinarios, setVeterinarios] = useState([]);

  // Estado do Formulário (Alinhado com o Banco de Dados)
  const [form, setForm] = useState({
    animal_id: "",
    pet_nome: "",
    tutor_nome: "",
    veterinario: "",
    veterinario_id: "",
    data_visita: new Date().toISOString().split('T')[0],
    peso: "",
    temperatura: "",
    proxima_visita: "",
    sintomas: "",
    diagnostico: "",
    tratamento: "",
    prescricoes: "",
    observacoes: ""
  });

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [prontRes, animaisRes] = await Promise.all([
        apiGet("/prontuarios"),
        apiGet("/animais")
      ]);

      if (prontRes.ok) setProntuarios(await prontRes.json());
      if (animaisRes.ok) setAnimais(await animaisRes.json());

      // Carregar veterinários (Admin/Recepcionista geralmente têm acesso)
      try {
        const usersRes = await apiGet("/auth/usuarios");
        if (usersRes && usersRes.ok) {
          const usersData = await usersRes.json();
          setVeterinarios(usersData.filter(u => u.perfil === 'veterinario' || u.perfil === 'admin'));
        }
      } catch (e) {
        console.warn("Acesso limitado à lista de veterinários");
      }
    } catch (err) {
      console.error("Erro ao sincronizar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Resetar página ao buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [busca]);

  // Handlers de Seleção e Busca
  const handlePetSelect = async (petNome) => {
    const animal = animais.find(a => a.nome === petNome);
    if (animal) {
      setForm(prev => ({ 
        ...prev, 
        pet_nome: animal.nome, 
        animal_id: animal.id 
      }));
      
      // Buscar tutor vinculado
      if (animal.responsavel_id) {
        const res = await apiGet(`/responsaveis/${animal.responsavel_id}`);
        if (res && res.ok) {
          const tutor = await res.json();
          setForm(prev => ({ ...prev, tutor_nome: tutor.nome }));
        }
      }
    } else {
      setForm(prev => ({ ...prev, pet_nome: petNome, animal_id: "" }));
    }
  };

  const handleVetSelect = (vetNome) => {
    const vet = veterinarios.find(v => v.nome === vetNome);
    if (vet) {
      setForm(prev => ({ ...prev, veterinario: vet.nome, veterinario_id: vet.id }));
    } else {
      setForm(prev => ({ ...prev, veterinario: vetNome, veterinario_id: "" }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Persistência
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.pet_nome || !form.tutor_nome) {
      alert("Por favor, preencha o nome do Pet e do Tutor.");
      return;
    }

    setLoading(true);
    try {
      const url = editId ? `/prontuarios/${editId}` : "/prontuarios";
      const res = editId ? await apiPut(url, form) : await apiPost(url, form);
      
      if (res && res.ok) {
        await carregarDados();
        fecharModal();
      } else {
        const error = await res.json();
        alert(`Erro ao salvar: ${error.details || error.error}`);
      }
    } catch (err) {
      alert("Falha na comunicação com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const fecharModal = () => {
    setForm({
      animal_id: "", pet_nome: "", tutor_nome: "", veterinario: "", veterinario_id: "",
      data_visita: new Date().toISOString().split('T')[0],
      peso: "", temperatura: "", proxima_visita: "",
      sintomas: "", diagnostico: "", tratamento: "", prescricoes: "", observacoes: ""
    });
    setEditId(null);
    setShowModal(false);
  };

  const abrirEdicao = (pront) => {
    setForm({ ...pront });
    setEditId(pront.id);
    setShowModal(true);
  };

  const deletarProntuario = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir permanentemente este prontuário?")) {
      const res = await apiDelete(`/prontuarios/${id}`);
      if (res && res.ok) carregarDados();
    }
  };

  const gerarPDF = (pront) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.setTextColor(44, 62, 80);
    doc.text("HISTÓRICO MÉDICO VETERINÁRIO", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`VetCare SaaS - Registro de Atendimento Clínico`, pageWidth / 2, 28, { align: "center" });

    // Tabela de Dados do Paciente
    autoTable(doc, {
      startY: 40,
      head: [['IDENTIFICAÇÃO DO PACIENTE', 'VALOR']],
      body: [
        ['NOME DO PET', pront.pet_nome],
        ['TUTOR RESPONSÁVEL', pront.tutor_nome],
        ['DATA DO ATENDIMENTO', pront.data_visita],
        ['MÉDICO VETERINÁRIO', pront.veterinario || "N/A"],
        ['PESO', pront.peso ? `${pront.peso} kg` : "N/A"],
        ['TEMPERATURA', pront.temperatura ? `${pront.temperatura} °C` : "N/A"],
      ],
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94] }
    });

    // Tabela de Evolução Clínica
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['DETALHAMENTO CLÍNICO', '']],
      body: [
        ['SINTOMAS / QUEIXAS', pront.sintomas || "Nenhum relato"],
        ['DIAGNÓSTICO', pront.diagnostico || "Em investigação"],
        ['CONDUTA / TRATAMENTO', pront.tratamento || "Não informado"],
        ['PRESCRIÇÕES (MEDICAÇÃO)', pront.prescricoes || "Nenhuma"],
        ['OBSERVAÇÕES ADICIONAIS', pront.observacoes || "Nenhuma"],
        ['RETORNO PREVISTO', pront.proxima_visita || "Não agendado"],
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: { 0: { fontStyle: 'bold', width: 50 } }
    });

    doc.save(`Prontuario_${pront.pet_nome}_${pront.data_visita}.pdf`);
  };

  // Filtragem e Agrupamento
  const prontuariosFiltrados = prontuarios.filter(p =>
    p.pet_nome?.toLowerCase().includes(busca.toLowerCase()) ||
    p.diagnostico?.toLowerCase().includes(busca.toLowerCase()) ||
    p.tutor_nome?.toLowerCase().includes(busca.toLowerCase())
  );

  // Agrupar animais que possuem prontuário
  const animaisComProntuario = animais.filter(a => 
    prontuarios.some(p => p.animal_id === a.id) || 
    prontuarios.some(p => p.pet_nome.toLowerCase() === a.nome.toLowerCase())
  );

  const listaAnimaisFiltrada = animaisComProntuario.filter(a =>
    a.nome.toLowerCase().includes(busca.toLowerCase())
  );

  // Lógica de Paginação (Geral ou por Animal)
  const dadosParaExibir = animalSelecionado 
    ? prontuariosFiltrados.filter(p => p.animal_id === animalSelecionado.id || p.pet_nome.toLowerCase() === animalSelecionado.nome.toLowerCase())
    : listaAnimaisFiltrada;

  const totalPages = Math.ceil(dadosParaExibir.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const itensExibidos = dadosParaExibir.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="prontuario-container fade-in">
      <div className="page-header">
        <div className="header-info">
          {animalSelecionado ? (
            <button className="back-link-btn" onClick={() => setAnimalSelecionado(null)}>
              <FiX /> <span>Prontuários / {animalSelecionado.nome}</span>
            </button>
          ) : (
            <>
              <h1 className="page-title">Prontuários Médicos</h1>
              <p className="page-subtitle">Histórico clínico organizado por paciente</p>
            </>
          )}
        </div>
        <div className="header-actions">
          {podeEditar && (
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <FiPlus /> <span>Novo Atendimento</span>
            </button>
          )}
        </div>
      </div>

      <div className="prontuario-card">
        {!animalSelecionado && (
          <div className="search-section">
            <div className="search-wrapper">
              <FiSearch className="search-icon" />
              <input 
                className="search-input"
                placeholder="Pesquisar por nome do animal..." 
                value={busca} 
                onChange={(e) => setBusca(e.target.value)} 
              />
            </div>
          </div>
        )}

        {loading && prontuarios.length === 0 ? (
          <div className="loading-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton-card" style={{ height: '180px', background: '#f1f5f9', borderRadius: '14px', animation: 'shimmer 1.5s infinite', margin: '20px' }} />
            ))}
          </div>
        ) : dadosParaExibir.length === 0 ? (
          <div className="empty-state">
            <FiFileText size={64} />
            <h3>Nenhum prontuário encontrado</h3>
            <p>Comece registrando um novo atendimento para seus pacientes.</p>
          </div>
        ) : !animalSelecionado ? (
          // LISTA DE ANIMAIS (PADRÃO DO SISTEMA)
          <div className="animais-grid">
            {itensExibidos.map(animal => (
              <div key={animal.id} className="animal-card-item" onClick={() => setAnimalSelecionado(animal)} style={{ cursor: 'pointer' }}>
                <div className="animal-card-header">
                  <div className="animal-avatar">
                    <MdOutlinePets />
                  </div>
                  <div className="animal-info">
                    <h3 className="animal-nome">{animal.nome}</h3>
                    <span className="badge-categoria">{animal.especie} • {animal.raca}</span>
                  </div>
                </div>
                <div className="animal-card-body">
                  <div className="info-row">
                    <FiActivity size={14} />
                    <span className="info-label">Atendimentos:</span>
                    <span className="info-value">{prontuarios.filter(p => p.animal_id === animal.id || p.pet_nome.toLowerCase() === animal.nome.toLowerCase()).length} registros</span>
                  </div>
                  <div className="info-row">
                    <FiCalendar size={14} />
                    <span className="info-label">Última Visita:</span>
                    <span className="info-value">
                      {prontuarios.filter(p => p.animal_id === animal.id || p.pet_nome.toLowerCase() === animal.nome.toLowerCase()).sort((a,b) => new Date(b.data_visita) - new Date(a.data_visita))[0]?.data_visita || "N/A"}
                    </span>
                  </div>
                </div>
                <div className="animal-card-footer">
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary)' }}>VER HISTÓRICO COMPLETO</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // LISTA DE REGISTROS DO ANIMAL (PADRONIZADO)
          <div className="records-list">
            {itensExibidos.map((p) => (
              <div key={p.id} className="prontuario-card-item fade-in">
                <div className="prontuario-card-header">
                  <div className="prontuario-info">
                    <h3 className="prontuario-nome">Visita em {new Date(p.data_visita).toLocaleDateString()}</h3>
                    <div className="prontuario-tags">
                      <span className="tag-tutor"><FiUser size={12} /> Dr(a). {p.veterinario}</span>
                    </div>
                  </div>
                  <div className="prontuario-header-actions">
                    <button onClick={() => gerarPDF(p)} className="action-icon" title="Baixar PDF">
                      <FiPrinter size={14} />
                    </button>
                    {podeEditar && (
                      <>
                        <button onClick={() => abrirEdicao(p)} className="action-icon" title="Editar">
                          <FiEdit2 size={14} />
                        </button>
                        <button onClick={() => deletarProntuario(p.id)} className="action-icon delete-btn" title="Excluir">
                          <FiTrash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="prontuario-card-body">
                  <div className="medical-grid">
                    <div className="medical-info-box warning">
                      <label><FiActivity /> DIAGNÓSTICO</label>
                      <p>{p.diagnostico || "Não concluído"}</p>
                    </div>
                    <div className="medical-info-box">
                      <label><FiInfo /> SINTOMAS</label>
                      <p>{p.sintomas || "Nenhum informado"}</p>
                    </div>
                    <div className="medical-info-box info">
                      <label><FiFileText /> TRATAMENTO</label>
                      <p>{p.tratamento || "Não informado"}</p>
                    </div>
                    <div className="medical-info-box success">
                      <label><FiFileText /> PRESCRIÇÕES</label>
                      <p>{p.prescricoes || "Nenhuma medicação registrada"}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={dadosParaExibir.length}
            itemsPerPage={itemsPerPage}
          />
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrapper">
                <FiFileText className="title-icon" />
                <div>
                  <h2>{editId ? "Editar Atendimento" : "Novo Atendimento"}</h2>
                  <p>Preencha os dados clínicos do paciente</p>
                </div>
              </div>
              <button onClick={fecharModal} className="modal-close"><FiX /></button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-scroll-area">
                <div className="form-section">
                  <h3 className="section-title">Dados Básicos</h3>
                  <div className="form-grid">
                    <div className="input-group">
                      <label>NOME DO PET *</label>
                      <input 
                        list="pets-list"
                        placeholder="Pesquisar ou digitar nome"
                        value={form.pet_nome} 
                        onChange={e => handlePetSelect(e.target.value)} 
                        required 
                      />
                      <datalist id="pets-list">
                        {animais.map(a => <option key={a.id} value={a.nome} />)}
                      </datalist>
                    </div>

                    <div className="input-group">
                      <label>TUTOR *</label>
                      <input 
                        placeholder="Nome do responsável"
                        value={form.tutor_nome} 
                        onChange={handleChange} 
                        name="tutor_nome" 
                        required 
                      />
                    </div>

                    <div className="input-group">
                      <label>MÉDICO VETERINÁRIO</label>
                      <input 
                        list="vets-list"
                        placeholder="Selecionar profissional"
                        value={form.veterinario} 
                        onChange={e => handleVetSelect(e.target.value)} 
                        name="veterinario" 
                      />
                      <datalist id="vets-list">
                        {veterinarios.map(v => <option key={v.id} value={v.nome} />)}
                      </datalist>
                    </div>

                    <div className="input-group">
                      <label>DATA DA VISITA *</label>
                      <input 
                        type="date" 
                        value={form.data_visita} 
                        onChange={handleChange} 
                        name="data_visita" 
                        required 
                      />
                    </div>

                    <div className="input-group small">
                      <label>PESO (KG)</label>
                      <input 
                        type="number" step="0.1"
                        placeholder="0.0"
                        value={form.peso} 
                        onChange={handleChange} 
                        name="peso" 
                      />
                    </div>

                    <div className="input-group small">
                      <label>TEMP. (°C)</label>
                      <input 
                        type="number" step="0.1"
                        placeholder="38.5"
                        value={form.temperatura} 
                        onChange={handleChange} 
                        name="temperatura" 
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3 className="section-title">Evolução Clínica</h3>
                  <div className="form-grid full">
                    <div className="input-group">
                      <label>SINTOMAS / QUEIXA PRINCIPAL</label>
                      <textarea 
                        rows="2" 
                        placeholder="Relato do tutor e observações iniciais..."
                        value={form.sintomas} 
                        onChange={handleChange} 
                        name="sintomas" 
                      />
                    </div>

                    <div className="input-group">
                      <label>DIAGNÓSTICO</label>
                      <textarea 
                        rows="2" 
                        placeholder="Conclusão ou suspeita clínica..."
                        value={form.diagnostico} 
                        onChange={handleChange} 
                        name="diagnostico" 
                      />
                    </div>

                    <div className="input-group">
                      <label>TRATAMENTO REALIZADO</label>
                      <textarea 
                        rows="2" 
                        placeholder="Procedimentos, exames solicitados e conduta..."
                        value={form.tratamento} 
                        onChange={handleChange} 
                        name="tratamento" 
                      />
                    </div>

                    <div className="input-group highlight">
                      <label>PRESCRIÇÕES (PARA O TUTOR)</label>
                      <textarea 
                        rows="3" 
                        placeholder="Receituário: Medicamentos, doses e horários..."
                        value={form.prescricoes} 
                        onChange={handleChange} 
                        name="prescricoes" 
                      />
                    </div>

                    <div className="input-group half">
                      <label>PRÓXIMA VISITA</label>
                      <input 
                        type="date" 
                        value={form.proxima_visita} 
                        onChange={handleChange} 
                        name="proxima_visita" 
                      />
                    </div>

                    <div className="input-group">
                      <label>OBSERVAÇÕES INTERNAS</label>
                      <textarea 
                        rows="2" 
                        placeholder="Notas adicionais não visíveis na prescrição principal..."
                        value={form.observacoes} 
                        onChange={handleChange} 
                        name="observacoes" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={fecharModal} className="btn-cancel">Cancelar</button>
                <button type="submit" className="btn-save" disabled={loading}>
                  {loading ? "Processando..." : (editId ? "Atualizar Histórico" : "Salvar Atendimento")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
