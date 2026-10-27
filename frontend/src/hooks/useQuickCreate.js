import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

// Consume the intent once, so closing the form or refreshing does not reopen it.
export default function useQuickCreate(openForm, enabled = true) {
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (params.get('novo') !== '1') return;
    if (enabled) openForm();
    const next = new URLSearchParams(params);
    next.delete('novo');
    setParams(next, { replace: true });
  }, [params, setParams, openForm, enabled]);
}
