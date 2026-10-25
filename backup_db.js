import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'backend', 'clinica.db');
const BACKUP_DIR = path.join(__dirname, 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR);
}

const date = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(BACKUP_DIR, `clinica_backup_${date}.db`);

import sqlite3 from 'sqlite3';

async function performAtomicBackup(sourceDb, targetDb) {
  return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(sourceDb, sqlite3.OPEN_READWRITE, (err) => {
      if (err) return reject(err);
      const safePath = targetDb.replace(/'/g, "''");
      db.run(`VACUUM INTO '${safePath}'`, (runErr) => {
        db.close(() => {
          if (runErr) reject(runErr);
          else resolve();
        });
      });
    });
  });
}

async function executeBackup() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      console.error('❌ Erro: Banco de dados não encontrado para backup em:', DB_PATH);
      return;
    }

    try {
      // Tenta backup transacional atômico (evita corrupção a quente)
      await performAtomicBackup(DB_PATH, backupPath);
      console.log(`✅ Backup atômico realizado com sucesso: ${backupPath}`);
    } catch (atomicErr) {
      throw new Error(`Backup atômico falhou; não será feita cópia potencialmente inconsistente: ${atomicErr.message}`);
    }

    // Validação de integridade do arquivo gerado
    const stats = fs.statSync(backupPath);
    if (stats.size === 0) {
      throw new Error("Arquivo de backup gerado com 0 bytes.");
    }
    console.log(`📦 Tamanho do backup: ${(stats.size / 1024).toFixed(1)} KB`);

    // Manter apenas os últimos 30 backups
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => /^clinica_backup_.*\.db$/.test(f))
      .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 30) {
      files.slice(30).forEach(f => {
        fs.unlinkSync(path.join(BACKUP_DIR, f.name));
        console.log(`🗑️ Backup antigo removido: ${f.name}`);
      });
    }
  } catch (error) {
    console.error('❌ Erro durante o backup:', error.message);
    process.exitCode = 1;
  }
}

executeBackup();
