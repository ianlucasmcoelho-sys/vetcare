import React, { useState, useEffect } from "react";
import { 
  FiFile, FiUpload, FiTrash2, FiSearch, FiX, FiCheck, 
  FiInfo, FiDownload, FiUser, FiActivity, FiArrowRight,
  FiFileText, FiImage, FiPlus, FiChevronRight
} from "react-icons/fi";
import { MdOutlinePets } from "react-icons/md";
import { apiGet, apiPost, apiDelete, api, API_URL, BASE_URL } from "../services/api";
import "./CentralArquivos.css";

export default function CentralArquivos() {
  const [animais, setAnimais] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [anexos, setAnexos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busca, setBusca] = useState("");

  const carregarAnimais = async () => {
    const res = await apiGet("/animais");
    if (res.ok) setAnimais(await res.json());
  };

  const carregarAnexos = async (animalId) => {
    setLoading(true);
    const res = await apiGet(`/anexos/animal/${animalId}`);
    if (res.ok) setAnexos(await res.json());
    setLoading(false);
  };

  useEffect(() => { carregarAnimais(); }, []);

  const handleSelectPet = (pet) => {
    setSelectedPet(pet);
    carregarAnexos(pet.id);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedPet) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("arquivo", file);
    formData.append("animal_id", selectedPet.id);
    formData.append("categoria", "Exame");

    try {
      const res = await api("/anexos/upload", {
        method: "POST",
        body: formData,
        headers: {} // Deixar o browser definir o multipart boundary
      });

      if (res.ok) {
        carregarAnexos(selectedPet.id);
      }
    } catch (err) {
      console.error("Erro no upload:", err);
    } finally {
      setUploading(false);
    }
  };

  const deletarAnexo = async (id) => {
    if (window.confirm("Deseja excluir este arquivo permanentemente?")) {
      const res = await apiDelete(`/anexos/${id}`);
      if (res.ok) carregarAnexos(selectedPet.id);
    }
  };

  const handleDownload = async (file) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/anexos/download/${file.id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.nome_arquivo;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      }
    } catch (err) {
      console.error("Erro ao baixar arquivo:", err);
    }
  };

  const getFileIcon = (mime) => {
    if (mime?.includes("image")) return <FiImage />;
    if (mime?.includes("pdf")) return <FiFileText />;
    return <FiFile />;
  };

  return (
    <div className="central-arquivos-container fade-in">
      <div className="page-header">
        <div className="header-info">
          <h1 className="page-title">Central de Arquivos</h1>
          <p className="page-subtitle">Prontuário digital: anexe exames, laudos e fotos</p>
        </div>
      </div>

      <div className="central-grid">
        {/* Sidebar de Seleção de Animal */}
        <div className="pet-selection-sidebar">
          <div className="search-box-premium">
            <FiSearch />
            <input 
              placeholder="Buscar paciente..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div className="pet-list-scroll">
            {animais.filter(a => a.nome.toLowerCase().includes(busca.toLowerCase())).map(a => (
              <div 
                key={a.id} 
                className={`pet-item-card ${selectedPet?.id === a.id ? "active" : ""}`}
                onClick={() => handleSelectPet(a)}
              >
                <div className="pet-avatar-mini"><MdOutlinePets /></div>
                <div className="pet-name-info">
                  <strong>{a.nome}</strong>
                  <span>{a.especie}</span>
                </div>
                <FiChevronRight className="arrow" />
              </div>
            ))}
          </div>
        </div>

        {/* Área de Arquivos */}
        <div className="files-display-area">
          {selectedPet ? (
            <>
              <div className="files-header">
                <div className="selected-pet-info">
                  <div className="avatar-large"><MdOutlinePets size={24} /></div>
                  <div>
                    <h2>{selectedPet.nome}</h2>
                    <p>Galeria de Documentos e Exames</p>
                  </div>
                </div>
                <label className="btn-upload-premium">
                  {uploading ? <FiActivity className="spin" /> : <FiPlus />}
                  {uploading ? "Enviando..." : "Anexar Arquivo"}
                  <input type="file" onChange={handleFileUpload} style={{ display: "none" }} disabled={uploading} />
                </label>
              </div>

              {loading ? (
                <div className="files-loading">Carregando galeria...</div>
              ) : anexos.length === 0 ? (
                <div className="empty-files">
                  <FiUpload size={48} />
                  <h3>Sem arquivos anexados</h3>
                  <p>Adicione PDFs de exames ou imagens do paciente.</p>
                </div>
              ) : (
                <div className="anexos-grid">
                  {anexos.map(file => (
                    <div key={file.id} className="anexo-card-premium">
                      <div className="anexo-preview">
                        {file.tipo_mime?.includes("image") ? (
                          <img src={`${BASE_URL}/${file.caminho}`} alt={file.nome_arquivo} />
                        ) : (
                          <div className="file-icon-large">{getFileIcon(file.tipo_mime)}</div>
                        )}
                      </div>
                      <div className="anexo-info">
                        <div className="anexo-main">
                          <strong>{file.nome_arquivo}</strong>
                          <span>{new Date(file.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="anexo-actions">
                          <button onClick={() => handleDownload(file)} className="btn-download-file">
                            <FiDownload />
                          </button>
                          <button onClick={() => deletarAnexo(file.id)} className="btn-delete-file">
                            <FiTrash2 />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="no-pet-selected">
              <FiUser size={64} />
              <h3>Selecione um paciente à esquerda</h3>
              <p>Escolha um animal para gerenciar seu histórico de documentos.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
