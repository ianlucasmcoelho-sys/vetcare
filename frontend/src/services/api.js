// frontend/src/services/api.js
export const API_URL = import.meta.env.VITE_API_URL || 'http://192.168.1.163:3001/api';
export const BASE_URL = API_URL.replace('/api', '');

export const api = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
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
      // Evitar loop infinito se já estiver no login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return null;
    }

    return response;
  } catch (error) {
    console.error('Erro na requisição:', error);
    throw error;
  }
};

export const apiGet = (endpoint) => api(endpoint);
export const apiPost = (endpoint, data) => api(endpoint, { method: 'POST', body: JSON.stringify(data) });
export const apiPut = (endpoint, data) => api(endpoint, { method: 'PUT', body: JSON.stringify(data) });
export const apiPatch = (endpoint, data) => api(endpoint, { method: 'PATCH', body: JSON.stringify(data) });
export const apiDelete = (endpoint) => api(endpoint, { method: 'DELETE' });