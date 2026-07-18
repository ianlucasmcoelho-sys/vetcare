import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import pg from 'pg';

/**
 * Abre a conexão com o banco de dados.
 * Em produção, usa PostgreSQL. Em desenvolvimento local, usa SQLite.
 */
export async function openDb() {
  if (process.env.DATABASE_URL) {
    // Configuração para PostgreSQL (Produção)
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false } // Necessário para Supabase/Render
    });
    
    // Adaptador simples para manter compatibilidade com os métodos .exec e .run do sqlite
    return {
      exec: (sql) => pool.query(sql),
      run: (sql, params) => pool.query(sql, params),
      get: async (sql, params) => {
        const res = await pool.query(sql, params);
        return res.rows[0];
      },
      all: async (sql, params) => {
        const res = await pool.query(sql, params);
        return res.rows;
      }
    };
  }

  // Fallback para SQLite (Desenvolvimento Local)
  return open({
    filename: './clinica.db',
    driver: sqlite3.Database
  });
}

/**
 * Wrapper para executar operações em uma transação SQL (SQLite).
 */
export async function runTransaction(callback) {
  const db = await openDb();
  await db.exec('BEGIN TRANSACTION');
  try {
    const result = await callback(db);
    await db.exec('COMMIT');
    return result;
  } catch (error) {
    await db.exec('ROLLBACK');
    console.error('❌ [Erro na Transação - Rollback executado]:', error.message);
    throw error;
  }
}

