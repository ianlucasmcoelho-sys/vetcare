import { formatDate } from "../utils/date";
import React, { useState, useEffect } from "react";
import { 
  FiFile, FiUpload, FiTrash2, FiSearch, FiX, FiCheck, 
  FiInfo, FiDownload, FiUser, FiActivity, FiArrowRight,
  FiFileText, FiImage, FiPlus, FiChevronRight
} from "react-icons/fi";
import { MdOutlinePets } from "react-icons/md";
import { apiGet, apiDelete, api, API_URL } from "../services/api";
import { useToast } from "../hooks/useToast";
import "./CentralArquivos.css";

function PrivateImage({ file }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let disposed = false;
    let objectUrl;
    apiGet(`/anexos/download/${file.id}`).then(async response => {
      if (!response?.ok) return;
      const blob = await response.blob();
      if (disposed) return;
      objectUrl = URL.createObjectURL(blob);
      setSrc(objectUrl);
    }).catch(() => {});
    return () => { disposed = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [file.id]);
  return src ? <img src={src} alt={file.nome_arquivo} /> : <FiImage aria-label="Imagem protegida" />;
}

export default function CentralArquivos() {
  const { showToast, ToastContainer } = useToast();
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
    try {
      setAnexos([]);
      const res = await apiGet(`/anexos/animal/${animalId}`);
      if (!res?.ok) throw new Error('Não foi possível carregar os arquivos.');
      setAnexos(await res.json());
    } catch (error) { showToast(error.message, 'error'); }
    finally { setLoading(false); }
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
        showToast('Arquivo anexado com sucesso.', 'success');
      } else throw new Error((await res.json()).error || 'Não foi possível anexar o arquivo.');
    } catch (err) {
      console.error("Erro no upload:", err);
      showToast(err.message || 'Não foi possível anexar o arquivo.', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
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
      } else throw new Error('Não foi possível baixar o arquivo.');
    } catch (err) {
      console.error("Erro ao baixar arquivo:", err);
      showToast(err.message || 'Não foi possível baixar o arquivo.', 'error');
    }
  };

  const getFileIcon = (mime) => {
    if (mime?.includes("image")) return <FiImage />;
    if (mime?.includes("pdf")) return <FiFileText />;
    return <FiFile />;
  };

  return (
    <div className="central-arquivos-container fade-in">
      <ToastContainer />
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
                  <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={handleFileUpload} style={{ display: "none" }} disabled={uploading} />
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
                          <PrivateImage file={file} />
                        ) : (
                          <div className="file-icon-large">{getFileIcon(file.tipo_mime)}</div>
                        )}
                      </div>
                      <div className="anexo-info">
                        <div className="anexo-main">
                          <strong>{file.nome_arquivo}</strong>
                          <span>{formatDate(file.created_at)}</span>
                        </div>
                        <div className="anexo-actions">
                          <button aria-label={`Baixar ${file.nome_arquivo}`} onClick={() => handleDownload(file)} className="btn-download-file">
                            <FiDownload />
                          </button>
                          <button aria-label={`Excluir ${file.nome_arquivo}`} onClick={() => deletarAnexo(file.id)} className="btn-delete-file">
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
