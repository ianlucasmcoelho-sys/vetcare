import pg from 'pg';
import path from 'path';

let pgPoolInstance = null;
let sqliteDbPromise = null;

function getPostgresPool() {
  if (!pgPoolInstance) {
    const sslCa = process.env.PGSSL_CA_BASE64
      ? Buffer.from(process.env.PGSSL_CA_BASE64.trim(), 'base64').toString('utf8')
      : process.env.PGSSL_CA?.replace(/\\n/g, '\n');
    const ssl = process.env.PGSSL === 'true'
      ? { rejectUnauthorized: true, ...(sslCa ? { ca: sslCa } : {}) }
      : undefined;
    pgPoolInstance = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ...(ssl ? { ssl } : {})
    });
  }
  return pgPoolInstance;
}

function convertSqliteToPostgres(sql) {
  if (!sql || typeof sql !== 'string') return sql;
  return sql
    .replace(/datetime\(\s*'now'\s*,\s*'localtime'\s*\)/gi, 'CURRENT_TIMESTAMP::text')
    .replace(/\bTEXT\s+DEFAULT\s+CURRENT_TIMESTAMP\b/gi, 'TEXT DEFAULT (CURRENT_TIMESTAMP::text)')
    .replace(/strftime\(\s*'%Y-%m'\s*,\s*([\w.]+)\s*\)/gi, "to_char(($1)::date, 'YYYY-MM')")
    .replace(/date\(\s*'now'\s*,\s*'\+(\d+) days'\s*\)/gi, "(CURRENT_DATE + INTERVAL '$1 days')::date")
    .replace(/date\(\s*'now'\s*\)/gi, 'CURRENT_DATE')
    .replace(/date\(\s*([\w.]+|\?)\s*\)/gi, '($1)::date')
    .replace(/INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY')
    .replace(/INTEGER\s+PRIMARY\s+KEY/gi, 'SERIAL PRIMARY KEY');
}

function convertPlaceholders(sql) {
  if (!sql || typeof sql !== 'string') return sql;
  let index = 1;
  let quote = null;
  let converted = '';
  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    if (quote) {
      converted += char;
      if (char === quote && sql[i + 1] === quote) converted += sql[++i];
      else if (char === quote) quote = null;
    } else if (char === "'" || char === '"') {
      quote = char;
      converted += char;
    } else if (char === '?') {
      converted += `$${index++}`;
    } else {
      converted += char;
    }
  }
  return converted;
}

function createPostgresAdapter(client) {
  return {
    exec: (sql) => client.query(convertSqliteToPostgres(sql)),
    run: async (sql, params = []) => {
      const normalizedSql = sql.trim().replace(/;+\s*$/, '');
      const isInsert = /^INSERT\s+INTO\b/i.test(normalizedSql) && !/\bRETURNING\b/i.test(normalizedSql);
      const compatibleSql = convertSqliteToPostgres(normalizedSql);
      const query = convertPlaceholders(compatibleSql) + (isInsert ? ' RETURNING id' : '');
      const result = await client.query(query, params);
      return { lastID: result.rows?.[0]?.id, changes: result.rowCount };
    },
    get: async (sql, params = []) => (await client.query(convertPlaceholders(convertSqliteToPostgres(sql)), params)).rows[0],
    all: async (sql, params = []) => (await client.query(convertPlaceholders(convertSqliteToPostgres(sql)), params)).rows
  };
}

/**
 * Abre a conexão com o banco de dados.
 * Em produção, usa PostgreSQL. Em desenvolvimento local, usa SQLite.
 */
export async function openDb() {
  if (process.env.DATABASE_URL) {
    return createPostgresAdapter(getPostgresPool());
  }

  // Fallback para SQLite (Desenvolvimento Local)
  if (!sqliteDbPromise) sqliteDbPromise = openSqliteConnection();
  return sqliteDbPromise;
}

async function openSqliteConnection() {
  // SQLite é apenas fallback local. Não carregue o addon nativo em produção
  // quando o banco ativo é PostgreSQL (DATABASE_URL), evitando incompatibilidade
  // do binário sqlite3 com a GLIBC do runtime gerenciado.
  const [{ default: sqlite3 }, { open }] = await Promise.all([
    import('sqlite3'),
    import('sqlite')
  ]);
  const dbPath = path.resolve(process.cwd().endsWith('backend') ? './clinica.db' : './backend/clinica.db');
  const sqliteDb = await open({ filename: dbPath, driver: sqlite3.Database });
  await sqliteDb.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  return sqliteDb;
}

