import { openDb } from './src/db.js';
import bcrypt from 'bcrypt';

async function seed() {
  console.log("🌱 Iniciando semeadura de dados fictícios...");
  const db = await openDb();

  try {
    // 1. Criar Clínica se não existir
    await db.run(`
      INSERT OR IGNORE INTO clinicas (id, nome, email, telefone, cnpj, endereco)
      VALUES (1, 'Ouro Pet Centro Veterinário', 'contato@ouropet.com', '(11) 99999-9999', '12.345.678/0001-90', 'Rua das Flores, 123 - Centro')
    `);

    // 2. Criar Usuário Admin
    const senhaHash = await bcrypt.hash('admin123', 10);
    await db.run(`
      INSERT OR IGNORE INTO usuarios (id, clinica_id, nome, email, senha, perfil)
      VALUES (1, 1, 'Dr. Mateus Estudos', 'admin@ouropet.com', ?, 'admin')
    `, [senhaHash]);

    // 3. Criar Configurações Iniciais
    await db.run(`
      INSERT OR IGNORE INTO configuracoes (clinica_id, nome_clinica, crmv, endereco, telefone, email)
      VALUES (1, 'Ouro Pet Centro Veterinário', '12345-SP', 'Rua das Flores, 123', '(11) 99999-9999', 'contato@ouropet.com')
    `);

    // 4. Responsáveis (Tutores)
    const tutores = [
      ['João Silva', '123.456.789-00', '(11) 98888-7777', 'joao@email.com'],
      ['Maria Oliveira', '987.654.321-11', '(11) 97777-6666', 'maria@email.com'],
      ['Carlos Souza', '456.789.123-22', '(11) 96666-5555', 'carlos@email.com']
    ];
    for (const t of tutores) {
      await db.run('INSERT INTO responsaveis (clinica_id, nome, cpf, telefone, email) VALUES (1, ?, ?, ?, ?)', t);
    }

    // 5. Animais
    const animais = [
      [1, 'Thor', 'Cão', 'Golden Retriever', 'M', '2020-05-15', 'Dócil', 'Grande'],
      [1, 'Luna', 'Gato', 'Siamês', 'F', '2021-10-20', 'Arisca', 'Pequeno'],
      [2, 'Mel', 'Cão', 'Poodle', 'F', '2019-01-10', 'Dócil', 'Pequeno'],
      [3, 'Rex', 'Cão', 'Labrador', 'M', '2022-03-30', 'Agitado', 'Grande']
    ];
    for (const a of animais) {
      await db.run(`
        INSERT INTO animais (clinica_id, responsavel_id, nome, especie, raca, sexo, nascimento, temperamento, porte, castrado) 
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `, a);
    }

    // 6. Produtos / Serviços (Estoque)
    const produtos = [
      ['Vacina V10', 'Vacina', 150.00, 10, 'dose'],
      ['Antipulgas Bravecto', 'Medicamento', 180.00, 3, 'un'], // Estoque Baixo
      ['Ração Premium 10kg', 'Alimento', 250.00, 15, 'un'],
      ['Shampoo Neutro', 'Higiene', 45.00, 2, 'un'], // Estoque Baixo
      ['Consulta Geral', 'Insumo', 120.00, 100, 'un']
    ];
    for (const p of produtos) {
      await db.run(`
        INSERT INTO servicos (clinica_id, nome, categoria, precoVenda, quantidade, unidade)
        VALUES (1, ?, ?, ?, ?, ?)
      `, p);
    }

    // 7. Financeiro (Últimos 3 meses)
    const transacoes = [
      ['Consulta Thor', 'Serviços', 150.00, 'entrada', '2026-05-10'],
      ['Vacina Luna', 'Vacina', 120.00, 'entrada', '2026-05-12'],
      ['Compra Medicamentos', 'Estoque', 500.00, 'saida', '2026-05-01'],
      ['Aluguel Maio', 'Aluguel/Contas', 2000.00, 'saida', '2026-05-05'],
      ['Venda Bravecto', 'Produtos', 180.00, 'entrada', '2026-05-14'],
      ['Banho e Tosa Mel', 'Serviços', 80.00, 'entrada', '2026-04-20'],
      ['Salários Abril', 'Salários', 3500.00, 'saida', '2026-04-05']
    ];
    for (const tr of transacoes) {
      await db.run(`
        INSERT INTO financeiro (clinica_id, descricao, categoria, valor, tipo, data)
        VALUES (1, ?, ?, ?, ?, ?)
      `, tr);
    }

    // 8. Agendamentos (Hoje e Amanhã)
    const hoje = new Date().toISOString().split('T')[0];
    const amanha = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    
    const agenda = [
      [1, hoje, '09:00', 'Consulta', 'Confirmado'],
      [2, hoje, '10:30', 'Vacina', 'Agendado'],
      [3, hoje, '14:00', 'Retorno', 'Agendado'],
      [4, amanha, '08:00', 'Cirurgia', 'Agendado']
    ];
    for (const ag of agenda) {
      await db.run(`
        INSERT INTO agendamentos (clinica_id, animal_id, data, horario, tipo_servico, status)
        VALUES (1, ?, ?, ?, ?, ?)
      `, ag);
    }

    // 9. Prontuários (Atividades Recentes)
    const prontuarios = [
      [1, 'Thor', 'João Silva', 'Check-up de rotina. Animal saudável.', '2026-05-10'],
      [2, 'Luna', 'Maria Oliveira', 'Aplicação de reforço vacinal.', '2026-05-12']
    ];
    for (const pr of prontuarios) {
      await db.run(`
        INSERT INTO prontuarios (clinica_id, animal_id, pet_nome, tutor_nome, diagnostico, data_visita, veterinario)
        VALUES (1, ?, ?, ?, ?, ?, 'Dr. Mateus Estudos')
      `, pr);
    }

    console.log("✅ Semeadura concluída com sucesso!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Erro ao semear dados:", err);
    process.exit(1);
  }
}

seed();
