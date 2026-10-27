import test from 'node:test';
import assert from 'node:assert/strict';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { getClinicHome, getClinicalOverview, overviewDates } from '../src/services/clinicOverview.js';

const now = new Date('2026-10-27T15:00:00Z');
async function fixture() {
  const db = await open({ filename: ':memory:', driver: sqlite3.Database });
  await db.exec(`
    CREATE TABLE clinicas (id INTEGER PRIMARY KEY, nome TEXT, email TEXT, plano_id TEXT, status_assinatura TEXT, data_expiracao TEXT, created_at TEXT, cnpj TEXT, endereco TEXT, telefone TEXT);
    CREATE TABLE usuarios (id INTEGER PRIMARY KEY, clinica_id INTEGER, nome TEXT, perfil TEXT, ativo INTEGER);
    CREATE TABLE responsaveis (id INTEGER PRIMARY KEY, clinica_id INTEGER, nome TEXT, nascimento TEXT, created_at TEXT);
    CREATE TABLE animais (id INTEGER PRIMARY KEY, clinica_id INTEGER, nome TEXT, especie TEXT, nascimento TEXT, obito INTEGER, responsavel_id INTEGER, created_at TEXT);
    CREATE TABLE prontuarios (id INTEGER PRIMARY KEY, clinica_id INTEGER, animal_id INTEGER, pet_nome TEXT, data_visita TEXT, veterinario TEXT, diagnostico TEXT);
    CREATE TABLE vacinas (id INTEGER PRIMARY KEY, clinica_id INTEGER, animal_id INTEGER, nome_vacina TEXT, data_aplicacao TEXT, proxima_dose TEXT);
    CREATE TABLE exames (id INTEGER PRIMARY KEY, clinica_id INTEGER, data_solicitacao TEXT, status TEXT);
    CREATE TABLE receituario (id INTEGER PRIMARY KEY, clinica_id INTEGER, data_emissao TEXT);
    CREATE TABLE retornos (id INTEGER PRIMARY KEY, clinica_id INTEGER, animal_id INTEGER, pet_nome TEXT, tutor_nome TEXT, data_retorno TEXT, horario TEXT, motivo TEXT, status TEXT);
    CREATE TABLE agendamentos (id INTEGER PRIMARY KEY, clinica_id INTEGER, animal_id INTEGER, data TEXT, horario TEXT, tipo_servico TEXT, status TEXT);
    CREATE TABLE internacoes (id INTEGER PRIMARY KEY, clinica_id INTEGER, status TEXT);
    CREATE TABLE financeiro (id INTEGER PRIMARY KEY, clinica_id INTEGER, tipo TEXT, valor REAL, data TEXT);
    INSERT INTO clinicas VALUES (1,'Clínica Um','um@example.test','complete','active',NULL,'2025-01-01',NULL,NULL,NULL), (2,'Clínica Dois','dois@example.test','complete','active',NULL,'2025-01-01',NULL,NULL,NULL), (3,'Clínica Vazia','vazia@example.test','free','trial','2026-11-01','2026-10-27',NULL,NULL,NULL);
    INSERT INTO usuarios VALUES (1,1,'Profissional Um','admin',1),(2,1,'Inativo','veterinario',0),(3,2,'Outra clínica','admin',1);
    INSERT INTO responsaveis VALUES (1,1,'Tutor Um','1990-10-20','2026-10-01 12:00:00'),(2,2,'Tutor Outra Clínica','1990-10-20','2026-10-01');
    INSERT INTO animais VALUES (1,1,'Luna','Cachorro','2020-10-15',0,1,'2026-10-01'),(2,1,'Bob','Gato','2020-10-16',1,1,'2025-01-01'),(3,2,'Outro Pet','Gato','2020-10-15',0,2,'2026-10-01');
    INSERT INTO prontuarios VALUES (1,1,1,'Luna','2026-10-10','Profissional Um','Acompanhamento'),(2,1,1,'Luna','2026-09-27','Profissional Um','Registro anterior'),(3,1,1,'Luna','2026-10-28','Profissional Um','Registro futuro'),(4,2,3,'Outro Pet','2026-10-10','Outra clínica','Privado');
    INSERT INTO vacinas VALUES (1,1,1,'V10','2025-01-01','2026-10-01'),(2,1,1,'V10','2026-10-01','2027-10-01'),(3,1,1,'Gripe','2025-01-01','2026-10-26'),(4,1,1,'Raiva','2025-01-01','2026-10-27'),(5,2,3,'Raiva','2026-10-01','2026-10-20');
    INSERT INTO exames VALUES (1,1,'2026-10-01','pendente'),(2,2,'2026-10-01','pendente');
    INSERT INTO receituario VALUES (1,1,'2026-10-01'),(2,2,'2026-10-01');
    INSERT INTO retornos VALUES (1,1,1,'Luna','Tutor Um','2026-10-26','10:00','Revisão','Pendentes'),(2,1,1,'Luna','Tutor Um','2026-11-01','10:00','Revisão','Pendentes'),(3,1,1,'Luna','Tutor Um','2026-10-26','10:00','Concluído','Concluídos'),(4,2,3,'Outro Pet','Outro Tutor','2026-10-26','10:00','Privado','Pendentes');
    INSERT INTO agendamentos VALUES (1,1,1,'2026-10-27','08:00','Consulta','Concluído'),(2,1,1,'2026-10-27','10:00','Vacina','Agendado'),(3,1,1,'2026-10-27','12:00','Consulta','Cancelado'),(4,2,3,'2026-10-27','10:00','Privado','Agendado');
    INSERT INTO internacoes VALUES (1,1,'ativo'),(2,1,'alta'),(3,2,'ativo');
    INSERT INTO financeiro VALUES (1,1,'entrada',100,'2026-09-28'),(2,1,'saida',20,'2026-10-27'),(3,1,'entrada',500,'2026-09-27'),(4,1,'entrada',500,'2026-10-28'),(5,2,'entrada',9999,'2026-10-01');
  `);
  return db;
}

