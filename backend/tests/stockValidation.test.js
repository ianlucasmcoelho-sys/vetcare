import test from 'node:test';
import assert from 'node:assert/strict';
import { estoqueMovimentacaoSchema } from '../src/middlewares/validationMiddleware.js';

test('movimentações de estoque recusam quantidades fracionadas, negativas e não numéricas', () => {
  const body = { produto_id: 1, tipo: 'saida', quantidade: 1 };
  assert.equal(estoqueMovimentacaoSchema.safeParse({ body }).success, true);
  for (const quantidade of [0, -1, 1.5, 'inválido']) {
    assert.equal(estoqueMovimentacaoSchema.safeParse({ body: { ...body, quantidade } }).success, false);
  }
});
