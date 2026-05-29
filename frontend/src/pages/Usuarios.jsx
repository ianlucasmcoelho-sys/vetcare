import React, { useState, useEffect } from "react";
import { FiUserPlus, FiTrash2, FiEdit2, FiShield, FiUser, FiActivity, FiPower, FiX } from "react-icons/fi";
import { apiGet, apiPost, apiPut, apiDelete } from "../services/api";
import { usePermission } from "../hooks/usePermission";
import { useToast } from "../hooks/useToast";
import "./Usuarios.css";

export default function Usuarios() {
  const { can, isAdmin } = usePermission();
  const { showToast, ToastContainer } = useToast();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [form, setForm] = useState({ nome: "", email: "", senha: "", perfil: "recepcionista" });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("usuario") || "{}");
    setUsuarioLogado(user);
    if (isAdmin()) carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    setLoading(true);
    const res = await apiGet("/auth/usuarios");
    if (res && res.ok) {
      const data = await res.json();
      setUsuarios(data);
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const url = editId ? `/auth/usuarios/${editId}` : "/auth/usuarios";
    const res = editId ? await apiPut(url, form) : await apiPost(url, form);
    if (res && res.ok) {
      showToast(editId ? "Usuário atualizado!" : "Usuário criado!", "success");
      fecharModal();
      carregarUsuarios();
    } else {
      showToast("Erro ao salvar", "error");
    }
    setLoading(false);
  };

  const toggleAtivo = async (id, ativoAtual) => {
    const usuario = usuarios.find(u => u.id === id);
    await apiPut(`/auth/usuarios/${id}`, { ...usuario, ativo: ativoAtual ? 0 : 1 });
    carregarUsuarios();
  };

  const fecharModal = () => {
    setForm({ nome: "", email: "", senha: "", perfil: "recepcionista" });
    setEditId(null);
    setShowModal(false);
  };

  const abrirEdicao = (usuario) => {
    setForm({ nome: usuario.nome, email: usuario.email, senha: "", perfil: usuario.perfil });
    setEditId(usuario.id);
    setShowModal(true);
  };

  const deletarUsuario = async (id) => {
    if (window.confirm("Excluir usuário?")) {
      await apiDelete(`/auth/usuarios/${id}`);
      carregarUsuarios();
    }
  };

  const getPerfilIcon = (perfil) => {
    if (perfil === "admin") return <FiShield />;
    if (perfil === "veterinario") return <FiActivity />;
    return <FiUser />;
  };

  const getPerfilLabel = (perfil) => {
    if (perfil === "admin") return "Administrador";
    if (perfil === "veterinario") return "Veterinário";
    return "Recepcionista";
  };

  if (!isAdmin()) {
    return (
      <div className="usuarios-container">
        <div className="empty-state">
          <FiShield size={48} />
          <p>Acesso negado. Apenas administradores podem acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="usuarios-container">
      <div className="page-header">
        <div className="header-info">
          <h1 className="page-title">Usuários</h1>
          <p className="page-subtitle">Gerencie os acessos da sua clínica</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <FiUserPlus /> Novo Usuário
          </button>
        </div>
      </div>

      <div className="usuarios-card">
        {loading ? <div>Carregando...</div> : usuarios.length === 0 ? <div className="empty-state">Nenhum usuário</div> : (
          <div className="usuarios-list">
            {usuarios.map(user => (
              <div key={user.id} className={`usuario-card ${!user.ativo ? "inativo" : ""}`}>
                <div className="usuario-avatar">{getPerfilIcon(user.perfil)}</div>
                <div className="usuario-info">
                  <h3>{user.nome} {!user.ativo && <span className="inativo-badge">Inativo</span>}</h3>
                  <p>{user.email}</p>
                  <span className={`perfil-badge perfil-${user.perfil}`}>{getPerfilLabel(user.perfil)}</span>
                </div>
                <div className="usuario-actions">
                  <button onClick={() => toggleAtivo(user.id, user.ativo)} className="toggle-btn"><FiPower /> {user.ativo ? "Desativar" : "Ativar"}</button>
                  <button onClick={() => abrirEdicao(user)} className="edit-btn"><FiEdit2 /></button>
                  {user.id !== usuarioLogado?.id && <button onClick={() => deletarUsuario(user.id)} className="delete-btn"><FiTrash2 /></button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editId ? "Editar Usuário" : "Novo Usuário"}</h2>
              <button onClick={fecharModal} className="modal-close"><FiX /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="form-scroll">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nome</label>
                  <input type="text" name="nome" value={form.nome} onChange={handleChange} required placeholder="Nome completo" />
                </div>
                <div className="form-group">
                  <label>E-mail</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="email@exemplo.com" />
                </div>
                <div className="form-group">
                  <label>{editId ? "Nova senha" : "Senha"}</label>
                  <input type="password" name="senha" value={form.senha} onChange={handleChange} required={!editId} minLength="6" placeholder="Mínimo 6 caracteres" />
                </div>
                <div className="form-group">
                  <label>Perfil</label>
                  <select name="perfil" value={form.perfil} onChange={handleChange}>
                    <option value="admin">Admin</option>
                    <option value="veterinario">Veterinário</option>
                    <option value="recepcionista">Recepcionista</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={fecharModal}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "Salvando..." : "Salvar Usuário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ToastContainer />
    </div>
  );
}