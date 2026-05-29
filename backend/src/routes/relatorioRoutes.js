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

const router = express.Router();

router.use(authMiddleware);

router.get('/financeiro', relatorioFinanceiro);
router.get('/vacinas', relatorioVacinas);
router.get('/retornos', relatorioRetornos);
router.get('/producao', relatorioProducao);
router.get('/dashboard', dashboardStats);

export default router;