/**
 * Wrapper para executar operações em uma transação no banco ativo.
 */
export async function runTransaction(callback) {
  if (process.env.DATABASE_URL) {
    const client = await getPostgresPool().connect();
    try {
      await client.query('BEGIN');
      const result = await callback(createPostgresAdapter(client));
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  const db = await openSqliteConnection();
  let transactionStarted = false;
  try {
    await db.exec('BEGIN TRANSACTION');
    transactionStarted = true;
    const result = await callback(db);
    await db.exec('COMMIT');
    transactionStarted = false;
    return result;
  } catch (error) {
    if (transactionStarted) await db.exec('ROLLBACK');
    console.error('❌ [Erro na Transação - Rollback executado]:', error.message);
    throw error;
  } finally {
    await db.close();
  }
}

export async function closeDatabase() {
  if (sqliteDbPromise) {
    const dbPromise = sqliteDbPromise;
    sqliteDbPromise = null;
    await (await dbPromise).close();
  }
  if (pgPoolInstance) {
    const pool = pgPoolInstance;
    pgPoolInstance = null;
    await pool.end();
  }
}

export async function initDb() {
  const db = await openDb();

  // Otimizações de Alta Concorrência para SQLite
  if (!process.env.DATABASE_URL) {
    try {
      await db.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA busy_timeout = 5000;
        PRAGMA synchronous = NORMAL;
      `);
      console.log('⚡ [SQLite] Modo WAL e busy_timeout=5000ms ativados com sucesso!');
    } catch (pragmaErr) {
      console.warn('⚠️ [SQLite] Falha ao configurar pragmas:', pragmaErr.message);
    }
  }

  await db.exec(`
    CREATE TABLE IF NOT EXISTS processed_webhook_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      event_id TEXT NOT NULL,
      processed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (provider, event_id)
    );

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

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at BIGINT NOT NULL,
      used_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
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

    CREATE TABLE IF NOT EXISTS agenda_expediente (
      clinica_id INTEGER PRIMARY KEY REFERENCES clinicas(id),
      inicio TEXT DEFAULT '08:00', fim TEXT DEFAULT '18:00',
      pausa_inicio TEXT DEFAULT '12:00', pausa_fim TEXT DEFAULT '13:00',
      intervalo INTEGER DEFAULT 30, dias_semana TEXT DEFAULT '[1,2,3,4,5]'
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


    CREATE TABLE IF NOT EXISTS configuracoes_whatsapp (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinica_id INTEGER NOT NULL UNIQUE,
      ativo INTEGER DEFAULT 0,
      api_url TEXT,
      instancia TEXT,
      token TEXT,
      lembrete_consulta INTEGER DEFAULT 1,
      lembrete_vacina INTEGER DEFAULT 1,
      lembrete_aniversario INTEGER DEFAULT 1,
      mensagem_consulta TEXT,
      mensagem_vacina TEXT,
      mensagem_aniversario TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinica_id) REFERENCES clinicas(id)
    );

    CREATE TABLE IF NOT EXISTS notas_fiscais (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinica_id INTEGER NOT NULL,
      tipo TEXT NOT NULL, -- 'NFSE' ou 'NFCE'
      numero TEXT,
      serie TEXT DEFAULT '1',
      chave_acesso TEXT,
      tutor_id INTEGER,
      tutor_nome TEXT,
      tutor_cpf TEXT,
      tutor_email TEXT,
      tutor_telefone TEXT,
      descricao TEXT,
      valor REAL NOT NULL,
      itens TEXT, -- JSON com lista detalhada de itens/serviços
      status TEXT DEFAULT 'autorizada', -- 'autorizada', 'processando', 'rejeitada', 'cancelada'
      forma_pagamento TEXT,
      motivo_cancelamento TEXT,
      mensagem_retorno TEXT,
      url_pdf TEXT,
      url_xml TEXT,
      data_emissao TEXT DEFAULT (datetime('now', 'localtime')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinica_id) REFERENCES clinicas(id),
      FOREIGN KEY (tutor_id) REFERENCES responsaveis(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS configuracoes_fiscais (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clinica_id INTEGER NOT NULL UNIQUE,
      cnpj TEXT,
      razao_social TEXT,
      nome_fantasia TEXT,
      inscricao_municipal TEXT,
      inscricao_estadual TEXT,
      regime_tributario TEXT DEFAULT 'simples_nacional',
      provedor TEXT DEFAULT 'focus_nfe',
      ambiente TEXT DEFAULT 'homologacao',
      api_token TEXT,
      cnae TEXT DEFAULT '7500-1/00',
      codigo_servico_municipal TEXT DEFAULT '5.01',
      aliquota_iss REAL DEFAULT 2.0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinica_id) REFERENCES clinicas(id)
    );
  `);

  // Migrações legadas e idempotentes: somente coluna já existente é ignorada.
  const migrations = [
    'ALTER TABLE agendamentos ADD COLUMN veterinario_id INTEGER REFERENCES usuarios(id)',
    'ALTER TABLE agendamentos ADD COLUMN duracao_minutos INTEGER DEFAULT 30',
    `ALTER TABLE clinicas ADD COLUMN status_assinatura TEXT DEFAULT 'trial'`,
    `ALTER TABLE clinicas ADD COLUMN onboarding_concluido INTEGER DEFAULT 0`,
    `ALTER TABLE clinicas ADD COLUMN data_expiracao TEXT`,
    `ALTER TABLE clinicas ADD COLUMN plano_id TEXT DEFAULT 'free'`,
    `ALTER TABLE clinicas ADD COLUMN asaas_customer_id TEXT`,
    `ALTER TABLE clinicas ADD COLUMN asaas_subscription_id TEXT`,
    'ALTER TABLE animais ADD COLUMN obito INTEGER DEFAULT 0',
    'ALTER TABLE animais ADD COLUMN data_obito TEXT',
    'ALTER TABLE servicos ADD COLUMN codigoBarras TEXT',
    'ALTER TABLE financeiro ADD COLUMN veterinario_id INTEGER REFERENCES usuarios(id)'
  ];
  for (const sql of migrations) {
    try {
      await db.exec(sql);
    } catch (error) {
      const duplicateColumn = error.code === '42701' || /duplicate column name/i.test(error.message || '');
      if (!duplicateColumn) throw error;
    }
  }

  // Reset tokens store epoch milliseconds, which exceed PostgreSQL INTEGER capacity.
  if (process.env.DATABASE_URL) {
    await db.exec('ALTER TABLE password_reset_tokens ALTER COLUMN expires_at TYPE BIGINT');
  }

  // Contas Free antigas recebem sete dias de transição a partir desta migração.
  const freeTransitionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await db.run(`
    UPDATE clinicas
    SET status_assinatura = 'trial', data_expiracao = ?
    WHERE plano_id = 'free' AND status_assinatura = 'free' AND status_assinatura <> 'vitalicio'
  `, [freeTransitionExpiry]);

  // Criação de Índices de Desempenho Multi-tenant
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_animais_clinica ON animais(clinica_id);
    CREATE INDEX IF NOT EXISTS idx_responsaveis_clinica ON responsaveis(clinica_id);
    CREATE INDEX IF NOT EXISTS idx_agendamentos_clinica ON agendamentos(clinica_id);
    CREATE INDEX IF NOT EXISTS idx_agendamentos_profissional_data ON agendamentos(clinica_id, data, veterinario_id);
    CREATE INDEX IF NOT EXISTS idx_prontuarios_clinica ON prontuarios(clinica_id);
    CREATE INDEX IF NOT EXISTS idx_financeiro_clinica ON financeiro(clinica_id);
    CREATE INDEX IF NOT EXISTS idx_vacinas_clinica ON vacinas(clinica_id);
    CREATE INDEX IF NOT EXISTS idx_notas_fiscais_clinica ON notas_fiscais(clinica_id);
    CREATE INDEX IF NOT EXISTS idx_notas_fiscais_data ON notas_fiscais(data_emissao);
  `);

  console.log(`✅ Banco de dados ${process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'} sincronizado!`);
}
