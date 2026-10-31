import { useCallback, useEffect, useReducer, useState } from 'react';
import { api } from '../services/api';

export default function useOverview(endpoint) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, reload] = useReducer(value => value + 1, 0);
  const refresh = useCallback(() => reload(), []);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let busy = false;
    const load = async () => {
      if (busy) return;
      busy = true;
      setLoading(true);
      setError('');
      try {
        const response = await api(endpoint, { signal: controller.signal });
        if (!response?.ok) throw new Error('Não foi possível atualizar as informações. Tente novamente.');
        const result = await response.json();
        if (active) setData(result);
      } catch (err) {
        if (active && err.name !== 'AbortError') setError('Não foi possível atualizar as informações. Verifique sua conexão e tente novamente.');
      } finally {
        busy = false;
        if (active) setLoading(false);
      }
    };
    const whenVisible = () => { if (!document.hidden) void load(); };
    void load();
    const interval = setInterval(whenVisible, 300000);
    document.addEventListener('visibilitychange', whenVisible);
    return () => { active = false; controller.abort(); clearInterval(interval); document.removeEventListener('visibilitychange', whenVisible); };
  }, [endpoint, version]);
  return { data, loading, error, refresh };
}
