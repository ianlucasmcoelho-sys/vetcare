// backend/src/jobs/lembreteJobs.js
import { openDb } from '../db.js';
import { 
  enviarLembreteConsulta, 
  enviarLembreteVacina, 
  enviarLembreteRetorno,
  enviarConfirmacaoAgendamento
} from '../services/whatsappService.js';

// Enviar lembretes de consultas do dia seguinte
export const enviarLembretesConsultas = async () => {
  const db = await openDb();
  
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  const dataAmanha = amanha.toISOString().split('T')[0];
  
  const consultas = await db.all(`
    SELECT a.*, an.nome as pet_nome, r.celular as tutor_celular, r.nome as tutor_nome
    FROM agendamentos a
    LEFT JOIN animais an ON a.animal_id = an.id
    LEFT JOIN responsaveis r ON an.responsavel_id = r.id
    WHERE a.data = ? AND a.status = 'Agendado'
  `, [dataAmanha]);
  
  let enviados = 0;
  for (const consulta of consultas) {
    if (consulta.tutor_celular) {
      await enviarLembreteConsulta(
        consulta.tutor_celular,
        consulta.pet_nome,
        consulta.data,
        consulta.horario
      );
      enviados++;
    }
  }
  
  console.log(`📱 Lembretes de consulta enviados: ${enviados}`);
  return enviados;
};

// Enviar lembretes de vacinas próximas
export const enviarLembretesVacinas = async () => {
  const db = await openDb();
  
  const hoje = new Date();
  const dataHoje = hoje.toISOString().split('T')[0];
  const semanaQueVem = new Date();
  semanaQueVem.setDate(semanaQueVem.getDate() + 7);
  const dataLimite = semanaQueVem.toISOString().split('T')[0];
  
  const vacinas = await db.all(`
    SELECT v.*, a.nome as pet_nome, r.celular as tutor_celular, r.nome as tutor_nome
    FROM vacinas v
    LEFT JOIN animais a ON v.animal_id = a.id
    LEFT JOIN responsaveis r ON a.responsavel_id = r.id
    WHERE v.proxima_dose BETWEEN ? AND ?
  `, [dataHoje, dataLimite]);
  
  let enviados = 0;
  for (const vacina of vacinas) {
    if (vacina.tutor_celular) {
      await enviarLembreteVacina(
        vacina.tutor_celular,
        vacina.pet_nome,
        vacina.nome_vacina,
        vacina.proxima_dose
      );
      enviados++;
    }
  }
  
  console.log(`💉 Lembretes de vacina enviados: ${enviados}`);
  return enviados;
};

// Enviar lembretes de retornos
export const enviarLembretesRetornos = async () => {
  const db = await openDb();
  
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  const dataAmanha = amanha.toISOString().split('T')[0];
  
  const retornos = await db.all(`
    SELECT r.*
    FROM retornos r
    WHERE r.data_retorno = ? AND r.status = 'Pendentes'
  `, [dataAmanha]);
  
  let enviados = 0;
  for (const retorno of retornos) {
    const tutor = await db.get('SELECT celular FROM responsaveis WHERE nome = ?', [retorno.tutor_nome]);
    if (tutor && tutor.celular) {
      await enviarLembreteRetorno(
        tutor.celular,
        retorno.pet_nome,
        retorno.data_retorno,
        retorno.motivo || "Retorno agendado"
      );
      enviados++;
    }
  }
  
  console.log(`📅 Lembretes de retorno enviados: ${enviados}`);
  return enviados;
};

// Enviar confirmação de agendamento (quando criado)
export const enviarConfirmacao = async (agendamentoId) => {
  const db = await openDb();
  
  const consulta = await db.get(`
    SELECT a.*, an.nome as pet_nome, r.celular as tutor_celular, r.nome as tutor_nome
    FROM agendamentos a
    LEFT JOIN animais an ON a.animal_id = an.id
    LEFT JOIN responsaveis r ON an.responsavel_id = r.id
    WHERE a.id = ?
  `, [agendamentoId]);
  
  if (consulta && consulta.tutor_celular) {
    await enviarConfirmacaoAgendamento(
      consulta.tutor_celular,
      consulta.pet_nome,
      consulta.data,
      consulta.horario,
      consulta.tipo_servico
    );
    return true;
  }
  return false;
};