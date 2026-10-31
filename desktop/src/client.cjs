const PRODUCTION_ORIGIN = 'https://vetcaresistema.com';
function createClient({ request = fetch, origin = PRODUCTION_ORIGIN, development = false } = {}) {
  const target = new URL(origin);
  if (target.origin !== PRODUCTION_ORIGIN && !(development && target.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(target.hostname))) throw new Error('Servidor VetCare não autorizado.');
  let token = null, revision = 0;
  const failure = (status, error) => ({ status, data: { error } });
  return {
    async invoke(path, options = {}) {
      const method = options?.method || 'GET';
      const routes = { '/login': ['POST', 'login'], '/me': ['GET', 'me'], '/logout': ['POST', 'logout'], '/password': ['POST', 'password'] };
      let route, payload, month;
      if (typeof path !== 'string' || path.length > 100 || !options || typeof options !== 'object') return failure(400, 'Solicitação inválida.');
      if (path.startsWith('/data?month=')) {
        month = path.slice('/data?month='.length);
        if (method !== 'GET' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return failure(400, 'Mês inválido.');
        route = 'overview';
      } else {
        const match = routes[path];
        if (!match || match[0] !== method) return failure(400, 'Operação não permitida no aplicativo.');
        route = match[1];
      }
      if (route !== 'login' && !token) return failure(401, 'Entre com sua conta de sócio.');
      if (route === 'login' || route === 'password') {
        try { payload = typeof options.body === 'string' && options.body.length <= 4096 ? JSON.parse(options.body) : null; } catch { return failure(400, 'Dados inválidos.'); }
        if (!payload || typeof payload !== 'object') return failure(400, 'Dados inválidos.');
        if (route === 'login') {
          if (typeof payload.email !== 'string' || payload.email.length > 254 || typeof payload.password !== 'string' || payload.password.length > 256) return failure(400, 'E-mail ou senha inválidos.');
          payload = { email: payload.email, password: payload.password };
        } else {
          if (typeof payload.current !== 'string' || payload.current.length > 256 || typeof payload.password !== 'string' || payload.password.length < 12 || payload.password.length > 256) return failure(400, 'Use uma senha de 12 a 256 caracteres.');
          payload = { current: payload.current, password: payload.password };
        }
      }
      const url = new URL(`/api/company/desktop/${route}`, target);
      if (month) url.searchParams.set('month', month);
      const requestToken = token, requestRevision = revision;
      if (route === 'login') { token = null; revision++; }
      if (route === 'logout') { token = null; revision++; }
      try {
        const response = await request(url, { method, headers: { 'Content-Type': 'application/json', ...(requestToken && route !== 'login' ? { Authorization: `Bearer ${requestToken}` } : {}) },
          ...(payload ? { body: JSON.stringify(payload) } : {}), redirect: 'error', signal: AbortSignal.timeout(30000) });
        if (response.status === 404) return failure(503, 'A integração do aplicativo ainda não foi publicada no servidor VetCare.');
        const data = await response.json();
        if (!response.ok) {
          if (response.status === 401 && requestRevision === revision) { token = null; revision++; }
          return failure(response.status, typeof data.error === 'string' ? data.error.slice(0, 300) : 'Não foi possível concluir.');
        }
        if (route === 'login') {
          if (typeof data.token !== 'string' || !/^[a-f0-9]{64}$/.test(data.token) || !data.owner?.name || !data.owner?.email) return failure(502, 'Resposta de acesso inválida.');
          if (revision !== requestRevision + 1) return failure(401, 'Acesso cancelado. Entre novamente.');
          token = data.token; return { status: 200, data: { id: data.owner.id, name: data.owner.name, email: data.owner.email } };
        }
        if (route === 'password') { token = null; revision++; return { status: 200, data: { ok: true } }; }
        if (route === 'logout') return { status: 200, data: { ok: true } };
        if (requestRevision !== revision) return failure(401, 'Sessão encerrada.');
        if (route === 'me') return { status: 200, data: { id: data.id, name: data.name, email: data.email } };
        if (!data.automatic || data.month !== month || !Array.isArray(data.clients) || !Array.isArray(data.plans) || !Array.isArray(data.entries) || !data.summary || !data.sync) return failure(502, 'Resposta de gestão inválida.');
        return { status: 200, data };
      } catch {
        if (route === 'logout') return { status: 200, data: { ok: true } };
        return failure(503, 'Não foi possível conectar ao VetCare. Verifique sua internet e tente novamente.');
      }
    }
  };
}
module.exports = { createClient, PRODUCTION_ORIGIN };
