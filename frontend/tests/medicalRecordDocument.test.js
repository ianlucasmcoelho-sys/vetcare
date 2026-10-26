import test from 'node:test';
import assert from 'node:assert/strict';
import { medicalRecordDocument } from '../src/utils/medicalRecordDocument.js';

test('prontuário escapa dados do paciente, clínica e conteúdo clínico', () => {
  const html = medicalRecordDocument([
    { data_visita: '2026-10-26', sintomas: '<img src=x onerror=alert(1)>', diagnostico: 'Linha 1\nLinha 2' }
  ], { nome: '<script>paciente</script>', tutor_nome: 'Ana & João' }, { nome: '<script>clínica</script>' });
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(html.includes('Ana &amp; João'));
  assert.ok(html.includes('26/10/2026'));
  assert.ok(html.includes('Linha 1\nLinha 2'));
});

test('prontuário inclui todos os atendimentos e configuração de impressão A4', () => {
  const html = medicalRecordDocument([{ diagnostico: 'Primeiro' }, { diagnostico: 'Segundo' }]);
  assert.equal((html.match(/<article>/g) || []).length, 2);
  assert.ok(html.includes('Primeiro') && html.includes('Segundo'));
  assert.ok(html.includes('@page { size: A4'));
  assert.ok(medicalRecordDocument([]).includes('Nenhum atendimento clínico registrado.'));
});
