import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuickContext } from '../src/utils/quickCreateContext.js';

test('ações rápidas preservam somente IDs e dados de agenda válidos', () => {
  assert.deepEqual(parseQuickContext(new URLSearchParams('animal_id=12&tutor_id=3&data=2026-10-28&horario=09:30&veterinario_id=7&duracao_minutos=45&nome=ignorado')), {animal_id:'12',tutor_id:'3',veterinario_id:'7',data:'2026-10-28',horario:'09:30',duracao_minutos:45});
  assert.deepEqual(parseQuickContext(new URLSearchParams('animal_id=12abc&tutor_id=-1&data=2026-02-30&horario=25:00&veterinario_id=0&duracao_minutos=999')),{});
});
