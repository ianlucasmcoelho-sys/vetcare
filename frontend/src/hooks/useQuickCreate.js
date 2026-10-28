import { useEffect, useRef } from 'react';
import { parseQuickContext, quickContextKeys } from '../utils/quickCreateContext';
import { useSearchParams } from 'react-router-dom';

// Consume the intent once, so closing the form or refreshing does not reopen it.
export default function useQuickCreate(openForm, enabled = true) {
  const [params, setParams] = useSearchParams();
  const handled = useRef(null);
  useEffect(() => {
    if (params.get('novo') !== '1') { handled.current = null; return; }
    const key = params.toString();
    if (handled.current === key) return;
    handled.current = key;
    if (enabled) Promise.resolve(openForm(parseQuickContext(params))).catch(error => window.alert(error.message || 'Não foi possível abrir o cadastro.'));
    const next = new URLSearchParams(params);
    next.delete('novo');
    quickContextKeys.forEach(key => next.delete(key));
    setParams(next, { replace: true });
  }, [params, setParams, openForm, enabled]);
}
