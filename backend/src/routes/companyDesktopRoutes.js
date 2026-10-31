import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { openDb } from '../db.js';
import { createCompanyAuth } from '../services/companyAuth.js';
import { createCompanyOverview } from '../services/companyOverview.js';
import { createAsaasGateway } from '../services/asaas.js';

export function createCompanyDesktopRouter({ auth = createCompanyAuth({ openDb }), overview = createCompanyOverview({ openDb, gateway: createAsaasGateway(process.env, { timeout: 10000 }) }), logger = console } = {}) {
  const router = express.Router();
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    // O aplicativo faz HTTPS no processo principal, sem cookies ou Origin de site.
    if (req.get('origin')) return res.status(403).json({ error: 'Use o aplicativo VetCare Gestão para este acesso.' });
    next();
  });
  const handle = fn => async (req, res) => {
    try { res.json(await fn(req)); }
    catch (error) {
      if (!error.httpStatus) reportFailure(error, req.route?.path || 'request');
      res.status(error.httpStatus || 503).json({ error: error.httpStatus ? error.message : 'Não foi possível concluir o acesso empresarial. Tente novamente ou contate o suporte.' });
    }
  };
  function reportFailure(error, operation) {
    const code = String(error.code || error.name || 'INTERNAL');
    logger.error('VetCare desktop: falha interna', { operation, code: /^[A-Za-z0-9_]{1,40}$/.test(code) ? code : 'INTERNAL' });
  }
  router.get('/health', (req, res) => res.json({ application: 'vetcare-company-desktop', version: 1, authVersion: 2 }));
  router.post('/login', rateLimit({ windowMs: 15 * 60000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Muitas tentativas. Aguarde 15 minutos.' } }), handle(req => auth.login(req.body?.email, req.body?.password)));
  router.use(async (req, res, next) => {
    try {
      req.companyToken = (req.get('authorization') || '').replace(/^Bearer /, '');
      req.companyOwner = await auth.authenticate(req.companyToken); next();
    } catch (error) {
      if (!error.httpStatus) reportFailure(error, 'session');
      res.status(error.httpStatus || 503).json({ error: error.httpStatus ? error.message : 'Acesso empresarial indisponível.' });
    }
  });
  router.get('/me', (req, res) => res.json(req.companyOwner));
  router.get('/overview', handle(req => overview(req.query.month)));
  router.post('/logout', handle(async req => { await auth.logout(req.companyToken); return { ok: true }; }));
  router.post('/password', rateLimit({ windowMs: 15 * 60000, limit: 10, standardHeaders: true, legacyHeaders: false }), handle(async req => {
    await auth.password(req.companyOwner.id, req.body?.current, req.body?.password); return { ok: true };
  }));
  return router;
}
export default createCompanyDesktopRouter();
