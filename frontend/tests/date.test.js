import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, localDateInput } from '../src/utils/date.js';

test('datas clínicas não mudam de dia em fusos brasileiros ou internacionais', () => {
  const previous = process.env.TZ;
  try {
    for (const tz of ['America/Sao_Paulo', 'America/Manaus', 'UTC', 'Pacific/Auckland']) {
      process.env.TZ = tz;
      assert.equal(formatDate('2026-10-27'), '27/10/2026', tz);
      assert.equal(localDateInput(new Date(2026, 9, 28, 23, 30)), '2026-10-28', tz);
      assert.equal(formatDate('2026-02-30'), 'Não informada');
      assert.equal(formatDate(null), 'Não informada');
    }
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});
