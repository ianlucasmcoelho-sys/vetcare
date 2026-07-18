// backend/src/routes/orcamentoRoutes.js
import express from 'express';
import {
  getAllOrcamentos,
  getOrcamentoById,
  createOrcamento,
  updateOrcamento,
  deleteOrcamento
} from '../controllers/orcamentoController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

// Rotas de orçamentos
router.get('/', getAllOrcamentos);
router.get('/:id', getOrcamentoById);
router.post('/', createOrcamento);
router.put('/:id', updateOrcamento);
router.delete('/:id', deleteOrcamento);

export default router;
