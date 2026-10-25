// backend/src/routes/servicoRoutes.js
import express from 'express';
import {
  getAllServicos,
  getServicoById,
  getServicosByCategoria,
  getServicosBaixoEstoque,
  getServicosExpirados,
  getServicosStats,
  createServico,
  updateServico,
  deleteServico
} from '../controllers/servicoController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requirePremiumFeature } from '../middlewares/subscriptionMiddleware.js';

const router = express.Router();

router.use(authMiddleware, requirePremiumFeature);

// Rotas de serviços/estoque
router.get('/', getAllServicos);
router.get('/stats', getServicosStats);
router.get('/baixo-estoque', getServicosBaixoEstoque);
router.get('/expirados', getServicosExpirados);
router.get('/categoria/:categoria', getServicosByCategoria);
router.get('/:id', getServicoById);
router.post('/', createServico);
router.put('/:id', updateServico);
router.delete('/:id', deleteServico);

export default router;
