import React, { useState, useEffect } from "react";
import { 
  FiFileText, FiPlus, FiSearch, FiPrinter, FiX, FiCheck, 
  FiInfo, FiDownload, FiUser, FiActivity, FiArrowRight 
} from "react-icons/fi";
import { MdOutlinePets } from "react-icons/md";
import { apiGet } from "../services/api";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "./Documentos.css";

export default function Documentos() {
  const [animais, setAnimais] = useState([]);
  const [tutores, setTutores] = useState([]);
  const [config, setConfig] = useState(null);
  const [busca, setBusca] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedPet, setSelectedPet] = useState(null);
  const [selectedTermo, setSelectedTermo] = useState(null);
  const [loading, setLoading] = useState(true);

  const modelos = [
    { 
      id: "internacao", 
      titulo: "Termo de Internação", 
      desc: "Autorização para cuidados hospitalares e monitoramento.",
      conteudo: "Eu, [tutor_nome], proprietário do animal [pet_nome], espécie [pet_especie], autorizo a internação do referido paciente na clínica [clinica_nome] para tratamento médico. Estou ciente dos riscos e custos envolvidos."
    },
    { 
      id: "cirurgia", 
      titulo: "Autorização Cirúrgica", 
      desc: "Consentimento para procedimentos anestésicos e cirúrgicos.",
      conteudo: "Declaro estar ciente da necessidade de procedimento cirúrgico em [pet_nome]. Autorizo a equipe médica da [clinica_nome] a realizar as intervenções necessárias e a administração de anestesia."
    },
    { 
      id: "saude", 
      titulo: "Atestado de Saúde", 
      desc: "Certificado oficial de boas condições físicas para viagens ou eventos.",
      conteudo: "Atesto para os devidos fins que o animal [pet_nome], de propriedade de [tutor_nome], foi examinado nesta data e encontra-se em perfeitas condições de saúde e apto para transporte."
    },
    { 
      id: "eutanasia", 
      titulo: "Autorização de Eutanásia", 
      desc: "Documento jurídico sensível para procedimentos humanitários.",
      conteudo: "Após ser informado sobre o estado clínico irreversível de [pet_nome], autorizo a realização do procedimento de eutanásia humanitária, visando cessar o sofrimento do paciente."
    }
  ];

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [animRes, tutRes, confRes] = await Promise.all([
        apiGet("/animais"),
        apiGet("/responsaveis"),
        apiGet("/configuracoes")
      ]);
      if (animRes.ok) setAnimais(await animRes.json());
      if (tutRes.ok) setTutores(await tutRes.json());
      if (confRes.ok) setConfig(await confRes.json());
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, []);

  const handleGerarDoc = (modelo) => {
    setSelectedTermo(modelo);
    setShowModal(true);
  };

  const processarTexto = (texto, pet, tutor) => {
    if (!texto) return "";
    return texto
      .replace(/\[pet_nome\]/g, pet?.nome || "__________")
      .replace(/\[pet_especie\]/g, pet?.especie || "__________")
      .replace(/\[tutor_nome\]/g, tutor?.nome || "__________")
      .replace(/\[clinica_nome\]/g, config?.nome_clinica || "VetCare");
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const pet = selectedPet;
    const tutor = tutores.find(t => t.id === pet.responsavel_id);
    const textoFinal = processarTexto(selectedTermo.conteudo, pet, tutor);

    // Cabeçalho Premium
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text(config?.nome_clinica || "VetCare", 20, 20);
    doc.setFontSize(10);
    doc.text(`${config?.endereco || ""} | Fone: ${config?.telefone || ""}`, 20, 30);

    // Corpo
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(16);
    doc.text(selectedTermo.titulo.toUpperCase(), 105, 60, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    const splitText = doc.splitTextToSize(textoFinal, 170);
    doc.text(splitText, 20, 80);

    // Dados do Animal
    doc.autoTable({
      startY: 120,
      head: [['Informações do Paciente', 'Dados do Responsável']],
      body: [
        [`Nome: ${pet.nome}\nEspécie: ${pet.especie}\nRaça: ${pet.raca}`, `Nome: ${tutor?.nome}\nCPF: ${tutor?.cpf}\nCelular: ${tutor?.celular}`]
      ],
      theme: 'striped',
      headStyles: { fillColor: [20, 184, 166] } // Teal
    });

    // Assinaturas
    const finalY = doc.lastAutoTable.finalY + 40;
    doc.line(20, finalY, 90, finalY);
    doc.text("Assinatura do Tutor", 35, finalY + 10);
    
    doc.line(120, finalY, 190, finalY);
    doc.text("Médico Veterinário", 135, finalY + 10);

    // Rodapé
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Documento gerado automaticamente pelo VetCare em ${new Date().toLocaleString()}`, 105, 285, { align: "center" });

    doc.save(`${selectedTermo.id}_${pet.nome}.pdf`);
    setShowModal(false);
  };

  return (
    <div className="docs-container fade-in">
      <div className="page-header">
        <div className="header-info">
          <h1 className="page-title">Centro de Documentos</h1>
          <p className="page-subtitle">Gere termos jurídicos e atestados pré-preenchidos</p>
        </div>
      </div>

      <div className="docs-grid">
        <div className="modelos-sidebar">
          <h3 className="section-title">Modelos Disponíveis</h3>
          {modelos.map(m => (
            <div key={m.id} className="modelo-card-item" onClick={() => handleGerarDoc(m)}>
              <div className="modelo-icon"><FiFileText /></div>
              <div className="modelo-info">
                <h4>{m.titulo}</h4>
                <p>{m.desc}</p>
              </div>
              <FiArrowRight className="arrow" />
            </div>
          ))}
        </div>

        <div className="docs-preview-area">
          <div className="preview-card-empty">
            <FiPrinter size={48} />
            <h3>Selecione um modelo à esquerda</h3>
            <p>Os documentos serão preenchidos automaticamente com os dados da clínica e do paciente.</p>
          </div>
        </div>
      </div>

      {showModal && selectedTermo && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content doc-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title"><FiPrinter /> Gerar {selectedTermo.titulo}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><FiX /></button>
            </div>

            <div className="form-scroll">
              <div className="doc-step">
                <span className="step-num">1</span>
                <label className="input-label">SELECIONE O PACIENTE (PET)</label>
                <div className="search-box-doc">
                  <FiSearch />
                  <input 
                    list="pets-list" 
                    placeholder="Comece a digitar o nome do animal..." 
                    onChange={e => {
                      const pet = animais.find(a => a.nome === e.target.value);
                      if (pet) setSelectedPet(pet);
                    }}
                  />
                  <datalist id="pets-list">
                    {animais.map(a => <option key={a.id} value={a.nome}>{a.especie}</option>)}
                  </datalist>
                </div>
              </div>

              {selectedPet && (
                <div className="doc-summary-box fade-in">
                  <div className="summary-item">
                    <MdOutlinePets /> <strong>Pet:</strong> {selectedPet.nome} ({selectedPet.especie})
                  </div>
                  <div className="summary-item">
                    <FiUser /> <strong>Tutor:</strong> {tutores.find(t => t.id === selectedPet.responsavel_id)?.nome || "Não encontrado"}
                  </div>
                </div>
              )}

              <div className="doc-preview-text">
                <label className="input-label">CONTEÚDO DO DOCUMENTO</label>
                <div className="text-box">
                  {processarTexto(selectedTermo.conteudo, selectedPet, tutores.find(t => t.id === selectedPet?.responsavel_id))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button 
                className="btn-primary" 
                onClick={downloadPDF}
                disabled={!selectedPet}
              >
                <FiDownload /> Baixar PDF Profissional
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