test('datas usam o calendário de São Paulo e 30 dias inclusivos', () => {
  assert.deepEqual(overviewDates(now), { hoje:'2026-10-27', inicio:'2026-09-28', mes:'10' });
  assert.equal(overviewDates(new Date('2026-10-28T01:00:00Z')).hoje, '2026-10-27');
});

test('início isola a clínica, separa vacinas e desconsidera agendamentos cancelados', async () => {
  const db = await fixture();
  try {
    const data = await getClinicHome(db, 1, now);
    assert.equal(data.agenda.total, 2);
    assert.deepEqual(data.agenda.itens.map(row => row.id), [1,2]);
    assert.equal(data.retornos.total, 2);
    assert.equal(data.retornos.atrasados, 1);
    assert.deepEqual(data.vacinas.vencidasItens.map(row => row.id), [3]);
    assert.deepEqual(data.vacinas.pendentesItens.map(row => row.id), [4]);
    assert.deepEqual(data.aniversarios.animais.map(row => row.id), [1]);
    assert.deepEqual(data.aniversarios.tutores.map(row => row.id), [1]);
    assert.ok(data.cadastros.animais.every(row => row.id !== 3));
    assert.ok(data.registros.every(row => row.pet_nome !== 'Outro Pet'));
    const empty = await getClinicHome(db, 3, now);
    assert.equal(empty.agenda.total, 0);
    assert.equal(empty.vacinas.vencidas, 0);
    assert.deepEqual(empty.vacinas.pendentesItens, []);
    assert.deepEqual(empty.registros, []);
  } finally { await db.close(); }
});

test('dashboard usa datas clínicas e não soma registros de outra clínica ou fora do período', async () => {
  const db = await fixture();
  try {
    const data = await getClinicalOverview(db, 1, 'admin', now);
    assert.deepEqual(data.indicadores.pacientes, {total:2, recentes:1});
    assert.deepEqual(data.indicadores.consultas, {total:3, recentes:1});
    assert.deepEqual(data.indicadores.vacinas, {total:4, recentes:1});
    assert.deepEqual(data.indicadores.prescricoes, {total:1, recentes:1});
    assert.deepEqual(data.prioridades, {internados:1, examesPendentes:1, retornosAtrasados:1});
    assert.deepEqual(data.especies, [{especie:'Cachorro', total:1}]);
    assert.deepEqual(data.equipe.map(row => row.id), [1]);
    assert.deepEqual(data.financeiro, {entradas:100, saidas:20});
    assert.equal((await getClinicalOverview(db, 1, 'user', now)).financeiro, null);
    await db.run("UPDATE clinicas SET plano_id = 'free', status_assinatura = 'trial' WHERE id = 1");
    assert.equal((await getClinicalOverview(db, 1, 'admin', now)).financeiro, null);
    const empty = await getClinicalOverview(db, 3, 'admin', now);
    assert.deepEqual(empty.indicadores.consultas, {total:0, recentes:0});
    assert.deepEqual(empty.especies, []);
  } finally { await db.close(); }
});
