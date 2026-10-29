import { formatDate } from "../utils/date";
import React, { useState, useEffect } from "react";
import { FiFileText, FiUpload, FiTrash2, FiEdit2, FiCheckCircle, FiX, FiEye, FiDownload } from "react-icons/fi";
import { apiGet, apiPost, apiPut, apiDelete, api } from "../services/api";
import { useToast } from "../hooks/useToast";
import { usePermission } from "../hooks/usePermission";
import "./TemplateManager.css";

export default function TemplateManager() {
  const { isAdmin } = usePermission();
  const { showToast, ToastContainer } = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    nome: "",
    tipo: "receituario",
    conteudo_html: "",
    conteudo_css: ""
  });

  const carregarTemplates = async () => {
    setLoading(true);
    const res = await apiGet("/templates");
    if (res && res.ok) {
      const data = await res.json();
      setTemplates(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin()) carregarTemplates();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const url = editId ? `/templates/${editId}` : "/templates";
    const res = editId ? await apiPut(url, form) : await apiPost(url, form);
    if (res && res.ok) {
      showToast(editId ? "Template atualizado!" : "Template criado!", "success");
      fecharModal();
      carregarTemplates();
    } else {
      showToast("Erro ao salvar template", "error");
    }
    setLoading(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append("arquivo", file);
    formData.append("nome", file.name);
    formData.append("tipo", "receituario");
    
    const res = await api("/templates/upload", {
      method: "POST",
      body: formData,
      headers: {}
    });
    
    if (res && res.ok) {
      showToast("Template importado com sucesso!", "success");
      carregarTemplates();
    } else {
      showToast("Erro ao importar template", "error");
    }
  };

  const ativarTemplate = async (id, ativo) => {
    const res = await apiPut(`/templates/${id}`, { ativo: ativo ? 0 : 1 });
    if (res && res.ok) {
      showToast(ativo ? "Template desativado" : "Template ativado", "success");
      carregarTemplates();
    }
  };

  const deletarTemplate = async (id) => {
    if (window.confirm("Deseja excluir este template?")) {
      const res = await apiDelete(`/templates/${id}`);
      if (res && res.ok) {
        showToast("Template excluído!", "success");
        carregarTemplates();
      }
    }
  };

  const visualizarTemplate = (html, css) => {
    const fullHtml = html.replace("{{css}}", css || "");
    const newWindow = window.open();
    newWindow.document.write(fullHtml);
    newWindow.document.close();
  };

  const fecharModal = () => {
    setForm({ nome: "", tipo: "receituario", conteudo_html: "", conteudo_css: "" });
    setEditId(null);
    setShowModal(false);
  };

  const abrirEdicao = (template) => {
    setForm({
      nome: template.nome,
      tipo: template.tipo,
      conteudo_html: template.conteudo_html,
      conteudo_css: template.conteudo_css || ""
    });
    setEditId(template.id);
    setShowModal(true);
  };

  if (!isAdmin()) {
    return (
      <div className="template-container">
        <div className="empty-state">
          <FiFileText size={48} />
          <p>Acesso negado. Apenas administradores podem gerenciar templates.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="template-container">
      <div className="page-header">
        <div className="header-info">
          <h1 className="page-title">Templates Personalizados</h1>
          <p className="page-subtitle">Gerencie modelos de receitas e prontuários da sua clínica</p>
        </div>
        <div className="header-actions">
          <label className="btn-outline" style={{ cursor: 'pointer' }}>
            <FiUpload /> Importar HTML
            <input type="file" accept=".html,.htm" onChange={handleUpload} style={{ display: "none" }} />
          </label>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <FiFileText /> Criar Template
          </button>
        </div>
      </div>

      <div className="template-stats">
        <div className="stat-card">
          <div className="stat-icon"><FiFileText /></div>
          <div className="stat-info">
            <span className="stat-label">Total de Templates</span>
            <span className="stat-value">{templates.length}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FiCheckCircle /></div>
          <div className="stat-info">
            <span className="stat-label">Templates Ativos</span>
            <span className="stat-value">{templates.filter(t => t.ativo).length}</span>
          </div>
        </div>
      </div>

      <div className="template-card">
        {loading ? (
          <div className="loading-skeleton">Carregando...</div>
        ) : templates.length === 0 ? (
          <div className="empty-state">
            <FiFileText size={48} />
            <p>Nenhum template personalizado</p>
            <p className="empty-hint">Crie seu primeiro template ou importe um arquivo HTML</p>
          </div>
        ) : (
          <div className="templates-list">
            <table className="template-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Criado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(template => (
                  <tr key={template.id} className={template.ativo ? "active-row" : ""}>
                    <td><FiFileText /> {template.nome}</td>
                    <td>{template.tipo === "receituario" ? "Receituário" : "Prontuário"}</td>
                    <td>
                      {template.ativo ? (
                        <span className="badge-active">Ativo</span>
                      ) : (
                        <span className="badge-inactive">Inativo</span>
                      )}
                    </td>
                    <td>{formatDate(template.created_at)}</td>
                    <td className="actions">
                      <button onClick={() => visualizarTemplate(template.conteudo_html, template.conteudo_css)} className="action-btn preview" title="Visualizar">
                        <FiEye />
                      </button>
                      <button onClick={() => ativarTemplate(template.id, template.ativo)} className="action-btn activate" title={template.ativo ? "Desativar" : "Ativar"}>
                        <FiCheckCircle />
                      </button>
                      <button onClick={() => abrirEdicao(template)} className="action-btn edit" title="Editar">
                        <FiEdit2 />
                      </button>
                      <button onClick={() => deletarTemplate(template.id)} className="action-btn delete" title="Excluir">
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editId ? "Editar Template" : "Novo Template"}</h2>
              <button onClick={fecharModal} className="modal-close"><FiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nome do Template</label>
                  <input type="text" name="nome" value={form.nome} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Tipo</label>
                  <select name="tipo" value={form.tipo} onChange={handleChange}>
                    <option value="receituario">Receituário</option>
                    <option value="prontuario">Prontuário</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>HTML do Template</label>
                  <textarea name="conteudo_html" rows="8" value={form.conteudo_html} onChange={handleChange} 
                    placeholder="Use placeholders: {{pet_nome}}, {{tutor_nome}}, {{data_emissao}}, {{medicamentos}}, {{posologia}}, {{veterinario}}, {{clinica_nome}}" required />
                </div>
                <div className="form-group full-width">
                  <label>CSS Personalizado (opcional)</label>
                  <textarea name="conteudo_css" rows="6" value={form.conteudo_css} onChange={handleChange} 
                    placeholder="Seu CSS aqui..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={fecharModal} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ToastContainer />
    </div>
  );
}