export async function initDb() {
  const db = await openDb();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS clinicas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      cnpj TEXT,
      email TEXT,
      telefone TEXT,
      endereco TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinica_id INTEGER,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL,
      perfil TEXT DEFAULT 'user',
      ativo INTEGER DEFAULT 1,
      tentativas_login INTEGER DEFAULT 0,
      ultimo_login TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinica_id) REFERENCES clinicas(id)
    );

    CREATE TABLE IF NOT EXISTS responsaveis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinica_id INTEGER,
      nome TEXT,
      cpf TEXT,
      rg TEXT,
      nascimento TEXT,
      telefone TEXT,
      celular TEXT,
      email TEXT,
      cep TEXT,
      endereco TEXT,
      estado TEXT,
      cidade TEXT,
      observacoes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinica_id) REFERENCES clinicas(id)
    );

    CREATE TABLE IF NOT EXISTS animais (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinica_id INTEGER,
      responsavel_id INTEGER,
      nome TEXT NOT NULL,
      microchip TEXT,
      especie TEXT NOT NULL,
      raca TEXT,
      sexo TEXT,
      nascimento TEXT,
      idade INTEGER,
      idade_unidade TEXT,
      temperamento TEXT,
      porte TEXT,
      pelagem TEXT,
      castrado INTEGER,
      rga TEXT,
      plano_saude TEXT,
      carteirinha_numero TEXT,
      carteirinha_validade TEXT,
      alergias TEXT,
      doencas_cronicas TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinica_id) REFERENCES clinicas(id),
      FOREIGN KEY (responsavel_id) REFERENCES responsaveis(id)
    );

    CREATE TABLE IF NOT EXISTS internacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinica_id INTEGER,
      animal_id INTEGER,
      data_entrada TEXT,
      data_saida TEXT,
      motivo TEXT,
      observacoes TEXT,
      status TEXT DEFAULT 'ativo',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinica_id) REFERENCES clinicas(id),
      FOREIGN KEY (animal_id) REFERENCES animais(id)
    );

    -- Tabela de agendamento de medicações na internação
    CREATE TABLE IF NOT EXISTS internacao_medicacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      internacao_id INTEGER,
      medicamento TEXT NOT NULL,
      dosagem TEXT,
      horario_agendado TEXT NOT NULL, -- Formato ISO ou HH:mm
      data_agendada TEXT NOT NULL,
      status TEXT DEFAULT 'pendente', -- pendente, aplicado, atrasado
      aplicado_em TEXT,
      usuario_id INTEGER,
      FOREIGN KEY (internacao_id) REFERENCES internacoes(id) ON DELETE CASCADE,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    -- Tabela de sinais vitais e evolução
    CREATE TABLE IF NOT EXISTS internacao_sinais_vitais (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      internacao_id INTEGER,
      temperatura REAL,
      frequencia_cardiaca INTEGER,
      frequencia_respiratoria INTEGER,
      peso REAL,
      observacao TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      usuario_id INTEGER,
      FOREIGN KEY (internacao_id) REFERENCES internacoes(id) ON DELETE CASCADE,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS agendamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinica_id INTEGER,
      animal_id INTEGER,
      data TEXT,
      horario TEXT,
      tipo_servico TEXT,
      status TEXT,
      domiciliar INTEGER DEFAULT 0,
      observacoes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinica_id) REFERENCES clinicas(id),
      FOREIGN KEY (animal_id) REFERENCES animais(id)
    );

    CREATE TABLE IF NOT EXISTS vacinas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinica_id INTEGER,
      animal_id INTEGER,
      nome_vacina TEXT NOT NULL,
      data_aplicacao TEXT NOT NULL,
      proxima_dose TEXT,
      lote TEXT,
      fabricante TEXT,
      observacoes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinica_id) REFERENCES clinicas(id),
      FOREIGN KEY (animal_id) REFERENCES animais(id)
    );

    CREATE TABLE IF NOT EXISTS financeiro (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinica_id INTEGER,
      descricao TEXT,
      categoria TEXT,
      valor REAL,
      tipo TEXT,
      data TEXT,
      metodo_pagamento TEXT,
      observacoes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinica_id) REFERENCES clinicas(id)
    );

    CREATE TABLE IF NOT EXISTS servicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinica_id INTEGER,
      nome TEXT NOT NULL,
      quantidade INTEGER DEFAULT 0,
      estoqueMinimo INTEGER DEFAULT 5,
      unidade TEXT,
      precoCusto TEXT,
      precoVenda TEXT,
      margemLucro TEXT,
      categoria TEXT,
      fornecedor TEXT,
      fabricante TEXT,
      lote TEXT,
      dataExpiracao TEXT,
      observacoes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinica_id) REFERENCES clinicas(id)
    );

    CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinica_id INTEGER NOT NULL,
      produto_id INTEGER NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'saida')),
      quantidade INTEGER NOT NULL,
      motivo TEXT,
      usuario_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinica_id) REFERENCES clinicas(id),
      FOREIGN KEY (produto_id) REFERENCES servicos(id) ON DELETE CASCADE,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    -- Tabela de Anexos e Exames (Fase 5)
    CREATE TABLE IF NOT EXISTS anexos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinica_id INTEGER NOT NULL,
      animal_id INTEGER NOT NULL,
      nome_arquivo TEXT NOT NULL,
      caminho TEXT NOT NULL,
      tipo_mime TEXT,
      tamanho INTEGER,
      categoria TEXT, -- Exame, Foto, Contrato, etc.
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinica_id) REFERENCES clinicas(id),
      FOREIGN KEY (animal_id) REFERENCES animais(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exames (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinica_id INTEGER NOT NULL,
      animal_id INTEGER NOT NULL,
      tipo_exame TEXT NOT NULL,
      data_solicitacao TEXT NOT NULL,
      data_resultado TEXT,
      laboratorio TEXT,
      resultado TEXT,
      status TEXT DEFAULT 'pendente',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinica_id) REFERENCES clinicas(id),
      FOREIGN KEY (animal_id) REFERENCES animais(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS prontuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinica_id INTEGER NOT NULL,
      animal_id INTEGER,
      pet_nome TEXT,
      tutor_nome TEXT,
      veterinario TEXT,
      veterinario_id INTEGER,
      data_visita TEXT,
      peso REAL,
      temperatura REAL,
      proxima_visita TEXT,
      sintomas TEXT,
      diagnostico TEXT,
      tratamento TEXT,
      prescricoes TEXT,
      observacoes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinica_id) REFERENCES clinicas(id),
      FOREIGN KEY (animal_id) REFERENCES animais(id),
      FOREIGN KEY (veterinario_id) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS retornos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinica_id INTEGER NOT NULL,
      consulta_id INTEGER,
      animal_id INTEGER,
      pet_nome TEXT,
      tutor_nome TEXT,
      data_retorno TEXT,
      horario TEXT,
      motivo TEXT,
      observacoes TEXT,
      status TEXT DEFAULT 'Pendentes',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinica_id) REFERENCES clinicas(id),
      FOREIGN KEY (animal_id) REFERENCES animais(id)
    );

    CREATE TABLE IF NOT EXISTS receituario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinica_id INTEGER NOT NULL,
      animal_id INTEGER,
      tutor_id INTEGER,
      data_emissao TEXT,
      medicamentos TEXT,
      posologia TEXT,
      observacoes TEXT,
      validade TEXT,
      medico_responsavel TEXT,
      crmv TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinica_id) REFERENCES clinicas(id),
      FOREIGN KEY (animal_id) REFERENCES animais(id),
      FOREIGN KEY (tutor_id) REFERENCES responsaveis(id)
    );

    CREATE TABLE IF NOT EXISTS configuracoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinica_id INTEGER UNIQUE NOT NULL,
      nome_clinica TEXT,
      logo TEXT,
      endereco TEXT,
      telefone TEXT,
      email TEXT,
      cnpj TEXT,
      crmv TEXT,
      assinatura_digital TEXT,
      horario_funcionamento TEXT,
      dias_funcionamento TEXT,
      tema TEXT DEFAULT 'light',
      notificacoes_email INTEGER DEFAULT 1,
      notificacoes_whatsapp INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinica_id) REFERENCES clinicas(id)
    );

    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinica_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL, -- receituario, laudo, contrato
      conteudo_html TEXT,
      conteudo_css TEXT,
      ativo INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinica_id) REFERENCES clinicas(id)
    );
    CREATE TABLE IF NOT EXISTS orcamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinica_id INTEGER NOT NULL,
      animal_id INTEGER,
      tutor_nome TEXT NOT NULL,
      pet_nome TEXT NOT NULL,
      data_emissao TEXT NOT NULL,
      validade TEXT,
      status TEXT DEFAULT 'Pendente',
      observacoes TEXT,
      itens TEXT NOT NULL,
      total REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinica_id) REFERENCES clinicas(id),
      FOREIGN KEY (animal_id) REFERENCES animais(id)
    );

    CREATE TABLE IF NOT EXISTS comissoes_regras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinica_id INTEGER NOT NULL,
      usuario_id INTEGER NOT NULL,
      tipo_comissao TEXT NOT NULL CHECK(tipo_comissao IN ('percentual', 'fixo')),
      valor REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinica_id) REFERENCES clinicas(id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS comissoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinica_id INTEGER NOT NULL,
      financeiro_id INTEGER NOT NULL,
      usuario_id INTEGER NOT NULL,
      valor_comissao REAL NOT NULL,
      status TEXT DEFAULT 'pendente' CHECK(status IN ('pendente', 'pago')),
      data_pagamento TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinica_id) REFERENCES clinicas(id),
      FOREIGN KEY (financeiro_id) REFERENCES financeiro(id) ON DELETE CASCADE,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );
  `);

  // Migrações de segurança
  try {
    await db.exec(`ALTER TABLE clinicas ADD COLUMN status_assinatura TEXT DEFAULT 'trial'`);
  } catch (e) {}

  try {
    await db.exec(`ALTER TABLE clinicas ADD COLUMN onboarding_concluido INTEGER DEFAULT 0`);
  } catch (e) {}

  try {
    await db.exec(`ALTER TABLE clinicas ADD COLUMN data_expiracao TEXT`);
  } catch (e) {}

  try {
    await db.exec(`ALTER TABLE clinicas ADD COLUMN plano_id TEXT DEFAULT 'free'`);
  } catch (e) {}

  try {
    await db.exec('ALTER TABLE animais ADD COLUMN obito INTEGER DEFAULT 0');
    await db.exec('ALTER TABLE animais ADD COLUMN data_obito TEXT');
  } catch (e) {}

  try {
    await db.exec('ALTER TABLE servicos ADD COLUMN codigoBarras TEXT');
  } catch (e) {}

  try {
    await db.exec('ALTER TABLE financeiro ADD COLUMN veterinario_id INTEGER REFERENCES usuarios(id)');
  } catch (e) {}

  console.log("✅ Banco de dados SQLite sincronizado!");
}
