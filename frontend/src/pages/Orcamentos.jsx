import React, { useState, useEffect } from "react";
import { 
  FiPlus, FiSearch, FiPrinter, FiEdit2, FiTrash2, 
  FiX, FiCalendar, FiUser, FiFileText, FiDollarSign, 
  FiPlusCircle, FiCheck, FiAlertTriangle 
} from "react-icons/fi";
import { MdOutlinePets } from "react-icons/md";
import { apiGet, apiPost, apiPut, apiDelete } from "../services/api";
import { usePermission } from "../hooks/usePermission";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Pagination from "../components/Pagination";
import "./Orcamentos.css";

export default function Orcamentos() {
  const { can } = usePermission();
  const { clinica } = useAuth();
  const { showToast } = useToast();
  const podeEditar = can("editarOrcamentos");

  // Estados de Controle
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [editId, setEditId] = useState(null);

  // Estados de Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Estados de Dados
  const [orcamentos, setOrcamentos] = useState([]);
  const [animais, setAnimais] = useState([]);
  const [tutores, setTutores] = useState([]);
  const [servicos, setServicos] = useState([]);

  // Estado do Formulário
  const [form, setForm] = useState({
    animal_id: "",
    tutor_nome: "",
    pet_nome: "",
    data_emissao: new Date().toISOString().split('T')[0],
    validade: "10",
    status: "Pendente",
    observacoes: "",
    itens: [] // array de { descricao, quantidade, valor_unitario, total }
  });

  // Estado para adicionar item atual no formulário
  const [atualItem, setAtualItem] = useState({
    servico_id: "",
    descricao: "",
    quantidade: 1,
    valor_unitario: ""
  });

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [orcRes, animaisRes, tutoresRes, servRes] = await Promise.all([
        apiGet("/orcamentos"),
        apiGet("/animais"),
        apiGet("/responsaveis"),
        apiGet("/servicos")
      ]);

      if (orcRes && orcRes.ok) setOrcamentos(await orcRes.json());
      if (animaisRes && animaisRes.ok) setAnimais(await animaisRes.json());
      if (tutoresRes && tutoresRes.ok) setTutores(await tutoresRes.json());
      if (servRes && servRes.ok) {
        const servData = await servRes.json();
        setServicos(Array.isArray(servData) ? servData : []);
      }
    } catch (err) {
      console.error("Erro ao sincronizar dados:", err);
      showToast("Erro ao carregar dados", "error");
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

  // Handlers de Seleção e Formulário
  const handlePetSelect = (petNome) => {
    const animal = animais.find(a => a.nome?.toLowerCase() === petNome?.toLowerCase());
    if (animal) {
      const tutor = tutores.find(t => t.id === animal.responsavel_id);
      setForm(prev => ({ 
        ...prev, 
        pet_nome: animal.nome, 
        animal_id: animal.id,
        tutor_nome: tutor ? tutor.nome : prev.tutor_nome
      }));
    } else {
      setForm(prev => ({ ...prev, pet_nome: petNome, animal_id: "" }));
    }
  };

  const handleTutorSelect = (tutorNome) => {
    const tutor = tutores.find(t => t.nome?.toLowerCase() === tutorNome?.toLowerCase());
    if (tutor) {
      setForm(prev => ({ ...prev, tutor_nome: tutor.nome }));
    } else {
      setForm(prev => ({ ...prev, tutor_nome: tutorNome }));
    }
  };

  const handleServiceSelect = (servicoId) => {
    if (!servicoId) return;
    const serv = servicos.find(s => s.id === parseInt(servicoId));
    if (serv) {
      setAtualItem(prev => ({
        ...prev,
        servico_id: servicoId,
        descricao: serv.nome,
        valor_unitario: serv.precoVenda || "0.00"
      }));
    }
  };

  const handleAddItem = () => {
    if (!atualItem.descricao || !atualItem.quantidade || !atualItem.valor_unitario) {
      showToast("Preencha descrição, quantidade e valor do item.", "warning");
      return;
    }
    const quant = parseInt(atualItem.quantidade) || 1;
    const val = parseFloat(atualItem.valor_unitario) || 0;
    const novoItem = {
      descricao: atualItem.descricao,
      quantidade: quant,
      valor_unitario: val,
      total: quant * val
    };

    setForm(prev => ({
      ...prev,
      itens: [...prev.itens, novoItem]
    }));

    // Limpar item atual
    setAtualItem({
      servico_id: "",
      descricao: "",
      quantidade: 1,
      valor_unitario: ""
    });
  };

  const handleRemoveItem = (index) => {
    setForm(prev => ({
      ...prev,
      itens: prev.itens.filter((_, i) => i !== index)
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const calcularTotalForm = () => {
    return form.itens.reduce((acc, item) => acc + (item.total || 0), 0);
  };

  // Persistência
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.pet_nome || !form.tutor_nome) {
      showToast("Por favor, preencha o nome do Pet e do Tutor.", "warning");
      return;
    }
    if (form.itens.length === 0) {
      showToast("Por favor, adicione pelo menos um item no orçamento.", "warning");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        total: calcularTotalForm()
      };
      
      const url = editId ? `/orcamentos/${editId}` : "/orcamentos";
      const res = editId ? await apiPut(url, payload) : await apiPost(url, payload);
      
      if (res && res.ok) {
        showToast(editId ? "Orçamento atualizado!" : "Orçamento criado!", "success");
        await carregarDados();
        fecharModal();
      } else {
        const error = await res.json();
        showToast(`Erro ao salvar: ${error.error || error.details}`, "error");
      }
    } catch (err) {
      showToast("Falha na comunicação com o servidor.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fecharModal = () => {
    setForm({
      animal_id: "", tutor_nome: "", pet_nome: "",
      data_emissao: new Date().toISOString().split('T')[0],
      validade: "10", status: "Pendente", observacoes: "",
      itens: []
    });
    setAtualItem({
      servico_id: "", descricao: "", quantidade: 1, valor_unitario: ""
    });
    setEditId(null);
    setShowModal(false);
  };

  const abrirEdicao = (orc) => {
    let parsedItens = [];
    try {
      parsedItens = typeof orc.itens === 'string' ? JSON.parse(orc.itens) : orc.itens;
    } catch (e) {
      console.error("Erro ao fazer parse dos itens:", e);
    }

    setForm({
      animal_id: orc.animal_id || "",
      tutor_nome: orc.tutor_nome || "",
      pet_nome: orc.pet_nome || "",
      data_emissao: orc.data_emissao || new Date().toISOString().split('T')[0],
      validade: orc.validade || "10",
      status: orc.status || "Pendente",
      observacoes: orc.observacoes || "",
      itens: parsedItens
    });
    setEditId(orc.id);
    setShowModal(true);
  };

  const deletarOrcamento = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir permanentemente este orçamento?")) {
      try {
        const res = await apiDelete(`/orcamentos/${id}`);
        if (res && res.ok) {
          showToast("Orçamento excluído com sucesso!", "success");
          carregarDados();
        } else {
          showToast("Erro ao excluir orçamento.", "error");
        }
      } catch (err) {
        showToast("Erro de comunicação com o servidor.", "error");
      }
    }
  };

  // PDF Generation
  const gerarPDF = (orc) => {
    let parsedItens = [];
    try {
      parsedItens = typeof orc.itens === 'string' ? JSON.parse(orc.itens) : orc.itens;
    } catch (e) {
      console.error(e);
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Cabeçalho da Clínica
    const clinicaNome = clinica?.nome_clinica || "VET CARE SAÚDE ANIMAL";
    const clinicaCnpj = clinica?.cnpj || "65.993.005/0001-08";
    const clinicaEnd = clinica?.endereco || "Rua do Cuidado, 123 - Centro";
    const clinicaTel = clinica?.telefone || "(11) 99999-9999";
    const clinicaEmail = clinica?.email || "contato@vetcare.com.br";

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(13, 148, 136); // #0d9488 (Primary Dark)
    doc.text(clinicaNome.toUpperCase(), 14, 20);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`CNPJ: ${clinicaCnpj}`, 14, 25);
    doc.text(`Endereço: ${clinicaEnd}`, 14, 30);
    doc.text(`Tel: ${clinicaTel} | Email: ${clinicaEmail}`, 14, 35);

    // Linha divisória
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.line(14, 40, pageWidth - 14, 40);

    // Título do Documento
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // #0f172a
    doc.text("ORÇAMENTO DE SERVIÇOS VETERINÁRIOS", pageWidth / 2, 50, { align: "center" });

    // Informações do Orçamento (Metadados)
    const validadeDias = parseInt(orc.validade) || 10;
    const dataEmissao = new Date(orc.data_emissao);
    const dataValidade = new Date(dataEmissao);
    dataValidade.setDate(dataValidade.getDate() + validadeDias);

    const dataEmissaoFormatada = dataEmissao.toLocaleDateString('pt-BR');
    const dataValidadeFormatada = dataValidade.toLocaleDateString('pt-BR');

    // Caixa de Informações do Cliente/Paciente
    doc.setDrawColor(226, 232, 240); // #e2e8f0
    doc.setFillColor(248, 250, 252); // #f8fafc
    doc.roundedRect(14, 58, pageWidth - 28, 30, 2, 2, "FD");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105); // #475569

    doc.text("DADOS DO CLIENTE / PACIENTE", 18, 64);
    doc.setFont("Helvetica", "normal");
    doc.text(`Tutor Responsável:  ${orc.tutor_nome}`, 18, 70);
    doc.text(`Paciente (Pet):  ${orc.pet_nome}`, 18, 75);
    doc.text(`Situação:  ${orc.status.toUpperCase()}`, 18, 81);

    // Lado Direito da Caixa
    doc.text(`Orçamento Nº:  #00${orc.id}`, pageWidth - 90, 70);
    doc.text(`Data de Emissão:  ${dataEmissaoFormatada}`, pageWidth - 90, 75);
    doc.text(`Válido Até:  ${dataValidadeFormatada} (${validadeDias} dias)`, pageWidth - 90, 81);

    // Tabela de Itens
    const tableBody = parsedItens.map((item, index) => [
      index + 1,
      item.descricao,
      item.quantidade,
      `R$ ${parseFloat(item.valor_unitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `R$ ${parseFloat(item.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: 95,
      head: [['#', 'Descrição do Serviço / Produto', 'Qtd', 'Val. Unitário', 'Subtotal']],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [20, 184, 166], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { width: 10 },
        1: { width: 100 },
        2: { width: 15, halign: 'center' },
        3: { width: 30, halign: 'right' },
        4: { width: 30, halign: 'right' }
      },
      margin: { left: 14, right: 14 }
    });

    const finalY = doc.lastAutoTable.finalY || 130;

    // Resumo Totalizador
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    const totalText = `VALOR TOTAL: R$ ${parseFloat(orc.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    doc.text(totalText, pageWidth - 14, finalY + 12, { align: "right" });

    // Observações
    if (orc.observacoes) {
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text("OBSERVAÇÕES ADICIONAIS:", 14, finalY + 22);

      doc.setFont("Helvetica", "normal");
      doc.setTextColor(100);
      const splitObs = doc.splitTextToSize(orc.observacoes, pageWidth - 28);
      doc.text(splitObs, 14, finalY + 27);
    }

    // Assinaturas (Perto do Rodapé)
    const sigY = pageHeight - 35;
    
    doc.setDrawColor(180);
    doc.setLineWidth(0.5);
    
    // Linha 1 (Clínica)
    doc.line(14, sigY, 90, sigY);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(clinicaNome, 14, sigY + 4);
    doc.text("Assinatura / Carimbo", 14, sigY + 8);

    // Linha 2 (Cliente)
    doc.line(pageWidth - 90, sigY, pageWidth - 14, sigY);
    doc.text(orc.tutor_nome, pageWidth - 90, sigY + 4);
    doc.text("De acordo do Tutor", pageWidth - 90, sigY + 8);

    // Salvar PDF
    doc.save(`Orcamento_${orc.pet_nome.replace(/\s+/g, '_')}_#00${orc.id}.pdf`);
    showToast("PDF gerado com sucesso!", "success");
  };

  // Filtragem
  const orcamentosFiltrados = orcamentos.filter(o =>
    o.tutor_nome?.toLowerCase().includes(busca.toLowerCase()) ||
    o.pet_nome?.toLowerCase().includes(busca.toLowerCase()) ||
    o.id?.toString().includes(busca)
  );

  // Paginação
  const totalPages = Math.ceil(orcamentosFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const itensExibidos = orcamentosFiltrados.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="orcamentos-container fade-in">
      <div className="page-header">
        <div className="header-info">
          <h1 className="page-title">Orçamentos</h1>
          <p className="page-subtitle">Criação e gestão de orçamentos veterinários</p>
        </div>
        <div className="header-actions">
          {podeEditar && (
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <FiPlus /> <span>Novo Orçamento</span>
            </button>
          )}
        </div>
      </div>

      <div className="orcamentos-card">
        <div className="search-section v-glass-panel reveal-up" style={{animationDelay: "0.1s"}}>
          <div className="search-wrapper">
            <FiSearch className="search-icon" />
            <input 
              className="search-input"
              placeholder="Pesquisar por tutor, pet ou nº..." 
              value={busca} 
              onChange={(e) => setBusca(e.target.value)} 
            />
          </div>
        </div>

        {loading && orcamentos.length === 0 ? (
          <div className="loading-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton-card" style={{ height: '150px', background: '#f1f5f9', borderRadius: '14px', animation: 'shimmer 1.5s infinite', margin: '15px' }} />
            ))}
          </div>
        ) : orcamentosFiltrados.length === 0 ? (
          <div className="empty-state">
            <FiFileText size={64} />
            <h3>Nenhum orçamento encontrado</h3>
            <p>Comece criando orçamentos para os tratamentos e serviços de seus clientes.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="orcamentos-table">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Tutor</th>
                  <th>Paciente (Pet)</th>
                  <th>Data</th>
                  <th>Validade</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th style={{ textAlign: "center" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {itensExibidos.map(orc => {
                  const diasValidade = parseInt(orc.validade) || 10;
                  const dataE = new Date(orc.data_emissao);
                  const dataV = new Date(dataE);
                  dataV.setDate(dataV.getDate() + diasValidade);
                  const expirado = new Date() > dataV && orc.status === 'Pendente';

                  return (
                    <tr key={orc.id}>
                      <td className="col-id">#00{orc.id}</td>
                      <td className="col-tutor">{orc.tutor_nome}</td>
                      <td className="col-pet">
                        <span className="pet-badge-wrapper">
                          <MdOutlinePets /> {orc.pet_nome}
                        </span>
                      </td>
                      <td>{new Date(orc.data_emissao).toLocaleDateString('pt-BR')}</td>
                      <td>{orc.validade} dias</td>
                      <td className="col-total">
                        R$ {parseFloat(orc.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span className={`status-badge ${orc.status.toLowerCase()} ${expirado ? 'expirado' : ''}`}>
                          {expirado ? 'Expirado' : orc.status}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button onClick={() => gerarPDF(orc)} className="action-btn print" title="Gerar PDF">
                          <FiPrinter size={15} />
                        </button>
                        {podeEditar && (
                          <>
                            <button onClick={() => abrirEdicao(orc)} className="action-btn edit" title="Editar">
                              <FiEdit2 size={15} />
                            </button>
                            <button onClick={() => deletarOrcamento(orc.id)} className="action-btn delete" title="Excluir">
                              <FiTrash2 size={15} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={orcamentosFiltrados.length}
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
                  <h2>{editId ? "Editar Orçamento" : "Novo Orçamento"}</h2>
                  <p>Preencha os dados e adicione os itens do orçamento</p>
                </div>
              </div>
              <button onClick={fecharModal} className="modal-close"><FiX /></button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-scroll-area">
                <div className="form-section">
                  <h3 className="section-title">Dados Gerais</h3>
                  <div className="form-grid">
                    <div className="input-group">
                      <label>PACIENTE (PET) *</label>
                      <input 
                        list="pets-orc-list"
                        placeholder="Pesquisar ou digitar nome do pet"
                        value={form.pet_nome} 
                        onChange={e => handlePetSelect(e.target.value)} 
                        required 
                      />
                      <datalist id="pets-orc-list">
                        {animais.map(a => <option key={a.id} value={a.nome} />)}
                      </datalist>
                    </div>

                    <div className="input-group">
                      <label>TUTOR *</label>
                      <input 
                        list="tutores-orc-list"
                        placeholder="Nome do responsável"
                        value={form.tutor_nome} 
                        onChange={e => handleTutorSelect(e.target.value)} 
                        required 
                      />
                      <datalist id="tutores-orc-list">
                        {tutores.map(t => <option key={t.id} value={t.nome} />)}
                      </datalist>
                    </div>

                    <div className="input-group">
                      <label>DATA DE EMISSÃO *</label>
                      <input 
                        type="date" 
                        value={form.data_emissao} 
                        onChange={handleChange} 
                        name="data_emissao" 
                        required 
                      />
                    </div>

                    <div className="input-group">
                      <label>VALIDADE (DIAS) *</label>
                      <input 
                        type="number" 
                        value={form.validade} 
                        onChange={handleChange} 
                        name="validade" 
                        required 
                      />
                    </div>

                    <div className="input-group">
                      <label>STATUS *</label>
                      <select name="status" value={form.status} onChange={handleChange} required>
                        <option value="Pendente">Pendente</option>
                        <option value="Aprovado">Aprovado</option>
                        <option value="Recusado">Recusado</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3 className="section-title">Itens do Orçamento</h3>
                  
                  {/* Formulário para Adicionar Item */}
                  <div className="add-item-bar">
                    <div className="item-input-col group-select">
                      <label>Buscar na Tabela de Preços</label>
                      <select 
                        value={atualItem.servico_id} 
                        onChange={e => handleServiceSelect(e.target.value)}
                      >
                        <option value="">-- Selecionar da Tabela (Opcional) --</option>
                        {servicos.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.nome} (R$ {parseFloat(s.precoVenda || 0).toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="item-input-col group-desc">
                      <label>Descrição do Item *</label>
                      <input 
                        type="text" 
                        placeholder="Nome do serviço ou produto" 
                        value={atualItem.descricao}
                        onChange={e => setAtualItem(prev => ({ ...prev, descricao: e.target.value }))}
                      />
                    </div>

                    <div className="item-input-col group-qty">
                      <label>Qtd *</label>
                      <input 
                        type="number" 
                        min="1" 
                        value={atualItem.quantidade}
                        onChange={e => setAtualItem(prev => ({ ...prev, quantidade: parseInt(e.target.value) || 1 }))}
                      />
                    </div>

                    <div className="item-input-col group-price">
                      <label>Preço Unitário (R$) *</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        value={atualItem.valor_unitario}
                        onChange={e => setAtualItem(prev => ({ ...prev, valor_unitario: e.target.value }))}
                      />
                    </div>

                    <button 
                      type="button" 
                      onClick={handleAddItem} 
                      className="btn-add-item"
                      title="Adicionar Item"
                    >
                      <FiPlusCircle size={20} />
                      <span>Adicionar</span>
                    </button>
                  </div>

                  {/* Tabela de Itens Adicionados */}
                  <div className="added-items-table-wrapper">
                    {form.itens.length === 0 ? (
                      <p className="no-items-msg">Nenhum item adicionado ainda. Preencha a barra acima para adicionar.</p>
                    ) : (
                      <table className="added-items-table">
                        <thead>
                          <tr>
                            <th>Descrição</th>
                            <th style={{ textAlign: "center" }}>Qtd</th>
                            <th style={{ textAlign: "right" }}>Valor Unitário</th>
                            <th style={{ textAlign: "right" }}>Total</th>
                            <th style={{ textAlign: "center" }}>Remover</th>
                          </tr>
                        </thead>
                        <tbody>
                          {form.itens.map((item, idx) => (
                            <tr key={idx}>
                              <td>{item.descricao}</td>
                              <td style={{ textAlign: "center" }}>{item.quantidade}</td>
                              <td style={{ textAlign: "right" }}>
                                R$ {parseFloat(item.valor_unitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td style={{ textAlign: "right" }}>
                                R$ {parseFloat(item.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <button 
                                  type="button" 
                                  onClick={() => handleRemoveItem(idx)} 
                                  className="btn-remove-item"
                                  title="Remover Item"
                                >
                                  <FiTrash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                          <tr className="row-totalizer">
                            <td colSpan="3" style={{ textAlign: "right", fontWeight: "700" }}>TOTAL DO ORÇAMENTO:</td>
                            <td style={{ textAlign: "right", fontWeight: "800", color: "var(--primary-dark)" }}>
                              R$ {calcularTotalForm().toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                <div className="form-section">
                  <h3 className="section-title">Observações e Notas</h3>
                  <div className="form-grid full">
                    <div className="input-group">
                      <label>OBSERVAÇÕES DO ORÇAMENTO</label>
                      <textarea 
                        rows="3" 
                        placeholder="Ex: Condições de pagamento, parcelamento, avisos importantes..."
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
                  {loading ? "Salvando..." : (editId ? "Atualizar Orçamento" : "Salvar Orçamento")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
