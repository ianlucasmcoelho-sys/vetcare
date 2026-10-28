import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';

// Keep the historical records and implementation, but expose no fiscal operation
// until the issuer's registration, provider and fiscal configuration are ready.
export function createFiscalRouter(authenticate = authMiddleware) {
  const router = express.Router();
  router.use(authenticate);
  router.use((_req,res)=>res.status(503).json({
    code:'FISCAL_MODULE_COMING_SOON',
    error:'Notas fiscais em breve',
    message:'O módulo de notas fiscais está temporariamente indisponível enquanto concluímos a regularização e a configuração fiscal.'
  }));
  return router;
}
export default createFiscalRouter();
