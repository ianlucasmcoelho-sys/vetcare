// backend/src/routes/notaFiscalRoutes.js
import express from 'express';
import {
  listarNotas,
  obterStats,
  obterNotaPorId,
  emitirNota,
  cancelarNota,
  obterConfiguracoesFiscais,
  atualizarConfiguracoesFiscais
} from '../controllers/notaFiscalController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requirePremiumFeature } from '../middlewares/subscriptionMiddleware.js';

const router = express.Router();

router.use(authMiddleware, requirePremiumFeature);

// Métricas e Parâmetros Fiscais
router.get('/stats', obterStats);
router.get('/configuracoes', obterConfiguracoesFiscais);
router.put('/configuracoes', atualizarConfiguracoesFiscais);

// Listagem e Emissão
router.get('/', listarNotas);
router.post('/', emitirNota);
router.get('/:id', obterNotaPorId);
router.post('/:id/cancelar', cancelarNota);

export default router;
