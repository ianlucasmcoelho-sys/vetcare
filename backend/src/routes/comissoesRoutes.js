import express from 'express';
import {
  getRegras,
  upsertRegra,
  getComissoes,
  pagarComissoes
} from '../controllers/comissoesController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requirePremiumFeature } from '../middlewares/subscriptionMiddleware.js';

const router = express.Router();

router.use(authMiddleware);
router.use(requirePremiumFeature);

router.get('/regras', getRegras);
router.post('/regras', upsertRegra);
router.get('/', getComissoes);
router.post('/pagar', pagarComissoes);

export default router;
