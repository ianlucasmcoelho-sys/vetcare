import { apiGet } from './api';

export async function loadPatientContext(context) {
  if (!context.animal_id) return { animal: null, tutor: null };
  const response = await apiGet(`/animais/${context.animal_id}`);
  if (!response?.ok) throw new Error('Não foi possível carregar o paciente. Volte ao perfil e tente novamente.');
  const animal = await response.json();
  if (animal.obito) throw new Error('Este paciente possui óbito registrado. Seu histórico permanece disponível para consulta.');
  let tutor = null;
  if (animal.responsavel_id) {
    const tutorResponse = await apiGet(`/responsaveis/${animal.responsavel_id}`);
    if (!tutorResponse?.ok) throw new Error('Não foi possível carregar o tutor do paciente. Tente novamente.');
    tutor = await tutorResponse.json();
  }
  return { animal, tutor };
}
