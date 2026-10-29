// frontend/src/services/api.js
const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }
  if (typeof window !== 'undefined' && window.location) {
    // Se estiver em HTTPS ou produção com domínio, usa a mesma origem via proxy reverso (/api)
    if (window.location.protocol === 'https:' || import.meta.env.PROD) {
      return `${window.location.origin}/api`;
    }
    return `http://${window.location.hostname}:3001/api`;
  }
  return 'http://localhost:3001/api';
};

export const API_URL = getApiUrl();
export const BASE_URL = API_URL.replace('/api', '');

export const api = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const headers = {
    ...(!(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('session-expired'));
        if (window.location.pathname !== '/login' && window.location.pathname !== '/cadastro') {
          window.location.href = '/login?reason=expired';
        }
      }
      return null;
    }

    if (response.status === 402) {
      if (window.location.pathname !== '/planos') {
        window.location.href = '/planos';
      }
      return response;
    }

    return response;
  } catch (error) {
    if (error.name !== 'AbortError') console.error('Erro na requisição:', error);
    throw error;
  }
};

export const apiGet = (endpoint) => api(endpoint);
export const apiPost = (endpoint, data) => api(endpoint, { method: 'POST', body: JSON.stringify(data) });
export const apiPut = (endpoint, data) => api(endpoint, { method: 'PUT', body: JSON.stringify(data) });
export const apiPatch = (endpoint, data) => api(endpoint, { method: 'PATCH', body: JSON.stringify(data) });
export const apiDelete = (endpoint) => api(endpoint, { method: 'DELETE' });
