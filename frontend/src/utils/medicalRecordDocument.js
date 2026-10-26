export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const date = value => value ? escapeHtml(String(value).slice(0, 10).split('-').reverse().join('/')) : 'Não informado';

export function medicalRecordDocument(records, patient = {}, clinic = {}) {
  const fields = [['sintomas', 'Queixa e sintomas'], ['diagnostico', 'Diagnóstico'], ['tratamento', 'Conduta e tratamento'], ['prescricoes', 'Prescrições'], ['observacoes', 'Observações']];
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
    <title>Prontuário veterinário</title><style>
      * { box-sizing: border-box; } body { margin: 0; padding: 36px; background: white; color: #172b3a; font: 14px/1.6 Arial, sans-serif; }
      header { border-bottom: 3px solid #0f766e; padding-bottom: 18px; margin-bottom: 24px; } header p { margin: 4px 0; color: #526477; }
      h1 { margin: 8px 0; font-size: 24px; } h2 { font-size: 17px; color: #0f766e; margin: 24px 0 12px; } h3 { font-size: 13px; margin: 0 0 6px; color: #0f766e; }
      .brand { color: #0f766e; font-weight: bold; font-size: 18px; } .patient { background: #f0fdfa; border: 1px solid #b8dfd7; border-radius: 10px; padding: 16px; margin: 16px 0; }
      .patient p, .meta p { margin: 4px 0; } section { padding: 14px 0; border-bottom: 1px solid #dbe3e8; } section p { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
      .signature { margin: 40px 0 12px; border-top: 1px solid #94a3b8; padding-top: 8px; text-align: center; } footer { color: #64748b; font-size: 11px; margin-top: 28px; }
      h2, h3 { break-after: avoid; } .patient, .meta, .signature { break-inside: avoid; }
      @page { size: A4; margin: 16mm; } @media print { body { padding: 0; } header, .patient { print-color-adjust: exact; -webkit-print-color-adjust: exact; } article + article { break-before: page; } }
      @media (max-width: 480px) { body { padding: 18px; } h1 { font-size: 20px; } }
    </style></head><body>
    <header><div class="brand">${escapeHtml(clinic.nome || 'VetCare')}</div><h1>Prontuário médico veterinário</h1>
      ${clinic.endereco ? `<p>${escapeHtml(clinic.endereco)}</p>` : ''}${clinic.telefone ? `<p>${escapeHtml(clinic.telefone)}</p>` : ''}</header>
    <div class="patient"><p><strong>Paciente:</strong> ${escapeHtml(patient.nome || records[0]?.pet_nome || 'Não informado')}</p>
      <p><strong>Tutor:</strong> ${escapeHtml(patient.tutor_nome || records[0]?.tutor_nome || 'Não informado')}</p>
      ${patient.especie ? `<p><strong>Espécie / raça:</strong> ${escapeHtml(patient.especie)} / ${escapeHtml(patient.raca || 'Não informada')}</p>` : ''}</div>
    ${records.length ? records.map(record => `<article><h2>Atendimento de ${date(record.data_visita)}</h2>
      <div class="meta"><p><strong>Veterinário:</strong> ${escapeHtml(record.veterinario || 'Não informado')}</p>
      <p><strong>Peso:</strong> ${escapeHtml(record.peso ? `${record.peso} kg` : 'Não informado')} · <strong>Temperatura:</strong> ${escapeHtml(record.temperatura ? `${record.temperatura} °C` : 'Não informada')}</p></div>
      ${fields.map(([key, label]) => `<section><h3>${label}</h3><p>${escapeHtml(record[key] || 'Não informado')}</p></section>`).join('')}
      <section><h3>Retorno previsto</h3><p>${date(record.proxima_visita)}</p></section><div class="signature">${escapeHtml(record.veterinario || 'Médico veterinário responsável')}</div></article>`).join('') : '<p>Nenhum atendimento clínico registrado.</p>'}
    <footer>Documento emitido pelo VetCare. Informações conforme os registros da clínica.</footer></body></html>`;
}
