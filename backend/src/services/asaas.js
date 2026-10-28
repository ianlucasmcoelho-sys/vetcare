import axios from 'axios';

export function billingConfiguration(env = process.env) {
  const url = (env.ASAAS_API_URL || 'https://api-sandbox.asaas.com/v3').replace(/\/$/, '');
  const sandbox = url === 'https://api-sandbox.asaas.com/v3';
  const production = url === 'https://api.asaas.com/v3';
  const keyEnvironment = env.ASAAS_API_KEY?.startsWith('$aact_hmlg_') ? 'sandbox' : env.ASAAS_API_KEY?.startsWith('$aact_prod_') ? 'production' : null;
  const matchingKey = !keyEnvironment || (sandbox && keyEnvironment === 'sandbox') || (production && keyEnvironment === 'production');
  const validSecret = value => Boolean(value && !/sua_chave|defina_|exemplo|\.\.\./i.test(value));
  return { configured: (sandbox || production) && matchingKey && validSecret(env.ASAAS_API_KEY) && validSecret(env.ASAAS_WEBHOOK_TOKEN), sandbox, url };
}

// Axios errors contain secrets and card data; never log or return their configuration.
export function createAsaasGateway(env = process.env) {
  const config = billingConfiguration(env);
  const api = axios.create({ baseURL:config.url, timeout:65000, headers:{access_token:env.ASAAS_API_KEY,'Content-Type':'application/json','User-Agent':'VetCare/1.0'} });
  const request = async (method, path, data, params) => {
    try { return (await api.request({method,url:path,data,params})).data; }
    catch (cause) {
      const error = new Error('Não foi possível comunicar com o serviço de pagamentos.');
      error.httpStatus = cause.response?.status === 400 ? 400 : 502;
      error.uncertain = !cause.response || cause.response.status >= 500;
      if (cause.response?.status === 400) error.message = 'Pagamento recusado ou dados inválidos. Confira os dados do pagador e do cartão.';
      if ([401,403].includes(cause.response?.status)) error.message = 'O serviço de pagamentos precisa ser configurado pelo administrador do sistema.';
      throw error;
    }
  };
  return {
    configured:config.configured, sandbox:config.sandbox,
    createCustomer:data=>request('POST','/customers',data),
    createSubscription:data=>request('POST','/subscriptions',data),
    getSubscription:id=>request('GET',`/subscriptions/${encodeURIComponent(id)}`),
    listPayments:id=>request('GET',`/subscriptions/${encodeURIComponent(id)}/payments`,undefined,{limit:100}),
    getPayment:id=>request('GET',`/payments/${encodeURIComponent(id)}`),
    getPix:id=>request('GET',`/payments/${encodeURIComponent(id)}/pixQrCode`)
  };
}
