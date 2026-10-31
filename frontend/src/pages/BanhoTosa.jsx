import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiPlus, FiX, FiClock, FiScissors, FiEdit2, FiTrash2, FiCopy, FiChevronRight, FiCalendar, FiArchive, FiRotateCcw } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../services/api';
import { criarLinkWhatsAppWeb } from '../utils/whatsapp';
import './BanhoTosa.css';

const etapas = ['Agendado', 'Chegou', 'Banho', 'Tosa', 'Secagem', 'Finalizado', 'Indo até você'];
const servicosDisponiveis = ['Banho', 'Tosa na máquina', 'Tosa na tesoura', 'Tosa higiênica', 'Hidratação', 'Desembolo', 'Corte de unhas'];
const hoje = () => {
  const data = new Date();
  data.setMinutes(data.getMinutes() - data.getTimezoneOffset());
  return data.toISOString().slice(0, 10);
};
const formVazio = () => ({ animal_id: '', data: hoje(), horario: '', pacote_mensal: false, observacoes: '', servicos: [] });

export default function BanhoTosa() {
  const [registros, setRegistros] = useState([]);
  const [animais, setAnimais] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [busca, setBusca] = useState('');
  const [dataFiltro, setDataFiltro] = useState('');
  const [mostrarEncerrados, setMostrarEncerrados] = useState(false);
  const [form, setForm] = useState(formVazio);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dataFiltro) params.set('data', dataFiltro);
      if (mostrarEncerrados) params.set('mostrar_encerrados', '1');
      const query = params.size ? `?${params.toString()}` : '';
      const [resBT, resAnim] = await Promise.all([apiGet(`/banhotosa${query}`), apiGet('/animais')]);
      if (resBT?.ok && resAnim?.ok) {
        setRegistros(await resBT.json());
        setAnimais(await resAnim.json());
      }
    } catch (error) { console.error('Erro ao carregar banho e tosa:', error); }
    finally { setLoading(false); }
  }, [dataFiltro, mostrarEncerrados]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const nomePet = useCallback((id) => animais.find((animal) => String(animal.id) === String(id))?.nome || 'Pet', [animais]);
  const filtrados = useMemo(() => registros.filter((registro) => {
    const query = busca.trim().toLocaleLowerCase('pt-BR');
    return !query || `${nomePet(registro.animal_id)} ${registro.tutor_nome || ''}`.toLocaleLowerCase('pt-BR').includes(query);
  }), [registros, busca, nomePet]);
  const ativos = useMemo(() => filtrados.filter((item) => !Boolean(item.arquivado)), [filtrados]);
  const encerrados = useMemo(() => filtrados.filter((item) => Boolean(item.arquivado)), [filtrados]);

  const abrirNovo = () => { setEditId(null); setForm(formVazio()); setShowModal(true); };
  const abrirEdicao = (registro) => {
    setEditId(registro.id);
    setForm({ animal_id: String(registro.animal_id), data: registro.data, horario: registro.horario, pacote_mensal: Boolean(registro.pacote_mensal), observacoes: registro.observacoes || '', servicos: registro.servicos ? registro.servicos.split(',').map((s) => s.trim()) : [] });
    setShowModal(true);
  };
  const handleSubmit = async (event) => {
    event.preventDefault(); setLoading(true);
    try {
      const response = editId ? await apiPut(`/banhotosa/${editId}`, form) : await apiPost('/banhotosa', form);
      if (response?.ok) { setShowModal(false); setForm(formVazio()); await carregarDados(); }
      else if (response) { const error = await response.json(); window.alert(error.error || 'Não foi possível salvar o agendamento.'); }
    } catch (error) { popup?.close(); window.alert(error.message || 'Could not contact the server.'); }
    finally { setLoading(false); }
  };

  const mover = async (id, status) => {
    const anterior = registros;
    setRegistros((itens) => itens.map((item) => item.id === id ? { ...item, status } : item));
    try {
      const response = await apiPatch(`/banhotosa/${id}/status`, { status });
      if (!response?.ok) setRegistros(anterior);
    } catch { setRegistros(anterior); }
  };
  const excluir = async (id) => {
    if (!window.confirm('Excluir este agendamento de banho e tosa?')) return;
    const response = await apiDelete(`/banhotosa/${id}`);
    if (response?.ok) setRegistros((itens) => itens.filter((item) => item.id !== id));
  };
  const arquivar = async (registro) => {
    const arquivado = !Boolean(registro.arquivado);
    try {
      const response = await apiPatch(`/banhotosa/${registro.id}/arquivado`, { arquivado });
      if (!response?.ok) {
        const error = response ? await response.json() : {};
        window.alert(error.error || 'Não foi possível atualizar o arquivamento.');
        return;
      }
      setRegistros((itens) => itens.map((item) => item.id === registro.id ? { ...item, arquivado: arquivado ? 1 : 0 } : item));
    } catch (error) { popup?.close(); window.alert(error.message || 'Could not contact the server.'); }
  };
  const compartilhar = async (registro) => {
    const url = `${window.location.origin}/acompanhar-banho-tosa/${registro.token_acompanhamento}`;
    try { await navigator.clipboard.writeText(url); window.alert('Link de acompanhamento copiado.'); }
    catch { window.prompt('Copie o link para compartilhar com o tutor:', url); }
  };
  const enviarLinkWhatsApp = async (registro) => {
    const popup = window.open('about:blank', '_blank');
    setSendingId(registro.id);
    try {
      const response = await apiPost(`/banhotosa/${registro.id}/enviar-link`, {});
      const result = response ? await response.json() : {};
      if (response?.ok) {
        const url = criarLinkWhatsAppWeb(result.telefone, result.mensagem);
        if (!url) throw new Error('O tutor não possui telefone cadastrado.');
        if (popup) popup.location.href = url;
        else window.location.href = url;
      }
      else { popup?.close(); window.alert(result.error || 'Could not prepare the message.'); }
    } catch (error) { popup?.close(); window.alert(error.message || 'Could not contact the server.'); }
    finally { setSendingId(null); }
  };
  const renderCard = (item, arquivado = false) => {
    const etapaIndex = etapas.indexOf(item.status);
    return <article className="banho-card" key={item.id} draggable={!arquivado} onDragStart={(e) => e.dataTransfer.setData('text/plain', String(item.id))}>
      <div className="banho-card-title"><div><strong>{item.animal_nome || nomePet(item.animal_id)}</strong><small>{item.tutor_nome || 'Tutor não informado'}</small></div><div className="banho-card-actions">
        <button aria-label={arquivado ? 'Restaurar agendamento' : 'Arquivar agendamento'} title={arquivado ? 'Restaurar' : 'Arquivar'} onClick={() => arquivar(item)}>{arquivado ? <FiRotateCcw /> : <FiArchive />}</button>
        <button aria-label="Excluir agendamento" title="Excluir" onClick={() => excluir(item.id)}><FiTrash2 /></button>
      </div></div>
      <div className="banho-card-meta"><span><FiCalendar /> {new Date(`${item.data}T12:00:00`).toLocaleDateString('pt-BR')}</span><span><FiClock /> {item.horario}</span></div>
      {item.servicos && <p className="banho-services">{item.servicos}</p>}
      {item.observacoes && <p className="banho-notes">{item.observacoes}</p>}
      {item.pacote_mensal ? <span className="banho-package">Pacote mensal</span> : null}
      <footer><button onClick={() => abrirEdicao(item)}><FiEdit2 /> Editar</button><button onClick={() => enviarLinkWhatsApp(item)} disabled={sendingId === item.id}><FaWhatsapp /> {sendingId === item.id ? 'Enviando…' : 'Enviar WhatsApp'}</button><button onClick={() => compartilhar(item)}><FiCopy /> Copiar link</button>{!arquivado && etapaIndex < etapas.length - 1 && <button className="banho-next" onClick={() => mover(item.id, etapas[etapaIndex + 1])}>Avançar <FiChevronRight /></button>}</footer>
    </article>;
  };

  return <main className="banho-tosa-container">
    <header className="banho-header">
      <div><span className="banho-eyebrow"><FiScissors /> ESTÉTICA E BEM-ESTAR</span><h1>Banho &amp; Tosa</h1><p>Agende serviços e acompanhe cada pet durante o atendimento.</p></div>
      <button className="banho-primary" onClick={abrirNovo}><FiPlus /> Novo agendamento</button>
    </header>
    <section className="banho-toolbar">
      <input aria-label="Buscar pet ou tutor" placeholder="Buscar pet ou tutor" value={busca} onChange={(e) => setBusca(e.target.value)} />
      <label><FiCalendar /><span>Data</span><input type="date" value={dataFiltro} onChange={(e) => setDataFiltro(e.target.value)} /></label>
      {dataFiltro && <button className="banho-quiet" onClick={() => setDataFiltro('')}>Próximos dias</button>}
      <label className="banho-show-archived"><input type="checkbox" checked={mostrarEncerrados} onChange={(e) => setMostrarEncerrados(e.target.checked)} /><FiArchive /> Mostrar encerrados</label>
    </section>
    {loading && !registros.length ? <p className="banho-empty">Carregando agenda…</p> : <section className={`banho-board${mostrarEncerrados ? ' with-archived' : ''}`} aria-label="Etapas do banho e tosa">
      {etapas.map((etapa) => <div className="banho-column" key={etapa} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const id = Number(e.dataTransfer.getData('text/plain')); if (id) mover(id, etapa); }}>
        <header><h2>{etapa}</h2><span>{ativos.filter((item) => item.status === etapa).length}</span></header>
        <div className="banho-cards">{ativos.filter((item) => item.status === etapa).map((item) => renderCard(item))}</div>
      </div>)}
      {mostrarEncerrados && <div className="banho-column banho-column-archived"><header><h2>Encerrados</h2><span>{encerrados.length}</span></header><div className="banho-cards">{encerrados.map((item) => renderCard(item, true))}</div></div>}
    </section>}
    {!loading && filtrados.length === 0 && <p className="banho-empty">Nenhum agendamento encontrado para este filtro.</p>}
    {showModal && <div className="banho-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}><section className="banho-modal" role="dialog" aria-modal="true" aria-labelledby="banho-modal-title">
      <header><div><span className="banho-eyebrow"><FiScissors /> AGENDAMENTO</span><h2 id="banho-modal-title">{editId ? 'Editar atendimento' : 'Novo atendimento'}</h2></div><button aria-label="Fechar" onClick={() => setShowModal(false)}><FiX /></button></header>
      <form onSubmit={handleSubmit}>
        <label>Pet<select required value={form.animal_id} onChange={(e) => setForm({ ...form, animal_id: e.target.value })}><option value="">Selecione o pet</option>{animais.map((animal) => <option key={animal.id} value={animal.id}>{animal.nome}</option>)}</select></label>
        <div className="banho-form-row"><label>Data<input type="date" required value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></label><label>Horário<input type="time" required value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} /></label></div>
        <fieldset><legend>Serviços</legend><div className="banho-service-options">{servicosDisponiveis.map((servico) => <label key={servico}><input type="checkbox" checked={form.servicos.includes(servico)} onChange={(e) => setForm({ ...form, servicos: e.target.checked ? [...form.servicos, servico] : form.servicos.filter((item) => item !== servico) })} />{servico}</label>)}</div></fieldset>
        <label className="banho-checkbox"><input type="checkbox" checked={form.pacote_mensal} onChange={(e) => setForm({ ...form, pacote_mensal: e.target.checked })} /> Faz parte de pacote mensal</label>
        <label>Observações<textarea rows="3" placeholder="Preferências, alergias ou instruções especiais" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></label>
        <footer><p>Use Enviar WhatsApp no cart&#227;o para abrir a mensagem com o link de acompanhamento.</p><button type="button" className="banho-quiet" onClick={() => setShowModal(false)}>Cancelar</button><button type="submit" className="banho-primary" disabled={loading}>{loading ? 'Salvando…' : editId ? 'Salvar alterações' : 'Agendar serviço'}</button></footer>
      </form>
    </section></div>}
  </main>;
}
