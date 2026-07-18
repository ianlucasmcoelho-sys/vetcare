import { openDb } from './src/db.js';

async function populate() {
  const db = await openDb();
  const clinica_id = 2; // teste@gmail.com
  const usuario_id = 2;

  console.log("Limpando dados antigos da clinica 2...");
  await db.exec(`DELETE FROM financeiro WHERE clinica_id = 2;`);
  await db.exec(`DELETE FROM prontuarios WHERE clinica_id = 2;`);
  await db.exec(`DELETE FROM agendamentos WHERE clinica_id = 2;`);
  await db.exec(`DELETE FROM internacoes WHERE clinica_id = 2;`);
  await db.exec(`DELETE FROM exames WHERE clinica_id = 2;`);
  await db.exec(`DELETE FROM servicos WHERE clinica_id = 2;`);
  await db.exec(`DELETE FROM animais WHERE clinica_id = 2;`);
  await db.exec(`DELETE FROM responsaveis WHERE clinica_id = 2;`);

  console.log("Inserindo tutores...");
  const tutores = [
    { nome: "Ana Silva", celular: "11988887777" },
    { nome: "Carlos Souza", celular: "11977776666" },
    { nome: "Mariana Costa", celular: "11966665555" },
    { nome: "Roberto Oliveira", celular: "11955554444" },
    { nome: "Juliana Santos", celular: "11944443333" }
  ];
  const tutoresIds = [];
  for (const t of tutores) {
    const res = await db.run('INSERT INTO responsaveis (clinica_id, nome, celular) VALUES (?, ?, ?)', [clinica_id, t.nome, t.celular]);
    tutoresIds.push(res.lastID);
  }

  console.log("Inserindo animais...");
  const animais = [
    { nome: "Rex", especie: "Cão", raca: "Golden Retriever", resp: tutoresIds[0] },
    { nome: "Mia", especie: "Gato", raca: "Siamês", resp: tutoresIds[0] },
    { nome: "Bolinha", especie: "Cão", raca: "Poodle", resp: tutoresIds[1] },
    { nome: "Thor", especie: "Cão", raca: "Bulldog Francês", resp: tutoresIds[2] },
    { nome: "Luna", especie: "Gato", raca: "Persa", resp: tutoresIds[3] },
    { nome: "Simba", especie: "Gato", raca: "SRD", resp: tutoresIds[4] },
    { nome: "Max", especie: "Cão", raca: "Labrador", resp: tutoresIds[4] },
  ];
  const animaisIds = [];
  for (const a of animais) {
    const res = await db.run('INSERT INTO animais (clinica_id, responsavel_id, nome, especie, raca) VALUES (?, ?, ?, ?, ?)', [clinica_id, a.resp, a.nome, a.especie, a.raca]);
    animaisIds.push(res.lastID);
  }

  const hoje = new Date().toISOString().split('T')[0];

  console.log("Inserindo agendamentos (hoje)...");
  await db.run('INSERT INTO agendamentos (clinica_id, animal_id, data, horario, tipo_servico, status) VALUES (?, ?, ?, ?, ?, ?)', [clinica_id, animaisIds[0], hoje, "09:00", "Consulta Clínica", "Agendado"]);
  await db.run('INSERT INTO agendamentos (clinica_id, animal_id, data, horario, tipo_servico, status) VALUES (?, ?, ?, ?, ?, ?)', [clinica_id, animaisIds[1], hoje, "10:30", "Vacinação", "Em Atendimento"]);
  await db.run('INSERT INTO agendamentos (clinica_id, animal_id, data, horario, tipo_servico, status) VALUES (?, ?, ?, ?, ?, ?)', [clinica_id, animaisIds[2], hoje, "14:00", "Retorno", "Aguardando"]);
  await db.run('INSERT INTO agendamentos (clinica_id, animal_id, data, horario, tipo_servico, status) VALUES (?, ?, ?, ?, ?, ?)', [clinica_id, animaisIds[3], hoje, "16:00", "Exame Laboratorial", "Agendado"]);

  console.log("Inserindo internacoes (ativos)...");
  await db.run('INSERT INTO internacoes (clinica_id, animal_id, motivo, status) VALUES (?, ?, ?, ?)', [clinica_id, animaisIds[4], "Pós-operatório de castração", "ativo"]);
  await db.run('INSERT INTO internacoes (clinica_id, animal_id, motivo, status) VALUES (?, ?, ?, ?)', [clinica_id, animaisIds[5], "Tratamento de parvovirose", "ativo"]);

  console.log("Inserindo exames (pendentes)...");
  await db.run('INSERT INTO exames (clinica_id, animal_id, tipo_exame, data_solicitacao, status) VALUES (?, ?, ?, ?, ?)', [clinica_id, animaisIds[0], "Hemograma Completo", hoje, "pendente"]);
  await db.run('INSERT INTO exames (clinica_id, animal_id, tipo_exame, data_solicitacao, status) VALUES (?, ?, ?, ?, ?)', [clinica_id, animaisIds[1], "Ultrassom Abdominal", hoje, "pendente"]);
  await db.run('INSERT INTO exames (clinica_id, animal_id, tipo_exame, data_solicitacao, status) VALUES (?, ?, ?, ?, ?)', [clinica_id, animaisIds[6], "Raio-X Tórax", hoje, "pendente"]);

  console.log("Inserindo serviços (estoque)...");
  // Alguns com estoque baixo
  await db.run('INSERT INTO servicos (clinica_id, nome, quantidade, estoqueMinimo, categoria) VALUES (?, ?, ?, ?, ?)', [clinica_id, "Vacina V10", 3, 5, "Vacinas"]);
  await db.run('INSERT INTO servicos (clinica_id, nome, quantidade, estoqueMinimo, categoria) VALUES (?, ?, ?, ?, ?)', [clinica_id, "Antirrábica", 2, 10, "Vacinas"]);
  await db.run('INSERT INTO servicos (clinica_id, nome, quantidade, estoqueMinimo, categoria) VALUES (?, ?, ?, ?, ?)', [clinica_id, "Seringas 3ml", 150, 50, "Insumos"]);
  await db.run('INSERT INTO servicos (clinica_id, nome, quantidade, estoqueMinimo, categoria) VALUES (?, ?, ?, ?, ?)', [clinica_id, "Luvas P", 1, 5, "Insumos"]);
  await db.run('INSERT INTO servicos (clinica_id, nome, quantidade, estoqueMinimo, categoria) VALUES (?, ?, ?, ?, ?)', [clinica_id, "Ração Terapêutica Gastro", 12, 5, "Alimentação"]);

  console.log("Inserindo prontuários recentes...");
  await db.run('INSERT INTO prontuarios (clinica_id, animal_id, pet_nome, tutor_nome, diagnostico, data_visita) VALUES (?, ?, ?, ?, ?, ?)', [clinica_id, animaisIds[2], "Bolinha", "Carlos Souza", "Otite bilateral, limpeza e medicação prescrita.", hoje]);
  await db.run('INSERT INTO prontuarios (clinica_id, animal_id, pet_nome, tutor_nome, diagnostico, data_visita) VALUES (?, ?, ?, ?, ?, ?)', [clinica_id, animaisIds[6], "Max", "Juliana Santos", "Dermatite alérgica à pulga. Iniciado tratamento.", hoje]);
  await db.run('INSERT INTO prontuarios (clinica_id, animal_id, pet_nome, tutor_nome, diagnostico, data_visita) VALUES (?, ?, ?, ?, ?, ?)', [clinica_id, animaisIds[3], "Thor", "Mariana Costa", "Consulta de rotina. Animal clinicamente saudável.", hoje]);

  console.log("Inserindo financeiro (últimos 6 meses)...");
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    
    // Entradas
    const valEntrada = 10000 + Math.random() * 8000;
    d.setDate(5);
    await db.run('INSERT INTO financeiro (clinica_id, valor, tipo, data, categoria, descricao) VALUES (?, ?, ?, ?, ?, ?)', [clinica_id, valEntrada, "entrada", d.toISOString(), "Serviços", "Faturamento Geral Mensal"]);
    
    // Saidas
    const valSaida = 4000 + Math.random() * 3000;
    d.setDate(15);
    await db.run('INSERT INTO financeiro (clinica_id, valor, tipo, data, categoria, descricao) VALUES (?, ?, ?, ?, ?, ?)', [clinica_id, valSaida, "saida", d.toISOString(), "Despesas", "Pagamento de Fornecedores e Custos Fixos"]);
  }
  // Adicionar algumas entradas extras no mês atual para compor a receita de hoje/este mês
  await db.run('INSERT INTO financeiro (clinica_id, valor, tipo, data, categoria, descricao) VALUES (?, ?, ?, ?, ?, ?)', [clinica_id, 250, "entrada", new Date().toISOString(), "Consulta", "Consulta Dr. Roberto"]);
  await db.run('INSERT INTO financeiro (clinica_id, valor, tipo, data, categoria, descricao) VALUES (?, ?, ?, ?, ?, ?)', [clinica_id, 120, "entrada", new Date().toISOString(), "Vacinas", "Aplicação V10"]);
  await db.run('INSERT INTO financeiro (clinica_id, valor, tipo, data, categoria, descricao) VALUES (?, ?, ?, ?, ?, ?)', [clinica_id, 800, "entrada", new Date().toISOString(), "Cirurgias", "Castração Gato"]);


  console.log("Tudo pronto! Banco populado para clinica_id = 2.");
}

populate().catch(console.error);
