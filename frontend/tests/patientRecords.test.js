import test from 'node:test';
import assert from 'node:assert/strict';
import { recordBelongsToPatient } from '../src/utils/patientRecords.js';

test('pacientes homônimos não compartilham o histórico clínico', () => {
  const patient = { id: 1, nome: 'Luna', tutor_nome: 'Ana' };
  assert.equal(recordBelongsToPatient({ animal_id: 2, pet_nome: 'Luna', tutor_nome: 'Ana' }, patient), false);
  assert.equal(recordBelongsToPatient({ animal_id: '1', pet_nome: 'Nome anterior' }, patient), true);
  assert.equal(recordBelongsToPatient({ pet_nome: 'Luna', tutor_nome: 'Bia' }, patient), false);
  assert.equal(recordBelongsToPatient({ pet_nome: ' LUNA ', tutor_nome: 'ana' }, patient), true);
  assert.equal(recordBelongsToPatient({ pet_nome: 'Luna' }, patient), false);
});
