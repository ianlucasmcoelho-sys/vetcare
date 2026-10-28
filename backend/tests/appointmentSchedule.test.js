import test from 'node:test';
import assert from 'node:assert/strict';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { mkdtemp, rm, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { saveAppointment, dayAvailability, saveSchedule, defaultSchedule, validateScheduleDate, normalizeSchedule } from '../src/services/appointmentSchedule.js';

const schema = `CREATE TABLE clinicas(id INTEGER PRIMARY KEY);
CREATE TABLE usuarios(id INTEGER PRIMARY KEY, clinica_id INTEGER, nome TEXT, perfil TEXT, ativo INTEGER);
CREATE TABLE animais(id INTEGER PRIMARY KEY, clinica_id INTEGER, nome TEXT, obito INTEGER);
CREATE TABLE agenda_expediente(clinica_id INTEGER PRIMARY KEY, inicio TEXT DEFAULT '08:00', fim TEXT DEFAULT '18:00', pausa_inicio TEXT DEFAULT '12:00', pausa_fim TEXT DEFAULT '13:00', intervalo INTEGER DEFAULT 30, dias_semana TEXT DEFAULT '[1,2,3,4,5]');
CREATE TABLE agendamentos(id INTEGER PRIMARY KEY AUTOINCREMENT, clinica_id INTEGER, animal_id INTEGER, data TEXT, horario TEXT, tipo_servico TEXT, status TEXT, domiciliar INTEGER, observacoes TEXT, veterinario_id INTEGER, duracao_minutos INTEGER DEFAULT 30, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
INSERT INTO clinicas VALUES(1),(2);
INSERT INTO usuarios VALUES(1,1,'Vet Um','veterinario',1),(2,1,'Vet Dois','veterinario',1),(3,2,'Outra clínica','veterinario',1),(4,1,'Inativo','veterinario',0);
INSERT INTO animais VALUES(1,1,'Luna',0),(2,2,'Outro paciente',0),(3,1,'Paciente falecido',1);`;
const booking = {animal_id:1,data:'2026-10-28',horario:'09:00',veterinario_id:1,duracao_minutos:60,tipo_servico:'Consulta'};
async function fixture() { const db=await open({filename:':memory:',driver:sqlite3.Database});await db.exec(schema);return db; }

test('agenda valida expediente, pausas, datas e dias da semana', async () => {
  const db=await fixture();
  try {
    assert.throws(()=>validateScheduleDate('2026-02-30'),error=>error.httpStatus===400);
    assert.throws(()=>normalizeSchedule({...defaultSchedule,dias_semana:'invalid'}),error=>error.httpStatus===400);
    assert.throws(()=>normalizeSchedule({...defaultSchedule,pausa_fim:''}),error=>error.httpStatus===400);
    await assert.rejects(()=>saveAppointment(db,1,{...booking,horario:'12:00'}),error=>error.httpStatus===400);
    await assert.rejects(()=>saveAppointment(db,1,{...booking,data:'2026-11-01'}),error=>error.httpStatus===400);
    await assert.rejects(()=>saveAppointment(db,1,{...booking,horario:'17:30'}),error=>error.httpStatus===400);
    await assert.rejects(()=>saveAppointment(db,1,{...booking,duracao_minutos:0}),error=>error.httpStatus===400);
    assert.equal((await dayAvailability(db,1,{data:'2026-11-01'})).aberto,false);
    await saveSchedule(db,1,{...defaultSchedule,dias_semana:[0],pausa_inicio:'',pausa_fim:''});
    assert.equal((await dayAvailability(db,1,{data:'2026-11-01'})).aberto,true);
  } finally { await db.close(); }
});

test('evita sobreposição por duração e profissional e permite horários adjacentes', async () => {
  const db=await fixture();
  try {
    const first=await saveAppointment(db,1,booking);
    await assert.rejects(()=>saveAppointment(db,1,{...booking,horario:'09:30'}),error=>error.httpStatus===409);
    assert.ok((await saveAppointment(db,1,{...booking,horario:'10:00'})).id);
    assert.ok((await saveAppointment(db,1,{...booking,veterinario_id:2})).id);
    await assert.rejects(()=>saveAppointment(db,1,{...booking,horario:'09:30',veterinario_id:null}),error=>error.httpStatus===409);
    const availability=await dayAvailability(db,1,{data:booking.data,veterinario_id:1,duracao_minutos:30});
    assert.equal(availability.horarios.find(row=>row.horario==='09:30').disponivel,false);
    assert.equal(availability.horarios.find(row=>row.horario==='11:00').disponivel,true);
    assert.equal(availability.horarios.find(row=>row.horario==='12:00').motivo,'Intervalo');
    await saveAppointment(db,1,{...booking,data:'2026-10-29'});
    await assert.rejects(()=>saveAppointment(db,1,{data:'2026-10-29'},first.id),error=>error.httpStatus===409);
  } finally { await db.close(); }
});

test('cancelamento libera o horário, reativação verifica conflito e dados de outras clínicas são negados', async () => {
  const db=await fixture();
  try {
    const first=await saveAppointment(db,1,booking);
    await saveAppointment(db,1,{status:'Cancelado'},first.id);
    await saveAppointment(db,1,booking);
    await assert.rejects(()=>saveAppointment(db,1,{status:'Agendado'},first.id),error=>error.httpStatus===409);
    await assert.rejects(()=>saveAppointment(db,1,{...booking,animal_id:2}),error=>error.httpStatus===404);
    await assert.rejects(()=>saveAppointment(db,1,{...booking,veterinario_id:3}),error=>error.httpStatus===404);
    await assert.rejects(()=>saveAppointment(db,1,{...booking,veterinario_id:4}),error=>error.httpStatus===404);
    await assert.rejects(()=>saveAppointment(db,2,{status:'Cancelado'},first.id),error=>error.httpStatus===404);
    await assert.rejects(()=>dayAvailability(db,1,{data:booking.data,veterinario_id:3}),error=>error.httpStatus===404);
    await assert.rejects(()=>saveAppointment(db,1,{...booking,animal_id:3}),error=>error.httpStatus===400);
    assert.deepEqual((await dayAvailability(db,2,{data:booking.data})).agendamentos,[]);
  } finally { await db.close(); }
});

test('uma reserva sem profissional ocupa a agenda da clínica para todos os profissionais', async () => {
  const db=await fixture();
  try {
    await saveAppointment(db,1,{...booking,veterinario_id:null});
    for(const id of [1,2]) {
      const availability=await dayAvailability(db,1,{data:booking.data,veterinario_id:id});
      assert.equal(availability.horarios.find(row=>row.horario==='09:00').disponivel,false);
    }
  } finally { await db.close(); }
});

test('horários legados sem zero inicial continuam visíveis e bloqueiam o intervalo correto', async () => {
  const db=await fixture();
  try {
    await db.run("INSERT INTO agendamentos(clinica_id,animal_id,data,horario,status,duracao_minutos) VALUES(1,1,'2026-10-28','9:00','Agendado',60)");
    const availability=await dayAvailability(db,1,{data:booking.data,veterinario_id:1});
    assert.equal(availability.agendamentos[0].horario,'09:00');
    assert.equal(availability.horarios.find(row=>row.horario==='09:30').disponivel,false);
    assert.equal(availability.horarios.find(row=>row.horario==='10:00').disponivel,true);
  } finally { await db.close(); }
});

test('requisições simultâneas não reservam duas vezes o mesmo horário', async () => {
  const folder=await mkdtemp(join(tmpdir(),'vetcare-schedule-'));const filename=join(folder,'appointments.db');
  const one=await open({filename,driver:sqlite3.Database});const two=await open({filename,driver:sqlite3.Database});
  try {
    await one.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');await two.exec('PRAGMA busy_timeout=5000;');await one.exec(schema);
    const reserve=async db=>{await db.exec('BEGIN TRANSACTION');try{const row=await saveAppointment(db,1,booking);await db.exec('COMMIT');return row;}catch(error){await db.exec('ROLLBACK');throw error;}};
    const results=await Promise.allSettled([reserve(one),reserve(two)]);
    assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
    assert.equal(results.find(result=>result.status==='rejected').reason.httpStatus,409);
    assert.equal((await one.get('SELECT COUNT(*) AS total FROM agendamentos')).total,1);
  } finally {
    await one.close();await two.close();
    for(const suffix of ['', '-wal', '-shm'])await rm(filename+suffix,{force:true});await rmdir(folder);
  }
});
