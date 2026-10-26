import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiPrinter, FiX, FiDownload } from 'react-icons/fi';
import { medicalRecordDocument } from '../utils/medicalRecordDocument';
import './MedicalRecordPreview.css';

export default function MedicalRecordPreview({ records, patient, onClose, onDownload }) {
  const frame = useRef(null);
  const close = useRef(null);
  const [ready, setReady] = useState(false);
  const clinic = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('usuario'))?.clinica || {}; } catch { return {}; }
  }, []);
  const document = useMemo(() => medicalRecordDocument(records, patient, clinic), [records, patient, clinic]);
  useEffect(() => {
    const previous = window.document.activeElement;
    const overflow = window.document.body.style.overflow;
    window.document.body.style.overflow = 'hidden';
    close.current?.focus();
    const keydown = event => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const controls = [...close.current.closest('[role="dialog"]').querySelectorAll('button:not(:disabled), iframe')];
        if (event.shiftKey && window.document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
        else if (!event.shiftKey && window.document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
      }
    };
    window.document.addEventListener('keydown', keydown);
    return () => { window.document.body.style.overflow = overflow; window.document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [onClose]);
  return createPortal(<div className="record-preview-overlay" onClick={onClose}>
    <div className="record-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="record-preview-title" onClick={event => event.stopPropagation()}>
      <header className="record-preview-toolbar">
        <div><h2 id="record-preview-title">Prontuário médico</h2><p>Pré-visualização para impressão em A4</p></div>
        <div className="record-preview-actions">
          {onDownload && <button type="button" onClick={onDownload}><FiDownload /> Baixar PDF</button>}
          <button type="button" className="record-preview-print" disabled={!ready} onClick={() => { frame.current?.contentWindow?.focus(); frame.current?.contentWindow?.print(); }}><FiPrinter /> Imprimir</button>
          <button type="button" ref={close} aria-label="Fechar pré-visualização" onClick={onClose}><FiX /></button>
        </div>
      </header>
      <div className="record-preview-paper"><iframe ref={frame} title="Prontuário para impressão" sandbox="allow-same-origin allow-modals" srcDoc={document} onLoad={() => { setReady(true); if (frame.current) frame.current.style.height = `${frame.current.contentDocument?.documentElement.scrollHeight || 1123}px`; }} /></div>
    </div>
  </div>, window.document.body);
}
