export function createSystemSource(env = process.env, request = fetch) {
  return async month => {
    if (!env.MANAGEMENT_SOURCE_URL || !env.MANAGEMENT_SOURCE_TOKEN || env.MANAGEMENT_SOURCE_TOKEN.length < 32) {
      throw Object.assign(new Error('Configure a conexão com o sistema VetCare para carregar os dados automaticamente.'), { status: 503 });
    }
    const base = new URL(env.MANAGEMENT_SOURCE_URL);
    const local = env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
    if (base.username || base.password || (base.protocol !== 'https:' && !(local && base.protocol === 'http:'))) throw Object.assign(new Error('A conexão com o sistema precisa de um endereço HTTPS válido.'), { status: 503 });
    const url = new URL('/api/company/overview', base);
    url.searchParams.set('month', month);
    try {
      const response = await request(url, { headers: { Authorization: `Bearer ${env.MANAGEMENT_SOURCE_TOKEN}` }, signal: AbortSignal.timeout(30000), redirect: 'error' });
      if (!response.ok) throw new Error('Fonte indisponível');
      const data = await response.json();
      if (!data.automatic || data.month !== month || !Array.isArray(data.clients) || !Array.isArray(data.entries) || !Array.isArray(data.plans) || !data.summary || !data.sync) throw new Error('Fonte inválida');
      return data;
    } catch { throw Object.assign(new Error('Não foi possível atualizar os dados do VetCare. Verifique a conexão entre as aplicações.'), { status: 503 }); }
  };
}
