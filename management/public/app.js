const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const money = value => value === null || value === undefined ? 'Indisponível' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const displayDate = value => value ? value.split('-').reverse().join('/') : '—';
const labels = { trial: 'Em teste', active: 'Ativa', overdue: 'Em atraso', cancelled: 'Cancelada', lifetime: 'Vitalício', expired: 'Teste encerrado / sem acesso' };
const actionLabels = { 'plan.created': 'Plano cadastrado', 'plan.updated': 'Plano atualizado', 'client.created': 'Clínica cadastrada', 'client.updated': 'Clínica atualizada', 'entry.created': 'Lançamento registrado', 'entry.deleted': 'Lançamento excluído', 'password.changed': 'Senha alterada' };
let state, owner, page = 'overview', month = today().slice(0, 7), query = '', statusFilter = '', editorContext, fetchVersion = 0;
async function api(path, options = {}) {
  let response;
  if (window.vetcareDesktop) {
    const result = await window.vetcareDesktop.request(path, { method: options.method || 'GET', body: options.body });
    response = { ok: result.status >= 200 && result.status < 300, status: result.status, json: async () => result.data };
  } else response = await fetch(`/api${path}`, { ...options, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' });
  const body = await response.json();
  if (!response.ok) {
    if (response.status === 401 && path !== '/login') showLogin();
    throw new Error(body.error || 'Não foi possível concluir.');
  }
  return body;
}
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => { $('#toast').hidden = true; }, 5000); }
function showLogin() { fetchVersion++; owner = null; state = null; $('#workspace').hidden = true; $('#login-view').hidden = false; $('#page-content').innerHTML = ''; $('#editor').close(); $('#editor-form').reset(); $('#editor-fields').innerHTML = ''; }
async function enter(user) {
  owner = user;
  $('#owner-name').textContent = user.name;
  $('#avatar').textContent = user.name.charAt(0).toUpperCase();
  $('#workspace').hidden = false; $('#login-view').hidden = true;
  await load();
}
async function load() {
  const version = ++fetchVersion;
  try { const data = await api(`/data?month=${month}`); if (owner && version === fetchVersion) { state = data; render(); } }
  catch (error) { if (owner && version === fetchVersion) { $('#page-content').innerHTML = `<div class="panel empty"><strong>Não foi possível carregar os registros.</strong><p>${escape(error.message)}</p><button class="secondary" data-action="retry">Tentar novamente</button></div>`; } }
}
function badge(status) { return `<span class="badge ${escape(status)}">${escape(labels[status] || status)}</span>`; }
function empty(title, description) { return `<div class="empty"><span class="empty-symbol">◇</span><strong>${title}</strong>${description}</div>`; }
function metric(title, value, note, icon, featured = false) { return `<article class="metric ${featured ? 'featured' : ''}"><div class="metric-head"><span>${title}</span><span class="metric-icon">${icon}</span></div><div class="metric-value ${value === 'Indisponível' ? 'metric-unavailable' : ''}">${value}</div><small>${note}</small></article>`; }
function clientTable(clients, compact = false) {
  if (!clients.length) return empty('Nenhuma clínica por aqui', 'Cadastre uma clínica contratante para começar a acompanhar sua assinatura.');
  return `<div class="table-scroll"><table><thead><tr><th>CLÍNICA</th><th>ASSINATURA</th><th>SITUAÇÃO</th>${compact ? '' : '<th>PRÓX. VENCIMENTO</th>'}<th></th></tr></thead><tbody>${clients.map(c => `<tr><td><strong>${escape(c.name)}</strong><small>${escape(c.contact)}</small></td><td>${money(c.monthly_cents)}<small>${escape(c.plan_name || 'Sem plano')}</small></td><td>${badge(c.status)}</td>${compact ? '' : `<td>${displayDate(c.due_on)}</td>`}<td><button class="row-action" data-action="edit-client" data-id="${escape(c.id)}">Editar</button></td></tr>`).join('')}</tbody></table></div>`;
}
function cashFlow() {
  const s = state.summary, total = s.income + s.expense;
  return `<div class="cash-flow"><div class="cash-row"><span>Receitas recebidas</span><strong class="positive">${money(s.income)}</strong></div><div class="cash-row"><span>Despesas pagas</span><strong class="negative">${money(s.expense)}</strong></div><div class="flow-bar"><svg width="100%" height="9" role="img" aria-label="Proporção de receitas e despesas"><rect width="100%" height="9" fill="#d9ac78"/><rect width="${total ? Math.round(s.income / total * 100) : 0}%" height="9" fill="#3d8364"/>${total ? '' : '<rect width="100%" height="9" fill="#eef2eb"/>'}</svg></div><div class="cash-row total"><span>Resultado de caixa</span><strong class="${s.balance >= 0 ? 'positive' : 'negative'}">${money(s.balance)}</strong></div><p class="footnote">Somente lançamentos manuais de ${escape(month.split('-').reverse().join('/'))}. O valor contratado das assinaturas não é contabilizado como recebimento.</p></div>`;
}
const pageInfo = {
  overview: ['Visão geral', 'Um olhar sobre a saúde do seu negócio.'],
  clients: ['Clínicas e assinaturas', 'Acompanhe cada cliente e o valor contratado com o VetCare.'],
  plans: ['Planos comerciais', 'Organize a oferta do VetCare para suas clínicas clientes.'],
  finance: ['Financeiro', 'Registre o que entrou e saiu do caixa da empresa.'],
  account: ['Minha conta', 'Seu acesso exclusivo à gestão do VetCare.']
};
function render() {
  $('.top-tag').textContent = state.local_source ? 'Dados reais · sistema local' : state.automatic ? 'Conectado ao sistema VetCare' : state.demo ? 'Demonstração · dados fictícios' : 'Gestão empresarial';
  if (state.automatic) {
    const timestamp = new Date(state.sync.checked_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    $('.integration-note p').textContent = `Atualização automática · ${timestamp}. ${state.local_source ? 'Fonte: banco local do VetCare; não é o banco publicado na Hostinger. ' : ''}${state.sync.complete ? 'Cadastros do sistema e mensalidades conciliadas.' : 'Conciliação financeira incompleta: valores indisponíveis até a conexão com o Asaas ser restabelecida.'} Atualiza a cada 60 segundos. Despesas externas não estão integradas.`;
    if (page !== 'account') { renderAutomatic(); return; }
  }
  $('#page-title').textContent = pageInfo[page][0]; $('#page-subtitle').textContent = pageInfo[page][1];
  document.querySelectorAll('[data-page]').forEach(button => button.classList.toggle('selected', button.dataset.page === page));
  $('#page-actions').innerHTML = `${['overview', 'finance'].includes(page) ? `<label aria-label="Mês de referência"><input id="month" type="month" value="${escape(month)}" min="2000-01" max="9999-12" required></label>` : ''}${page === 'overview' || page === 'clients' ? '<button class="primary" data-action="new-client">+ Nova clínica</button>' : page === 'plans' ? '<button class="primary" data-action="new-plan">+ Novo plano</button>' : page === 'finance' ? '<button class="primary" data-action="new-entry">+ Novo lançamento</button><button class="secondary" data-action="export">Exportar CSV</button>' : '<button class="secondary" data-action="logout">Sair da conta</button>'}`;
  const s = state.summary;
  if (page === 'overview') {
    $('#page-content').innerHTML = `<section class="metrics">${metric('Receita recorrente contratada', money(s.mrr), 'Mensalidades das clínicas ativas · posição atual', '↗', true)}${metric('Clínicas ativas', s.active, `${s.trial} em período de teste · posição atual`, '▦')}${metric('Recebido no mês', money(s.income), 'Receitas registradas no caixa', '↓')}${metric('Assinaturas em atraso', s.overdue, 'Situação informada manualmente · posição atual', '◷')}</section><div class="columns"><section class="panel"><div class="panel-heading"><div><h2>Clínicas recentes</h2><p>As últimas clínicas cadastradas na gestão</p></div><button data-action="show-clients">Ver todas →</button></div>${clientTable(state.clients.slice(0, 5), true)}</section><section class="panel"><div class="panel-heading"><div><h2>Caixa do mês</h2><p>Recebimentos e despesas registrados</p></div><span class="metric-icon">↗</span></div>${cashFlow()}</section></div><section class="panel"><div class="panel-heading"><div><h2>Atividade da gestão</h2><p>Últimas alterações realizadas pelos sócios</p></div></div>${state.auditLog.length ? `<ul class="audit-list">${state.auditLog.map(a => `<li><span>${escape(actionLabels[a.action] || a.action)} <small>· ${escape(a.owner_name)}</small></span><small>${new Date(a.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</small></li>`).join('')}</ul>` : empty('Seu histórico começa aqui', 'As alterações feitas pelos sócios aparecerão neste espaço.')}</section>`;
  } else if (page === 'clients') {
    $('#page-content').innerHTML = `<section class="panel"><div class="toolbar"><input id="client-search" type="search" placeholder="Buscar clínica ou responsável" aria-label="Buscar clínica ou responsável" value="${escape(query)}"><select id="client-status" aria-label="Filtrar situação"><option value="">Todas as situações</option>${Object.entries(labels).map(([v, l]) => `<option value="${v}" ${v === statusFilter ? 'selected' : ''}>${l}</option>`).join('')}</select></div><div id="clients-table"></div></section><p class="footnote">O vencimento e a situação são atualizados pelos sócios. Não há cobrança automática ou suspensão de acesso nesta versão.</p>`;
    renderClients();
  } else if (page === 'plans') {
    $('#page-content').innerHTML = `${state.plans.length ? `<div class="plan-grid">${state.plans.map(p => `<article class="panel plan-card"><span class="badge ${p.active ? '' : 'cancelled'}">${p.active ? 'Disponível para contratação' : 'Inativo'}</span><h2>${escape(p.name)}</h2><div class="plan-price">${money(p.monthly_cents)}<small> / mês</small></div><p>${state.clients.filter(c => c.plan_id === p.id && c.status !== 'cancelled').length} clínica(s) vinculada(s)</p><button class="secondary" data-action="edit-plan" data-id="${escape(p.id)}">Editar plano</button></article>`).join('')}</div>` : `<div class="panel">${empty('Defina seus planos', 'Cadastre os planos comerciais e depois vincule cada clínica à sua assinatura.')}</div>`}<p class="footnote">Alterar o preço do plano não reajusta contratos existentes. O valor de cada assinatura é definido no cadastro da clínica.</p>`;
  } else if (page === 'finance') {
    $('#page-content').innerHTML = `<div class="metrics">${metric('Receitas recebidas', money(s.income), 'No mês selecionado', '↓')}${metric('Despesas pagas', money(s.expense), 'No mês selecionado', '↑')}${metric('Resultado de caixa', money(s.balance), 'Receitas menos despesas', '↗', true)}${metric('Lançamentos', state.entries.length, 'Registros do mês selecionado', '▤')}</div><section class="panel"><div class="panel-heading"><div><h2>Movimentações do mês</h2><p>Registros de valores efetivamente recebidos ou pagos</p></div></div>${state.entries.length ? `<div class="table-scroll"><table><thead><tr><th>DATA</th><th>DESCRIÇÃO</th><th>TIPO</th><th>VALOR</th><th></th></tr></thead><tbody>${state.entries.map(e => `<tr><td>${displayDate(e.occurred_on)}</td><td><strong>${escape(e.description)}</strong><small>${escape(e.client_name || 'Empresa VetCare')}</small></td><td><span class="badge ${e.kind === 'expense' ? 'overdue' : ''}">${e.kind === 'income' ? 'Receita' : 'Despesa'}</span></td><td class="${e.kind === 'income' ? 'positive' : 'negative'}">${money(e.amount_cents)}</td><td><button class="row-action danger" data-action="delete-entry" data-id="${escape(e.id)}">Excluir</button></td></tr>`).join('')}</tbody></table></div>` : empty('Nenhum lançamento neste mês', 'Registre uma receita recebida ou uma despesa paga para acompanhar seu caixa.')}</section>`;
  } else {
    $('#page-content').innerHTML = `<section class="panel account-card"><h2>${escape(owner.name)}</h2><p class="muted">${escape(owner.email)}</p><p>Seu acesso é independente da conta das clínicas. Para criar ou recuperar a conta do outro sócio, use o procedimento administrativo documentado com a hospedagem.</p><hr><h3>Alterar minha senha</h3><form id="password-form"><label>Senha atual<input name="current" type="password" autocomplete="current-password" required maxlength="256"></label><label>Nova senha<input name="password" type="password" autocomplete="new-password" required minlength="12" maxlength="256"></label><label>Confirmar nova senha<input name="confirmation" type="password" autocomplete="new-password" required minlength="12" maxlength="256"></label><p class="footnote">Use ao menos 12 caracteres. Todas as suas sessões serão encerradas após a alteração.</p><p class="error" id="password-error" role="alert"></p><button class="primary" type="submit">Atualizar senha</button></form></section>`;
  }
}

function automaticClientTable(clients) {
  if (!clients.length) return empty('Nenhuma clínica encontrada', 'As clínicas aparecem automaticamente quando cadastradas no sistema VetCare.');
  return `<div class="table-scroll"><table><thead><tr><th>CLÍNICA / CONTATO</th><th>ASSINATURA</th><th>SITUAÇÃO</th><th>VENCIMENTO / ACESSO</th></tr></thead><tbody>${clients.map(c => `<tr><td><strong>${escape(c.name)}</strong><small>${escape(c.contact || c.email || 'Contato não informado')}</small>${c.contact && c.email ? `<small>${escape(c.email)}</small>` : ''}</td><td>${money(c.monthly_cents)}<small>${escape(c.plan_name)}</small></td><td>${badge(c.status)}</td><td>${displayDate(c.due_on)}<small>${c.billing_environment === 'sandbox' ? 'Assinatura de teste · Sandbox' : c.status === 'lifetime' ? 'Acesso vitalício' : 'Sincronizado do VetCare'}</small></td></tr>`).join('')}</tbody></table></div>`;
}
function renderAutomatic() {
  const s = state.summary;
  const titles = { overview: ['Visão geral', 'Sua empresa acompanhada pelos dados do próprio VetCare.'], clients: ['Clínicas e assinaturas', 'Cadastros e acessos sincronizados automaticamente do sistema.'], plans: ['Planos do sistema', 'Planos utilizados pelo VetCare, sem duplicar a configuração comercial.'], finance: ['Recebimentos e taxas', 'Mensalidades confirmadas e taxas consultadas no Asaas de produção.'] };
  $('#page-title').textContent = titles[page][0]; $('#page-subtitle').textContent = titles[page][1];
  document.querySelectorAll('[data-page]').forEach(b => b.classList.toggle('selected', b.dataset.page === page));
  $('#page-actions').innerHTML = `${['overview', 'finance'].includes(page) ? `<label aria-label="Mês de referência"><input id="month" type="month" value="${escape(month)}" min="2000-01" max="9999-12" required></label>` : ''}<button class="secondary" data-action="retry">↻ Atualizar</button>${page === 'finance' ? `<button class="secondary" data-action="export" ${state.sync.complete ? '' : 'disabled title="Aguarde a conciliação completa"'}>Exportar CSV</button>` : ''}`;
  const warnings = state.sync.issues.length ? `<section class="panel"><div class="panel-heading"><div><h2>Conciliação pendente</h2><p>Os totais financeiros ficam indisponíveis para evitar números parciais.</p></div></div><ul class="audit-list">${state.sync.issues.slice(0, 12).map(i => `<li><span>${i.clinic_id ? `Clínica ${escape(i.clinic_id)}` : 'Conexão com Asaas'}</span><small>${escape(i.message)}</small></li>`).join('')}</ul></section>` : '';
  const automaticCash = `<div class="cash-flow"><div class="cash-row"><span>Mensalidades confirmadas</span><strong class="positive">${money(s.income)}</strong></div><div class="cash-row"><span>Taxas Asaas</span><strong class="negative">${money(s.expense)}</strong></div><div class="cash-row total"><span>Receita após taxas</span><strong>${money(s.balance)}</strong></div><p class="footnote">Mês ${escape(month.split('-').reverse().join('/'))} · cobranças confirmadas atualmente válidas. Sem somar valores Sandbox, receitas das clínicas ou despesas externas. Este saldo não representa o lucro total nem o saldo disponível no Asaas.</p></div>`;
  if (page === 'overview') {
    $('#page-content').innerHTML = `<section class="metrics">${metric('Receita recorrente contratada', money(s.mrr), 'Assinaturas mensais ativas de produção', '↗', true)}${metric('Clínicas com acesso ativo', s.active, `${s.trial} em teste · ${s.lifetime} com acesso vitalício`, '▦')}${metric('Mensalidades confirmadas no mês', money(s.income), 'Conciliação automática com Asaas', '↓')}${metric('Assinaturas em atraso', s.overdue, 'Situação consultada no sistema / Asaas', '◷')}</section>${warnings}<div class="columns"><section class="panel"><div class="panel-heading"><div><h2>Clínicas do sistema</h2><p>Cadastros mais recentes do VetCare</p></div><button data-action="show-clients">Ver todas →</button></div>${automaticClientTable(state.clients.slice(0, 5))}</section><section class="panel"><div class="panel-heading"><div><h2>Mensalidades do mês</h2><p>Receitas da empresa VetCare</p></div></div>${automaticCash}</section></div><section class="panel"><div class="panel-heading"><div><h2>Integração automática</h2><p>Sem recadastrar clientes, assinaturas ou recebimentos</p></div></div><div class="cash-flow"><p class="footnote">Novas clínicas entram pelo cadastro do sistema. Os pagamentos e vencimentos vêm da integração Asaas. O painel consulta os dados sem alterar contas, cobranças ou o acesso das clínicas. Contas de demonstração descontinuadas são excluídas.</p></div></section>`;
  } else if (page === 'clients') {
    $('#page-content').innerHTML = `<section class="panel"><div class="toolbar"><input id="client-search" type="search" placeholder="Buscar clínica ou responsável" aria-label="Buscar clínica ou responsável" value="${escape(query)}"><select id="client-status" aria-label="Filtrar situação"><option value="">Todas as situações</option>${Object.entries(labels).map(([v, label]) => `<option value="${v}" ${v === statusFilter ? 'selected' : ''}>${label}</option>`).join('')}</select></div><div id="clients-table"></div></section><p class="footnote">Cada registro vem do sistema VetCare. Para corrigir o cadastro, use as configurações da própria clínica. Planos e acessos são exibidos sem edição manual neste painel.</p>`;
    renderClients();
  } else if (page === 'plans') {
    $('#page-content').innerHTML = `<div class="plan-grid">${state.plans.map(p => `<article class="panel plan-card"><span class="badge">Plano do sistema VetCare</span><h2>${escape(p.name)}</h2><div class="plan-price">${money(p.monthly_cents)}${p.id === 'complete' ? '<small> / mês</small>' : ''}</div><p>${state.clients.filter(c => c.plan_id === p.id).length} clínica(s) vinculada(s)</p><small>Sincronizado do sistema</small></article>`).join('')}</div><p class="footnote">Referência comercial do VetCare. Descontos e valores efetivos da assinatura são consultados no Asaas. Acesso vitalício e teste não geram receita recorrente.</p>`;
  } else {
    $('#page-content').innerHTML = `<section class="metrics">${metric('Mensalidades confirmadas', money(s.income), 'Cobranças de produção válidas no mês', '↓')}${metric('Taxas Asaas', money(s.expense), 'Taxas identificadas nas cobranças', '↑')}${metric('Receita após taxas', money(s.balance), 'Sem despesas externas', '↗', true)}${metric('Movimentações automáticas', state.entries.length, 'Mensalidades e taxas conciliadas', '▤')}</section>${warnings}<section class="panel"><div class="panel-heading"><div><h2>Mensalidades e taxas do VetCare</h2><p>Registros de produção consultados diretamente no Asaas · leitura automática</p></div></div>${state.entries.length ? `<div class="table-scroll"><table><thead><tr><th>DATA</th><th>DESCRIÇÃO / CLÍNICA</th><th>TIPO</th><th>VALOR</th></tr></thead><tbody>${state.entries.map(e => `<tr><td>${displayDate(e.occurred_on)}</td><td><strong>${escape(e.description)}</strong><small>${escape(e.client_name)}</small></td><td><span class="badge ${e.kind === 'expense' ? 'overdue' : ''}">${e.kind === 'income' ? 'Mensalidade' : 'Taxa'}</span></td><td>${money(e.amount_cents)}</td></tr>`).join('')}</tbody></table></div>` : empty(state.sync.complete ? 'Nenhuma mensalidade confirmada neste mês' : 'Aguardando conciliação com Asaas', 'As cobranças aparecem automaticamente após a confirmação.')}${automaticCash}</section>`;
  }
}
function renderClients() {
  const q = query.toLocaleLowerCase('pt-BR');
  const clients = state.clients.filter(c => (!statusFilter || c.status === statusFilter) && `${c.name} ${c.contact} ${c.email}`.toLocaleLowerCase('pt-BR').includes(q));
  $('#clients-table').innerHTML = state.automatic ? automaticClientTable(clients) : clients.length ? clientTable(clients) : empty(state.clients.length ? 'Nenhuma clínica encontrada' : 'Nenhuma clínica cadastrada', state.clients.length ? 'Tente outro nome ou situação.' : 'Clique em Nova clínica para registrar seu primeiro cliente.');
}
function field(label, name, value = '', type = 'text', extra = '', wide = false) { return `<label class="${wide ? 'wide' : ''}">${label}<input name="${name}" type="${type}" value="${escape(value)}" ${extra}></label>`; }
function options(items, value) { return items.map(([id, name]) => `<option value="${escape(id)}" ${id === value ? 'selected' : ''}>${escape(name)}</option>`).join(''); }
function select(label, name, items, value = '') { return `<label>${label}<select name="${name}">${options(items, value)}</select></label>`; }
function openEditor(kind, id) {
  editorContext = { kind, id };
  const c = state.clients.find(c => c.id === id) || {};
  const p = state.plans.find(p => p.id === id) || {};
  $('#editor-error').textContent = '';
  if (kind === 'client') {
    $('#editor-title').textContent = id ? 'Editar clínica e assinatura' : 'Nova clínica contratante';
    $('#editor-fields').innerHTML = `${field('Nome da clínica', 'name', c.name, 'text', 'required maxlength="160"')}${field('Responsável', 'contact', c.contact, 'text', 'required maxlength="160"')}${field('E-mail de contato', 'email', c.email, 'email', 'maxlength="254"')}${field('Telefone', 'phone', c.phone, 'tel', 'maxlength="40"')}${select('Plano', 'plan_id', [['', 'Sem plano'], ...state.plans.filter(p => p.active || p.id === c.plan_id).map(p => [p.id, p.name])], c.plan_id)}${field('Mensalidade contratada (R$)', 'monthly', ((c.monthly_cents || 0) / 100).toFixed(2), 'number', 'required min="0" max="10000000" step="0.01"')}${select('Situação da assinatura', 'status', Object.entries(labels), c.status || 'trial')}${field('Início do contrato', 'started_on', c.started_on || today(), 'date', 'required min="2000-01-01" max="9999-12-31"')}${field('Próximo vencimento / fim do teste', 'due_on', c.due_on, 'date', 'min="2000-01-01" max="9999-12-31"')}<label class="wide">Observações<textarea name="notes" maxlength="2000">${escape(c.notes)}</textarea></label>`;
  } else if (kind === 'plan') {
    $('#editor-title').textContent = id ? 'Editar plano' : 'Novo plano comercial';
    $('#editor-fields').innerHTML = `${field('Nome do plano', 'name', p.name, 'text', 'required maxlength="160"')}${field('Mensalidade de referência (R$)', 'monthly', ((p.monthly_cents || 0) / 100).toFixed(2), 'number', 'required min="0" max="10000000" step="0.01"')}${select('Disponibilidade', 'active', [['1', 'Ativo'], ['0', 'Inativo']], String(p.active ?? 1))}<p class="footnote wide">Alterar o plano preserva os valores já contratados pelas clínicas.</p>`;
  } else if (kind === 'delete') {
    const e = state.entries.find(e => e.id === id);
    $('#editor-title').textContent = 'Excluir lançamento?';
    $('#editor-fields').innerHTML = `<p class="wide">Excluir <strong>${escape(e.description)}</strong>, de ${money(e.amount_cents)}? O resultado do caixa será recalculado. A ação ficará no histórico.</p>`;
  } else {
    $('#editor-title').textContent = 'Novo lançamento no caixa';
    $('#editor-fields').innerHTML = `${select('Tipo', 'kind', [['income', 'Receita recebida'], ['expense', 'Despesa paga']])}${field('Valor (R$)', 'amount', '', 'number', 'required min="0.01" max="10000000" step="0.01"')}${field('Descrição', 'description', '', 'text', 'required maxlength="300"', true)}${field('Data do recebimento / pagamento', 'occurred_on', today(), 'date', 'required min="2000-01-01" max="9999-12-31"')}${select('Clínica relacionada (opcional)', 'client_id', [['', 'Empresa VetCare'], ...state.clients.map(c => [c.id, c.name])])}`;
  }
  $('#editor-form [type=submit]').textContent = kind === 'delete' ? 'Excluir lançamento' : 'Salvar registro';
  $('#editor').showModal();
}
$('#editor-form').addEventListener('change', event => {
  if (event.target.name === 'plan_id') {
    const plan = state.plans.find(p => p.id === event.target.value);
    if (plan) $('#editor-form [name=monthly]').value = (plan.monthly_cents / 100).toFixed(2);
  }
});
$('#editor-form').addEventListener('submit', async event => {
  event.preventDefault(); const button = $('#editor-form [type=submit]'); button.disabled = true;
  const values = Object.fromEntries(new FormData(event.target));
  const { kind, id } = editorContext;
  const payload = kind === 'client' ? { ...values, monthly_cents: Math.round(Number(values.monthly) * 100) } : kind === 'plan' ? { ...values, monthly_cents: Math.round(Number(values.monthly) * 100), active: values.active === '1' } : { ...values, amount_cents: Math.round(Number(values.amount) * 100) };
  try {
    await api(`/${kind === 'delete' ? 'entries' : kind === 'client' ? 'clients' : kind === 'plan' ? 'plans' : 'entries'}${id ? `/${id}` : ''}`, { method: kind === 'delete' ? 'DELETE' : id ? 'PUT' : 'POST', ...(kind !== 'delete' ? { body: JSON.stringify(payload) } : {}) });
    $('#editor').close(); event.target.reset(); toast(kind === 'delete' ? 'Lançamento excluído.' : 'Registro salvo com sucesso.'); await load();
  } catch (error) { $('#editor-error').textContent = error.message; } finally { button.disabled = false; }
});
$('#close-editor').onclick = $('#cancel-editor').onclick = () => $('#editor').close();
$('#login-form').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.target.querySelector('button'); button.disabled = true; $('#login-error').textContent = '';
  try { const user = await api('/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(event.target))) }); event.target.reset(); await enter(user); }
  catch (error) { $('#login-error').textContent = error.message; } finally { button.disabled = false; }
});
async function logout() { try { await api('/logout', { method: 'POST' }); showLogin(); } catch (error) { toast(error.message); } }
$('#logout').onclick = logout;
document.addEventListener('click', async event => {
  const nav = event.target.closest('[data-page]');
  if (nav && state) { page = nav.dataset.page; render(); return; }
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action, id = button.dataset.id;
  if (action === 'retry') return load();
  if (!state) return;
  if (action === 'logout') return logout();
  if (action === 'show-clients') { page = 'clients'; render(); }
  if (action === 'new-client' || action === 'edit-client') openEditor('client', id);
  if (action === 'new-plan' || action === 'edit-plan') openEditor('plan', id);
  if (action === 'new-entry') openEditor('entry');
  if (action === 'delete-entry') openEditor('delete', id);
  if (action === 'export') exportCsv();
});
// Um único ciclo, sem sobreposição: a cada minuto e ao retornar à aba.
let autoRefreshPending = false;
async function autoRefresh() {
  if (!owner || (state && !state.automatic) || document.hidden || $('#editor').open || autoRefreshPending) return;
  autoRefreshPending = true;
  try { await load(); } finally { autoRefreshPending = false; }
}
setInterval(autoRefresh, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) autoRefresh(); });
document.addEventListener('input', event => { if (event.target.id === 'client-search') { query = event.target.value; renderClients(); } });
document.addEventListener('change', event => {
  if (event.target.id === 'client-status') { statusFilter = event.target.value; renderClients(); }
  if (event.target.id === 'month' && event.target.validity.valid) { month = event.target.value; load(); }
});
document.addEventListener('submit', async event => {
  if (event.target.id !== 'password-form') return;
  event.preventDefault(); const values = Object.fromEntries(new FormData(event.target));
  if (values.password !== values.confirmation) { $('#password-error').textContent = 'As senhas não coincidem.'; return; }
  const button = event.target.querySelector('button'); button.disabled = true;
  try { await api('/password', { method: 'POST', body: JSON.stringify(values) }); event.target.reset(); showLogin(); toast('Senha alterada. Entre novamente.'); }
  catch (error) { if ($('#password-error')) $('#password-error').textContent = error.message; } finally { button.disabled = false; }
});
function exportCsv() {
  // Neutraliza fórmulas ao abrir conteúdo fornecido por usuários no Excel.
  const cell = value => `"${String(value ?? '').replace(/^[\s]*[=+@-]/, "'$&").replaceAll('"', '""')}"`;
  const rows = [['Data', 'Tipo', 'Descrição', 'Clínica', 'Valor (R$)'], ...state.entries.map(e => [displayDate(e.occurred_on), e.kind === 'income' ? 'Receita' : 'Despesa', e.description, e.client_name || '', (e.amount_cents / 100).toFixed(2).replace('.', ',')])];
  const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(row => row.map(cell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = `VetCare-Financeiro-${month}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
if (window.vetcareDesktop) {
  document.title = 'VetCare Gestão · Aplicativo Windows';
  $('.login-card>small').textContent = 'Use sua conta empresarial de sócio. É necessária conexão com a internet. As contas são liberadas pelo administrador do VetCare.';
  $('.login-story>small').textContent = 'Aplicativo Windows · acesso exclusivo dos sócios';
}
try { await enter(await api('/me')); } catch { showLogin(); }
