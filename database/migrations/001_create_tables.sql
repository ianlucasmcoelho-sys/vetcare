-- Criação do banco
CREATE DATABASE ouro_pet;

-- Tabela de Responsáveis (Tutores)
CREATE TABLE responsaveis (
    id_responsavel SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    telefone VARCHAR(20),
    email VARCHAR(100) UNIQUE,
    endereco TEXT
);

-- Tabela de Animais
CREATE TABLE animais (
    id_animal SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    especie VARCHAR(50),
    raca VARCHAR(50),
    idade INT,
    sexo VARCHAR(10),
    id_responsavel INT REFERENCES responsaveis(id_responsavel) ON DELETE CASCADE
);

-- Tabela de Usuários (Equipe da clínica)
CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cargo VARCHAR(50),
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL
);

-- Tabela de Consultas
CREATE TABLE consultas (
    id_consulta SERIAL PRIMARY KEY,
    data_consulta TIMESTAMP NOT NULL,
    motivo TEXT,
    diagnostico TEXT,
    prescricao TEXT,
    id_animal INT REFERENCES animais(id_animal) ON DELETE CASCADE,
    id_veterinario INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

-- Tabela de Vacinas
CREATE TABLE vacinas (
    id_vacina SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    data_aplicacao DATE NOT NULL,
    proxima_dose DATE,
    id_animal INT REFERENCES animais(id_animal) ON DELETE CASCADE
);

-- Tabela de Internações
CREATE TABLE internacoes (
    id_internacao SERIAL PRIMARY KEY,
    data_entrada TIMESTAMP NOT NULL,
    data_saida TIMESTAMP,
    observacoes TEXT,
    id_animal INT REFERENCES animais(id_animal) ON DELETE CASCADE
);
