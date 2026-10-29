export function recordBelongsToPatient(record, patient) {
  if (!record || !patient) return false;
  if (record.animal_id) return String(record.animal_id) === String(patient.id);
  // Legacy records without an ID need both patient and tutor to match.
  const normalize = value => String(value || '').trim().toLocaleLowerCase('pt-BR');
  return Boolean(record.pet_nome && record.tutor_nome && patient.tutor_nome) &&
    normalize(record.pet_nome) === normalize(patient.nome) &&
    normalize(record.tutor_nome) === normalize(patient.tutor_nome);
}
