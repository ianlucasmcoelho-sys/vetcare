import { openDb } from './src/db.js';

const clinicaId = 5;
const hoje = new Date().toISOString().split('T')[0];

async function populate() {
  const db = await openDb();

  // Limpar dados anteriores
  await db.run(`DELETE FROM responsaveis WHERE clinica_id = ?`, [clinicaId]);
  await db.run(`DELETE FROM animais WHERE clinica_id = ?`, [clinicaId]);
  await db.run(`DELETE FROM agendamentos WHERE clinica_id = ?`, [clinicaId]);
  await db.run(`DELETE FROM financeiro WHERE clinica_id = ?`, [clinicaId]);

  // Insert Responsaveis
  await db.run(`INSERT INTO responsaveis (clinica_id, nome, cpf, email, telefone, endereco) VALUES (?, ?, ?, ?, ?, ?)`, [clinicaId, 'João Silva', '111.111.111-11', 'joao@example.com', '11999999999', 'Rua A, 123']);
  await db.run(`INSERT INTO responsaveis (clinica_id, nome, cpf, email, telefone, endereco) VALUES (?, ?, ?, ?, ?, ?)`, [clinicaId, 'Maria Oliveira', '222.222.222-22', 'maria@example.com', '11988888888', 'Rua B, 456']);
  await db.run(`INSERT INTO responsaveis (clinica_id, nome, cpf, email, telefone, endereco) VALUES (?, ?, ?, ?, ?, ?)`, [clinicaId, 'Carlos Souza', '333.333.333-33', 'carlos@example.com', '11977777777', 'Rua C, 789']);

  const responsaveis = await db.all(`SELECT id FROM responsaveis WHERE clinica_id = ? ORDER BY id ASC LIMIT 3`, [clinicaId]);
  if (responsaveis.length < 3) return console.log("Erro ao buscar responsaveis");
  
  const idResp1 = responsaveis[0].id;
  const idResp2 = responsaveis[1].id;
  const idResp3 = responsaveis[2].id;

  // Insert Animais
  await db.run(`INSERT INTO animais (clinica_id, responsavel_id, nome, especie, raca, idade, sexo) VALUES (?, ?, ?, ?, ?, ?, ?)`, [clinicaId, idResp1, 'Rex', 'Cachorro', 'Golden Retriever', 3, 'Macho']);
  await db.run(`INSERT INTO animais (clinica_id, responsavel_id, nome, especie, raca, idade, sexo) VALUES (?, ?, ?, ?, ?, ?, ?)`, [clinicaId, idResp1, 'Bolinha', 'Gato', 'Siamês', 2, 'Macho']);
  await db.run(`INSERT INTO animais (clinica_id, responsavel_id, nome, especie, raca, idade, sexo) VALUES (?, ?, ?, ?, ?, ?, ?)`, [clinicaId, idResp2, 'Luna', 'Cachorro', 'Poodle', 5, 'Fêmea']);
  await db.run(`INSERT INTO animais (clinica_id, responsavel_id, nome, especie, raca, idade, sexo) VALUES (?, ?, ?, ?, ?, ?, ?)`, [clinicaId, idResp3, 'Mia', 'Gato', 'Persa', 1, 'Fêmea']);
  await db.run(`INSERT INTO animais (clinica_id, responsavel_id, nome, especie, raca, idade, sexo) VALUES (?, ?, ?, ?, ?, ?, ?)`, [clinicaId, idResp3, 'Thor', 'Cachorro', 'Bulldog', 4, 'Macho']);

  const animais = await db.all(`SELECT id FROM animais WHERE clinica_id = ? ORDER BY id ASC LIMIT 5`, [clinicaId]);
  if (animais.length < 5) return console.log("Erro ao buscar animais");

  const idAnim1 = animais[0].id; // Rex
  const idAnim2 = animais[1].id; // Bolinha
  const idAnim3 = animais[2].id; // Luna

  // Insert Agendamentos
  await db.run(`INSERT INTO agendamentos (clinica_id, animal_id, data, horario, tipo_servico, status, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?)`, [clinicaId, idAnim1, hoje, '10:00', 'Consulta de Rotina', 'confirmado', 'Tutor vai atrasar 10 min']);
  await db.run(`INSERT INTO agendamentos (clinica_id, animal_id, data, horario, tipo_servico, status, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?)`, [clinicaId, idAnim2, hoje, '11:00', 'Vacinação V10', 'concluido', 'Tudo OK']);
  await db.run(`INSERT INTO agendamentos (clinica_id, animal_id, data, horario, tipo_servico, status, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?)`, [clinicaId, idAnim3, hoje, '14:30', 'Avaliação Cirúrgica', 'agendado', 'Trazer exames']);

  // Insert Financeiro
  await db.run(`INSERT INTO financeiro (clinica_id, tipo, descricao, valor, data) VALUES (?, ?, ?, ?, ?)`, [clinicaId, 'receita', 'Consulta Especialista', 250.00, hoje]);
  await db.run(`INSERT INTO financeiro (clinica_id, tipo, descricao, valor, data) VALUES (?, ?, ?, ?, ?)`, [clinicaId, 'receita', 'Exame de Sangue', 120.00, hoje]);
  await db.run(`INSERT INTO financeiro (clinica_id, tipo, descricao, valor, data) VALUES (?, ?, ?, ?, ?)`, [clinicaId, 'receita', 'Vacina V10', 80.00, hoje]);
  await db.run(`INSERT INTO financeiro (clinica_id, tipo, descricao, valor, data) VALUES (?, ?, ?, ?, ?)`, [clinicaId, 'receita', 'Cirurgia Castração', 850.00, hoje]);
  await db.run(`INSERT INTO financeiro (clinica_id, tipo, descricao, valor, data) VALUES (?, ?, ?, ?, ?)`, [clinicaId, 'despesa', 'Material de Limpeza', 150.00, hoje]);
  await db.run(`INSERT INTO financeiro (clinica_id, tipo, descricao, valor, data) VALUES (?, ?, ?, ?, ?)`, [clinicaId, 'despesa', 'Fornecedor Medicamentos', 450.00, hoje]);
  await db.run(`INSERT INTO financeiro (clinica_id, tipo, descricao, valor, data) VALUES (?, ?, ?, ?, ?)`, [clinicaId, 'despesa', 'Conta de Luz', 300.00, hoje]);
  await db.run(`INSERT INTO financeiro (clinica_id, tipo, descricao, valor, data) VALUES (?, ?, ?, ?, ?)`, [clinicaId, 'receita', 'Consulta de rotina', 90.00, hoje]);

  console.log('Tudo mockado com sucesso!');
}

populate();
