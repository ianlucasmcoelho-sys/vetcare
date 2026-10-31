import express from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { openDb } from '../db.js';
import { createAsaasGateway } from '../services/asaas.js';
import { createCompanyOverview } from '../services/companyOverview.js';

export function createCompanyRouter({ token = () => process.env.COMPANY_API_TOKEN,
  overview = createCompanyOverview({ openDb, gateway: createAsaasGateway(process.env, { timeout: 10000 }) }) } = {}) {
  const router = express.Router();
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const expected = token();
    if (!expected || expected.length < 32) return res.status(503).json({ error: 'Integração empresarial não configurada.' });
    const provided = req.get('authorization') || '';
    const digest = value => createHash('sha256').update(value).digest();
    if (!timingSafeEqual(digest(provided), digest(`Bearer ${expected}`))) return res.status(401).json({ error: 'Acesso empresarial não autorizado.' });
    next();
  });
  router.get('/overview', async (req, res) => {
    try { res.json(await overview(req.query.month)); }
    catch (error) { res.status(error.httpStatus || 503).json({ error: error.httpStatus === 400 ? 'Mês inválido.' : 'Não foi possível consultar a gestão do sistema.' }); }
  });
  return router;
}
export default createCompanyRouter();
