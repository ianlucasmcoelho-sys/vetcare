const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('clinica.db');

const clinicaId = 5;
const hoje = new Date().toISOString().split('T')[0];

db.serialize(() => {
  // Limpar dados anteriores de teste6 para não duplicar se rodar de novo
  db.run(`DELETE FROM responsaveis WHERE clinica_id = ?`, [clinicaId]);
  db.run(`DELETE FROM animais WHERE clinica_id = ?`, [clinicaId]);
  db.run(`DELETE FROM agendamentos WHERE clinica_id = ?`, [clinicaId]);
  db.run(`DELETE FROM financeiro WHERE clinica_id = ?`, [clinicaId]);

  // Insert Responsaveis
  const respStmt = db.prepare(`INSERT INTO responsaveis (clinica_id, nome, cpf, email, telefone, endereco) VALUES (?, ?, ?, ?, ?, ?)`);
  respStmt.run([clinicaId, 'João Silva', '111.111.111-11', 'joao@example.com', '11999999999', 'Rua A, 123']);
  respStmt.run([clinicaId, 'Maria Oliveira', '222.222.222-22', 'maria@example.com', '11988888888', 'Rua B, 456']);
  respStmt.run([clinicaId, 'Carlos Souza', '333.333.333-33', 'carlos@example.com', '11977777777', 'Rua C, 789']);
  respStmt.finalize();

  // Insert Animais (precisamos dos IDs dos responsaveis recem criados, vamos assumir os ultimos)
  db.all(`SELECT id FROM responsaveis WHERE clinica_id = ? ORDER BY id DESC LIMIT 3`, [clinicaId], (err, rows) => {
    if (err) return console.error(err);
    if (rows.length < 3) return console.log("Erro: responsaveis não inseridos");
    
    const idResp1 = rows[2].id;
    const idResp2 = rows[1].id;
    const idResp3 = rows[0].id;

    const animStmt = db.prepare(`INSERT INTO animais (clinica_id, responsavel_id, nome, especie, raca, idade, sexo) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    animStmt.run([clinicaId, idResp1, 'Rex', 'Cachorro', 'Golden Retriever', 3, 'Macho']);
    animStmt.run([clinicaId, idResp1, 'Bolinha', 'Gato', 'Siamês', 2, 'Macho']);
    animStmt.run([clinicaId, idResp2, 'Luna', 'Cachorro', 'Poodle', 5, 'Fêmea']);
    animStmt.run([clinicaId, idResp3, 'Mia', 'Gato', 'Persa', 1, 'Fêmea']);
    animStmt.run([clinicaId, idResp3, 'Thor', 'Cachorro', 'Bulldog', 4, 'Macho']);
    animStmt.finalize();

    // Insert Agendamentos
    db.all(`SELECT id FROM animais WHERE clinica_id = ? ORDER BY id DESC LIMIT 5`, [clinicaId], (err, aRows) => {
      const idAnim1 = aRows[4].id; // Rex
      const idAnim2 = aRows[3].id; // Bolinha
      const idAnim3 = aRows[2].id; // Luna

      const agStmt = db.prepare(`INSERT INTO agendamentos (clinica_id, responsavel_id, animal_id, data_hora, motivo, status, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?)`);
      // Agendamentos para hoje
      agStmt.run([clinicaId, idResp1, idAnim1, `${hoje}T10:00`, 'Consulta de Rotina', 'confirmado', 'Tutor vai atrasar 10 min']);
      agStmt.run([clinicaId, idResp1, idAnim2, `${hoje}T11:00`, 'Vacinação V10', 'concluido', 'Tudo OK']);
      agStmt.run([clinicaId, idResp2, idAnim3, `${hoje}T14:30`, 'Avaliação Cirúrgica', 'agendado', 'Trazer exames']);
      agStmt.finalize();
    });
  });

  // Insert Financeiro
  const finStmt = db.prepare(`INSERT INTO financeiro (clinica_id, tipo, descricao, valor, data) VALUES (?, ?, ?, ?, ?)`);
  finStmt.run([clinicaId, 'receita', 'Consulta Especialista', 250.00, hoje]);
  finStmt.run([clinicaId, 'receita', 'Exame de Sangue', 120.00, hoje]);
  finStmt.run([clinicaId, 'receita', 'Vacina V10', 80.00, hoje]);
  finStmt.run([clinicaId, 'receita', 'Cirurgia Castração', 850.00, hoje]);
  finStmt.run([clinicaId, 'despesa', 'Material de Limpeza', 150.00, hoje]);
  finStmt.run([clinicaId, 'despesa', 'Fornecedor Medicamentos', 450.00, hoje]);
  finStmt.run([clinicaId, 'despesa', 'Conta de Luz', 300.00, hoje]);
  finStmt.run([clinicaId, 'receita', 'Banho e Tosa', 90.00, hoje]);
  finStmt.finalize();
});

console.log('Dados mockados inseridos com sucesso para a clinica_id = ' + clinicaId);
