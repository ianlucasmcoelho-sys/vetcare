// backend/src/routes/relatorioRoutes.js
import express from 'express';
import {
  relatorioFinanceiro,
  relatorioVacinas,
  relatorioRetornos,
  relatorioProducao,
  dashboardStats
} from '../controllers/relatorioController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requirePremiumFeature } from '../middlewares/subscriptionMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/dashboard', dashboardStats);

// Relatórios Avançados Exclusivos Vet Complete
router.get('/financeiro', requirePremiumFeature, relatorioFinanceiro);
router.get('/vacinas', requirePremiumFeature, relatorioVacinas);
router.get('/retornos', requirePremiumFeature, relatorioRetornos);
router.get('/producao', requirePremiumFeature, relatorioProducao);

export default router;