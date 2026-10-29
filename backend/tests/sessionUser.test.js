import test from 'node:test';
import assert from 'node:assert/strict';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { currentSessionUser } from '../src/services/sessionUser.js';
import { allowWrites } from '../src/middlewares/roleMiddleware.js';

test('sessão usa o perfil atual e revoga usuário desativado, excluído ou de outra clínica', async () => {
  const db = await open({ filename: ':memory:', driver: sqlite3.Database });
  try {
    await db.exec("CREATE TABLE usuarios(id INTEGER, clinica_id INTEGER, nome TEXT, email TEXT, perfil TEXT, ativo INTEGER); INSERT INTO usuarios VALUES(1,1,'QA','qa@example.test','admin',1)");
    const token = { id: 1, clinica_id: 1, perfil: 'admin' };
    assert.equal((await currentSessionUser(db, token)).perfil, 'admin');
    await db.run("UPDATE usuarios SET perfil = 'recepcionista'");
    assert.equal((await currentSessionUser(db, token)).perfil, 'recepcionista');
    assert.equal(await currentSessionUser(db, { ...token, clinica_id: 2 }), null);
    await db.run('UPDATE usuarios SET ativo = 0');
    assert.equal(await currentSessionUser(db, token), null);
    await db.run('DELETE FROM usuarios');
    assert.equal(await currentSessionUser(db, token), null);
    assert.equal(await currentSessionUser(db, {}), null);
  } finally { await db.close(); }
});

test('API mantém leitura e bloqueia escrita de perfil sem permissão', () => {
  const guard = allowWrites('admin', 'veterinario');
  let calls = 0;
  const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
  guard({ method: 'GET', usuario: { perfil: 'recepcionista' } }, res, () => calls++);
  guard({ method: 'POST', usuario: { perfil: 'recepcionista' } }, res, () => calls++);
  assert.equal(res.code, 403);
  guard({ method: 'POST', usuario: { perfil: 'veterinario' } }, res, () => calls++);
  assert.equal(calls, 2);
});
